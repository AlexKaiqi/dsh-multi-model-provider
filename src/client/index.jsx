import { useEffect, useMemo, useState } from 'react'
import { DICTIONARIES, installTranslator, NS, t } from './i18n.js'
import { snapshotPortraitTargets } from './portrait-targets.js'

const MULTI_NS = 'multi-model-provider'
const MODEL_CATALOG_PATH = '/dsh-multi-model-provider/catalog'

const CSS = `
.mmp-page{display:flex;max-width:720px;flex-direction:column;gap:16px;padding-bottom:32px;color:var(--dsw-alias-label-primary)}
.mmp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;gap:14px;padding:14px 16px}
.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}.mmp-button:disabled{opacity:.45;cursor:default}
.mmp-title{font-size:16px;font-weight:600}.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-input{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-status{font-size:12px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-module-platform)}.mmp-status[data-state=valid]{color:var(--dsw-alias-state-success-primary,#16803c)}.mmp-status[data-state=invalid]{color:var(--dsw-alias-state-error-primary,#c33)}.mmp-status[data-state=partial]{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}
.mmp-list{display:flex;max-height:360px;flex-direction:column;gap:2px;overflow:auto}.mmp-row{display:flex;gap:10px;align-items:flex-start;padding:9px 2px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mmp-row-main{flex:1;min-width:0}.mmp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mmp-tag{font-size:11px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-module-platform)}
.mmp-portrait-page{max-width:720px}.mmp-portrait-panel{display:flex;min-width:0;flex-direction:column;gap:16px}.mmp-portrait-tabs{display:flex;gap:20px;border-bottom:1px solid var(--dsw-alias-border-l2)}.mmp-portrait-tab{border:0;border-bottom:2px solid transparent;padding:9px 2px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}.mmp-portrait-tab[data-active=true]{border-bottom-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary);font-weight:600}.mmp-model-picker{font-size:14px;padding:11px 12px}
.mmp-portrait-view{display:flex;flex-direction:column;gap:14px}.mmp-checks{display:flex;flex-direction:column;gap:5px}.mmp-check{font-size:12px}.mmp-check[data-status=warn]{color:var(--dsw-alias-state-warning-primary,#9a6700)}.mmp-check[data-status=fail]{color:var(--dsw-alias-state-error-primary,#c33)}
.mmp-markdown{max-height:360px;overflow:auto;margin:0;border-radius:9px;padding:12px;background:var(--dsw-alias-bg-module-platform);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.mmp-rate{display:grid;grid-template-columns:minmax(90px,1.2fr) minmax(90px,1fr) auto auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px}.mmp-rate:last-child{border-bottom:0}
.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mmp-job{display:flex;flex-direction:column;gap:6px;border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform)}
@media(max-width:760px){.mmp-grid,.mmp-grid3{grid-template-columns:1fr}.mmp-rate{grid-template-columns:1fr 1fr}}
`

function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function responseValue(response) {
  if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? t('requestFailed'))
  return response.result.value
}

function useConfig(api, includeModelCatalog = false) {
  const [state, setState] = useState({ status: 'loading', multi: undefined, modelCatalog: { languageModels: [], taskModels: [], languageFailures: [] }, writable: false })
  const load = async () => {
    setState(current => ({ ...current, status: 'loading', error: undefined }))
    try {
      const [settings, modelCatalog] = await Promise.all([
        api.settings.describe({}).then(responseValue),
        includeModelCatalog
          ? fetch(MODEL_CATALOG_PATH, { credentials: 'same-origin', cache: 'no-store' }).then(async response => {
              if (!response.ok) throw new Error(`model catalog HTTP ${response.status}`)
              return response.json()
            })
          : Promise.resolve({ languageModels: [], taskModels: [], languageFailures: [] }),
      ])
      const byNs = new Map(settings.namespaces.map(item => [item.ns, item]))
      setState({
        status: 'ready',
        multi: byNs.get(MULTI_NS),
        modelCatalog,
        writable: settings.writable,
      })
    } catch (error) {
      setState(current => ({ ...current, status: 'error', error: error instanceof Error ? error.message : String(error) }))
    }
  }
  useEffect(() => { void load() }, [api, includeModelCatalog])
  return [state, load]
}

function descriptionOf(portrait) {
  if (typeof portrait.description === 'string' && portrait.description.trim()) return portrait.description
  if (typeof portrait.summary === 'string' && portrait.summary.trim()) return portrait.summary
  return ''
}

