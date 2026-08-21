import { useEffect, useMemo, useRef, useState } from 'react'
import { DICTIONARIES, installTranslator, NS, t } from './i18n.js'
import { filterPortraitTargets, snapshotPortraitTargets } from './portrait-targets.js'

const MULTI_NS = 'multi-model-provider'
const LLM_NS = 'llm-pi-ai'

const CSS = `
.mmp-page{display:flex;max-width:720px;flex-direction:column;gap:16px;padding-bottom:32px;color:var(--dsw-alias-label-primary)}
.mmp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;gap:14px;padding:14px 16px}
.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}.mmp-button:disabled{opacity:.45;cursor:default}
.mmp-title{font-size:16px;font-weight:600}.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.mmp-field>label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.mmp-input{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-status{font-size:12px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-module-platform)}.mmp-status[data-state=valid]{color:var(--dsw-alias-state-success-primary,#16803c)}.mmp-status[data-state=invalid]{color:var(--dsw-alias-state-error-primary,#c33)}.mmp-status[data-state=partial]{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}
.mmp-list{display:flex;max-height:360px;flex-direction:column;gap:2px;overflow:auto}.mmp-row{display:flex;gap:10px;align-items:flex-start;padding:9px 2px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mmp-row-main{flex:1;min-width:0}.mmp-id{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.mmp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mmp-tag{font-size:11px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-module-platform)}
.mmp-provider-extension{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
.mmp-portrait-page{max-width:1080px}.mmp-portrait-layout{display:flex;flex-direction:column;gap:14px}.mmp-selector{display:flex;min-width:0;flex-direction:column;gap:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px}.mmp-filter-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.mmp-selector-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-height:320px;gap:4px;overflow:auto}.mmp-selector-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.mmp-target{width:100%;border:1px solid transparent;border-radius:9px;padding:10px;text-align:left;background:transparent;color:inherit;font:inherit;cursor:pointer}.mmp-target:hover{background:var(--dsw-alias-bg-module-platform)}.mmp-target[data-active=true]{border-color:var(--dsw-alias-border-l1,var(--dsw-alias-label-secondary));background:var(--dsw-alias-bg-module-platform)}
.mmp-portrait-view{display:flex;flex-direction:column;gap:14px}.mmp-checks{display:flex;flex-direction:column;gap:5px}.mmp-check{font-size:12px}.mmp-check[data-status=warn]{color:var(--dsw-alias-state-warning-primary,#9a6700)}.mmp-check[data-status=fail]{color:var(--dsw-alias-state-error-primary,#c33)}
.mmp-markdown{max-height:360px;overflow:auto;margin:0;border-radius:9px;padding:12px;background:var(--dsw-alias-bg-module-platform);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.mmp-rate{display:grid;grid-template-columns:minmax(90px,1.2fr) minmax(90px,1fr) auto auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px}.mmp-rate:last-child{border-bottom:0}
.mmp-agent-note{border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform);font-size:12px;line-height:18px}
.mmp-action-block{display:flex;flex-direction:column;gap:10px;border-radius:10px;padding:12px;background:var(--dsw-alias-bg-module-platform)}.mmp-selected-model{display:flex;flex-direction:column;gap:3px;min-width:0}.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mmp-job{display:flex;flex-direction:column;gap:6px;border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform)}
@media(max-width:760px){.mmp-grid,.mmp-grid3,.mmp-filter-grid,.mmp-selector-list{grid-template-columns:1fr}.mmp-rate{grid-template-columns:1fr 1fr}}
`

function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function responseValue(response) {
  if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? t('requestFailed'))
  return response.result.value
}