function stateOf(portrait) {
  return object(portrait.validation).state ?? (Object.keys(portrait).length ? 'unvalidated' : 'missing')
}

/** Localized user-facing Provider name; route ids remain stable technical identifiers only. */
function providerNameOf(target) {
  if (target.provider === 'volcengine') return t('providerVolcengine')
  if (target.provider === 'doubao-speech') return t('providerDoubaoSpeech')
  return target.providerName || target.provider || t('unknown')
}

function MetricSummary({ portrait }) {
  const lastProbe = object(object(portrait.performance).lastProbe)
  return <>
    <div className="mmp-grid3">
      <div><div className="mmp-muted">{t('availability')}</div><div>{lastProbe.observedAt ? (lastProbe.reachable ? t('reachable') : t('unreachable')) : t('notProbed')}</div></div>
      <div><div className="mmp-muted">{t('timeToFirstToken')}</div><div>{Number.isFinite(lastProbe.timeToFirstTokenMs) ? `${lastProbe.timeToFirstTokenMs} ms` : '—'}</div></div>
      <div><div className="mmp-muted">{t('totalLatency')}</div><div>{Number.isFinite(lastProbe.latencyMs) ? `${lastProbe.latencyMs} ms` : '—'}</div></div>
    </div>
    {lastProbe.observedAt && <div className="mmp-muted">{t('probeObservedAt', { time: new Date(lastProbe.observedAt).toLocaleString() })}</div>}
  </>
}

function PriceSummary({ portrait }) {
  const pricing = object(portrait.pricing)
  const rates = Array.isArray(pricing.rates) ? pricing.rates : []
  return <div>
    <div className="mmp-subtitle">{t('pricing')}</div>
    {rates.length ? rates.map((rate, index) => <div className="mmp-rate" key={`${rate.operation ?? ''}:${rate.unit ?? ''}:${index}`}>
      <span>{rate.operation ?? '—'}</span><span>{rate.unit ?? '—'}</span><span>{rate.amount ?? '—'} {rate.currency ?? ''}</span><span>{rate.effectiveFrom ?? ''}</span>
    </div>) : <div className="mmp-muted">{t('pricingUnknown')}</div>}
    {pricing.notes && <div className="mmp-muted">{pricing.notes}</div>}
  </div>
}