function useConfig(api) {
  const [state, setState] = useState({ status: 'loading', llm: undefined, multi: undefined })
  const load = async () => {
    setState(current => ({ ...current, status: 'loading', error: undefined }))
    try {
      const settings = await api.settings.describe({}).then(responseValue)
      const byNs = new Map(settings.namespaces.map(item => [item.ns, item]))
      setState({ status: 'ready', llm: byNs.get(LLM_NS), multi: byNs.get(MULTI_NS) })
    } catch (error) {
      setState(current => ({ ...current, status: 'error', error: error instanceof Error ? error.message : String(error) }))
    }
  }
  useEffect(() => { void load() }, [api])
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

function usePortraitJob(onCompleted) {
  const [job, setJob] = useState(undefined)
  const [error, setError] = useState(undefined)
  const completed = useRef('')
  const load = async () => {
    const response = await fetch('/dsh-multi-model-provider/portrait-jobs', { credentials: 'same-origin' })
    if (!response.ok) throw new Error(`portrait job status HTTP ${response.status}`)
    const value = await response.json()
    setJob(value.job)
    if (value.job?.finishedAt && value.job.id !== completed.current) {
      completed.current = value.job.id
      onCompleted()
    }
    return value.job
  }
  useEffect(() => { void load().catch(() => undefined) }, [])
  useEffect(() => {
    if (!job || !['queued', 'running'].includes(job.status)) return undefined
    const timer = setInterval(() => { void load().catch(cause => setError(cause instanceof Error ? cause.message : String(cause))) }, 1_500)
    return () => clearInterval(timer)
  }, [job?.id, job?.status])
  const start = async (action, ids) => {
    setError(undefined)
    const response = await fetch('/dsh-multi-model-provider/portrait-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-dsh-portrait-job': '1' },
      credentials: 'same-origin',
      body: JSON.stringify({ action, ...(ids === undefined ? {} : { ids }), ...(action === 'probe' ? { approved: true } : {}) }),
    })
    const value = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(value.error ?? `portrait job HTTP ${response.status}`)
    setJob(value.job)
  }
  return { job, error, start: (action, ids) => start(action, ids).catch(cause => setError(cause instanceof Error ? cause.message : String(cause))) }
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

/** Read-only results for portraits created and maintained by the Agent. */
function PortraitViewer({ config, reload }) {
  const targets = useMemo(
    () => snapshotPortraitTargets(config.multi, config.llm),
    [config.multi?.revision, config.llm?.revision],
  )
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [stateFilter, setStateFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const portraitJob = usePortraitJob(() => { void reload() })

  const providers = useMemo(() => [...new Set(targets.map(item => item.provider).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [targets])
  const filteredTargets = useMemo(() => filterPortraitTargets(targets, {
    query,
    kind: kindFilter,
    provider: providerFilter,
    state: stateFilter,
    availability: availabilityFilter,
  }), [targets, query, kindFilter, providerFilter, stateFilter, availabilityFilter])
  const target = filteredTargets.find(item => item.id === targetId) ?? filteredTargets[0]
  const filtersActive = Boolean(query.trim()) || kindFilter !== 'all' || providerFilter !== 'all' || stateFilter !== 'all' || availabilityFilter !== 'all'

  useEffect(() => {
    if (targets.length && !targets.some(item => item.id === targetId)) setTargetId(targets[0].id)
  }, [targets, targetId])

  useEffect(() => {
    if (filteredTargets.length && !filteredTargets.some(item => item.id === targetId)) setTargetId(filteredTargets[0].id)
  }, [filteredTargets, targetId])

  if (!targets.length) return <section className="mmp-card"><div className="mmp-muted">{t('portraitsEmpty')}</div></section>

  const portrait = object(target?.portrait)
  const state = stateOf(portrait)
  const description = descriptionOf(portrait)
  const jobBusy = ['queued', 'running'].includes(portraitJob.job?.status)
  const runProbe = () => {
    if (!target) return
    if (window.confirm(t('portraitProbeConfirm', { id: target.id }))) void portraitJob.start('probe', [target.id])
  }
  const clearFilters = () => {
    setQuery('')
    setKindFilter('all')
    setProviderFilter('all')
    setStateFilter('all')
    setAvailabilityFilter('all')
  }

  return <section className="mmp-card">
    <div className="mmp-muted">{t('portraitsHint')}</div>
    <div className="mmp-selector">
      <div><div className="mmp-subtitle">{t('portraitSelectTitle')}</div><div className="mmp-muted">{t('portraitSelectHint')}</div></div>
      <div className="mmp-filter-grid">
        <div className="mmp-field"><label htmlFor="mmp-portrait-search">{t('searchModels')}</label><input id="mmp-portrait-search" className="mmp-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('searchModelsPlaceholder')} /></div>
        <div className="mmp-field"><label htmlFor="mmp-portrait-kind">{t('portraitKindFilter')}</label><select id="mmp-portrait-kind" className="mmp-input" value={kindFilter} onChange={event => setKindFilter(event.target.value)}><option value="all">{t('filterAll')}</option><option value="llm">{t('filterLlm')}</option><option value="task">{t('filterTask')}</option></select></div>
        <div className="mmp-field"><label htmlFor="mmp-portrait-provider">{t('portraitProviderFilter')}</label><select id="mmp-portrait-provider" className="mmp-input" value={providerFilter} onChange={event => setProviderFilter(event.target.value)}><option value="all">{t('filterAll')}</option>{providers.map(provider => <option value={provider} key={provider}>{provider}</option>)}</select></div>
        <div className="mmp-field"><label htmlFor="mmp-portrait-state">{t('portraitStateFilter')}</label><select id="mmp-portrait-state" className="mmp-input" value={stateFilter} onChange={event => setStateFilter(event.target.value)}><option value="all">{t('filterAll')}</option>{['valid', 'partial', 'invalid', 'unvalidated', 'missing'].map(value => <option value={value} key={value}>{t(`portraitState.${value}`)}</option>)}</select></div>
        <div className="mmp-field"><label htmlFor="mmp-portrait-availability">{t('portraitAvailabilityFilter')}</label><select id="mmp-portrait-availability" className="mmp-input" value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value)}><option value="all">{t('filterAll')}</option><option value="enabled">{t('filterEnabled')}</option><option value="disabled">{t('filterDisabled')}</option></select></div>
      </div>
      <div className="mmp-selector-meta"><span className="mmp-muted">{t('showingModels', { shown: filteredTargets.length, total: targets.length })}</span>{filtersActive && <button type="button" className="mmp-button" onClick={clearFilters}>{t('clearFilters')}</button>}</div>
      <div className="mmp-selector-list">
        {filteredTargets.map(item => <button type="button" className="mmp-target" aria-pressed={item.id === target?.id} data-active={item.id === target?.id} key={item.id} onClick={() => setTargetId(item.id)}><div>{item.name}</div><div className="mmp-id">{item.id}</div><div className="mmp-tags"><span className="mmp-tag">{item.kind}</span>{item.task && <span className="mmp-tag">{item.task}</span>}<span className="mmp-status" data-state={stateOf(object(item.portrait))}>{t(`portraitState.${stateOf(object(item.portrait))}`)}</span>{item.enabled === false && <span className="mmp-tag">disabled</span>}</div></button>)}
        {filteredTargets.length === 0 && <div className="mmp-muted">{t('noMatchingModels')}</div>}
      </div>
    </div>
    <div className="mmp-action-block">
      <div className="mmp-selected-model"><span className="mmp-muted">{t('portraitSelectedModel')}</span>{target ? <><span className="mmp-subtitle">{target.name}</span><span className="mmp-id">{target.id}</span></> : <span>{t('portraitSelectRequired')}</span>}</div>
      <div className="mmp-actions"><button type="button" className="mmp-button" disabled={jobBusy || !target} onClick={() => target && void portraitJob.start('research', [target.id])}>{t('portraitResearchCurrent')}</button><button type="button" className="mmp-button" disabled={jobBusy || !target} onClick={runProbe}>{t('portraitProbeCurrent')}</button><button type="button" className="mmp-button" disabled={jobBusy} onClick={() => void portraitJob.start('research')}>{t('portraitResearchAll')}</button></div>
    </div>
    {portraitJob.job && <div className="mmp-job"><div>{t(`portraitJob.${portraitJob.job.status}`)} · {portraitJob.job.action === 'probe' ? t('portraitJobProbe') : t('portraitJobResearch')}</div><div className="mmp-muted">{portraitJob.job.summary || portraitJob.job.error || portraitJob.job.phase || portraitJob.job.workspaceLabel}</div></div>}
    {portraitJob.error && <div className="mmp-error">{portraitJob.error}</div>}
    <div className="mmp-agent-note">{t('portraitsAgentOwned')}</div>
    <div className="mmp-portrait-layout">
      {target && <div className="mmp-card mmp-portrait-view">
        <div><div className="mmp-subtitle">{target.name} <span className="mmp-status" data-state={state}>{t(`portraitState.${state}`)}</span></div><div className="mmp-id">{target.id}</div><div className="mmp-tags"><span className="mmp-tag">{t('inputLabel', { value: target.input.join(' + ') || t('unknown') })}</span><span className="mmp-tag">{t('outputLabel', { value: target.output.join(' + ') || t('unknown') })}</span></div></div>
        {description ? <pre className="mmp-markdown">{description}</pre> : <div className="mmp-muted">{t('portraitDescriptionMissing')}</div>}
        <MetricSummary portrait={portrait} />
        <PriceSummary portrait={portrait} />
        <EvidenceAndValidation portrait={portrait} />
      </div>}
    </div>
  </section>
}

function PortraitSettings({ api }) {
  const [config, reload] = useConfig(api)
  if (config.status === 'loading' && !config.multi) return <div className="mmp-page mmp-portrait-page"><div className="mmp-muted">{t('loadingPortraits')}</div></div>
  if (config.status === 'error') return <div className="mmp-page mmp-portrait-page"><div className="mmp-error">{config.error}</div><button className="mmp-button" onClick={() => void reload()}>{t('retry')}</button></div>
  return <div className="mmp-page mmp-portrait-page"><PortraitViewer config={config} reload={reload} /></div>
}

/** Compact read-only portrait summary below an LLM model row. */
function ModelPortraitDetails({ api, provider, model, displayName }) {
  const [config] = useConfig(api)
  if (!model) return null
  if (config.status === 'loading' && !config.multi) return <div className="mmp-muted">{t('loadingPortraits')}</div>
  if (config.status === 'error') return <div className="mmp-error">{config.error}</div>
  const targetId = `llm:${provider}/${model}`
  const portrait = object(object(object(object(config.multi?.value).portraits)[targetId]).portrait)
  const description = descriptionOf(portrait)
  const state = stateOf(portrait)
  return <section className="mmp-provider-extension">
    <div><div className="mmp-subtitle">{displayName || model} · {t('portraitsTitle')} <span className="mmp-status" data-state={state}>{t(`portraitState.${state}`)}</span></div><div className="mmp-muted">{t('portraitInlineHint')}</div></div>
    {description ? <pre className="mmp-markdown">{description}</pre> : <div className="mmp-muted">{t('portraitDescriptionMissing')}</div>}
    <MetricSummary portrait={portrait} />
  </section>
}

export const inject = ['slots', 'connection', 'locale']

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
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section', id: 'model-portraits', order: 11,
    label: () => t('tabPortraits'),
    locale: NS,
    inject: () => ({ api: connection.api }),
  }, PortraitSettings))
  ctx.slots.inject('settings.models.model.details', () => ctx.slots.register({
    name: 'settings.models.model.details', id: 'model-portrait', order: 10,
    locale: NS,
    inject: () => ({ api: connection.api }),
  }, ModelPortraitDetails))
}