function EvidenceAndValidation({ portrait }) {
  const evidence = Array.isArray(portrait.evidence) ? portrait.evidence : []
  const checks = Array.isArray(object(portrait.validation).checks) ? portrait.validation.checks : []
  return <div className="mmp-grid">
    <div><div className="mmp-subtitle">{t('evidence')}</div>{evidence.length ? <div className="mmp-list">{evidence.map(item => <div className="mmp-row" key={item.id}><div className="mmp-row-main">
      {/^https?:\/\//.test(item.source ?? '') ? <a href={item.source} target="_blank" rel="noreferrer">{item.source}</a> : <div>{item.source}</div>}
      <div className="mmp-tags"><span className="mmp-tag">{item.kind}</span>{item.observedAt && <span className="mmp-tag">{item.observedAt}</span>}</div>
    </div></div>)}</div> : <div className="mmp-muted">{t('noEvidence')}</div>}</div>
    <div><div className="mmp-subtitle">{t('validation')}</div><div className="mmp-checks">{checks.map(check => <div className="mmp-check" data-status={check.status} key={check.id}>{check.status === 'pass' ? '✓' : check.status === 'fail' ? '✕' : '△'} {check.message}</div>)}{checks.length === 0 && <div className="mmp-muted">{t('notValidated')}</div>}</div></div>
  </div>
}

/** Two flat tasks: collect a portrait or view the latest result. */
function PortraitViewer({ config, reload, sessions, close }) {
  const targets = useMemo(
    () => snapshotPortraitTargets(config.modelCatalog),
    [config.modelCatalog],
  )
  const catalogFailures = Array.isArray(config.modelCatalog?.languageFailures) ? config.modelCatalog.languageFailures : []
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '')
  const [portraitTab, setPortraitTab] = useState('collect')
  const [launching, setLaunching] = useState(false)
  const [launchError, setLaunchError] = useState(undefined)

  const target = targets.find(item => item.id === targetId) ?? targets[0]

  useEffect(() => {
    if (targets.length && !targets.some(item => item.id === targetId)) setTargetId(targets[0].id)
  }, [targets, targetId])

  if (!targets.length) return <section className="mmp-card"><div className="mmp-muted">{t('portraitsEmpty')}</div></section>

  const portrait = object(target?.portrait)
  const state = stateOf(portrait)
  const description = descriptionOf(portrait)
  const startCollection = async () => {
    if (!target || launching) return
    setLaunching(true)
    setLaunchError(undefined)
    try {
      const sessionId = sessions.list.getSnapshot().current
      if (!sessionId) throw new Error(t('portraitNeedsSession'))
      const binding = sessions.binding(sessionId)
      if (!binding) throw new Error(t('portraitNeedsSession'))
      const response = await binding.session.prompt([{
        type: 'text',
        text: `/collect-model-portraits ${target.id}`,
      }], 'queue')
      if (!response.ok) throw new Error(response.error.message)
      close()
      sessions.open(sessionId)
    } catch (cause) {
      setLaunchError(cause instanceof Error ? cause.message : String(cause))
    } finally {
      setLaunching(false)
    }
  }

  return <section className="mmp-portrait-panel">
    <div className="mmp-portrait-tabs" role="tablist">
      <button type="button" className="mmp-portrait-tab" role="tab" aria-selected={portraitTab === 'collect'} data-active={portraitTab === 'collect'} onClick={() => setPortraitTab('collect')}>{t('portraitTabCollect')}</button>
      <button type="button" className="mmp-portrait-tab" role="tab" aria-selected={portraitTab === 'view'} data-active={portraitTab === 'view'} onClick={() => setPortraitTab('view')}>{t('portraitTabView')}</button>
    </div>
    <div className="mmp-actions"><button type="button" className="mmp-button" onClick={() => void reload()}>{t('refreshModelRegistry')}</button><span className="mmp-muted">{t('registeredModelCount', { count: targets.length })}</span></div>
    {catalogFailures.map(failure => <div className="mmp-error" key={failure.id}>{t('modelRegistryFailure', { provider: failure.name || failure.id, message: failure.message })}</div>)}
    <select aria-label={t('portraitSelectTitle')} className="mmp-input mmp-model-picker" value={target?.id ?? ''} onChange={event => setTargetId(event.target.value)}>{targets.map(item => <option value={item.id} key={item.id}>{item.name} · {providerNameOf(item)} · {t(`portraitState.${stateOf(object(item.portrait))}`)}</option>)}</select>
    {portraitTab === 'collect' && <>
      <div className="mmp-muted">{t('portraitSkillHint')}</div>
      <div><button type="button" className="mmp-button" disabled={launching || !target} onClick={() => void startCollection()}>{launching ? t('portraitStartingCollection') : t('portraitStartCollection')}</button></div>
      {launchError && <div className="mmp-error">{launchError}</div>}
    </>}
    {portraitTab === 'view' && target && <div className="mmp-portrait-view">
        <div><span className="mmp-status" data-state={state}>{t(`portraitState.${state}`)}</span><div className="mmp-tags"><span className="mmp-tag">{t('inputLabel', { value: target.input.join(' + ') || t('unknown') })}</span><span className="mmp-tag">{t('outputLabel', { value: target.output.join(' + ') || t('unknown') })}</span></div></div>
        {description ? <pre className="mmp-markdown">{description}</pre> : <div className="mmp-muted">{t('portraitDescriptionMissing')}</div>}
        <MetricSummary portrait={portrait} />
        <PriceSummary portrait={portrait} />
        <EvidenceAndValidation portrait={portrait} />
      </div>}
  </section>
}

function PortraitSettings({ api, sessions, close }) {
  const [config, reload] = useConfig(api, true)
  if (config.status === 'loading' && !config.multi) return <div className="mmp-page mmp-portrait-page"><div className="mmp-muted">{t('loadingPortraits')}</div></div>
  if (config.status === 'error') return <div className="mmp-page mmp-portrait-page"><div className="mmp-error">{config.error}</div><button className="mmp-button" onClick={() => void reload()}>{t('retry')}</button></div>
  return <div className="mmp-page mmp-portrait-page"><PortraitViewer config={config} reload={reload} sessions={sessions} close={close} /></div>
}

export const inject = ['slots', 'connection', 'locale', 'sessions']

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'multi-model-provider: locale dictionaries')
  ctx.effect(() => installTranslator(ctx.locale.bind(NS)), 'multi-model-provider: locale binding')
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-multi-model-provider'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'multi-model-provider: settings styles')
  const connection = ctx.get('connection')
  const sessions = ctx.get('sessions')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'model-portraits', order: 11,
    label: () => t('tabPortraits'),
    locale: NS,
    inject: () => ({ api: connection.api, sessions }),
  }, PortraitSettings))
}
