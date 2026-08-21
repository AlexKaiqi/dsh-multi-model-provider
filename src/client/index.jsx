import { useEffect, useState } from 'react'
import { t } from './i18n.js'

const MULTI_NS = 'multi-model-provider'

const CSS = `
.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}
.mmp-button[data-primary=true]{background:var(--dsw-alias-interactive-bg-active,#e9e9e9);font-weight:600}
.mmp-button:disabled{opacity:.45;cursor:default}.mmp-button[data-danger=true]{color:var(--dsw-alias-label-error,#c33)}
.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.mmp-field>label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.mmp-input,.mmp-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-textarea{min-height:82px;resize:vertical}.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}.mmp-success{font-size:12px;color:var(--dsw-alias-label-success,#16803c)}
.mmp-price{display:grid;grid-template-columns:1.2fr 1fr .7fr .7fr auto;gap:7px;align-items:end}
.mmp-provider-extension{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
@media(max-width:760px){.mmp-grid3{grid-template-columns:1fr}.mmp-price{grid-template-columns:1fr 1fr}.mmp-price .mmp-button{grid-column:span 2}}
`

function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function responseValue(response) {
  if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? t('requestFailed'))
  return response.result.value
}

function initialPortrait(summary = '') {
  return {
    schemaVersion: 1,
    ...(summary.trim() ? { description: `# ${summary.trim()}\n` } : {}),
    specialties: [], limitations: [], bestFor: [], avoidFor: [],
    pricing: { rates: [] }, performance: {}, qualityScores: {}, evidence: [],
    validation: { state: 'unvalidated', checks: [] },
  }
}

function validatePortrait(portrait) {
  const checks = []
  const evidenceIds = new Set((portrait.evidence ?? []).map(item => item.id))
  const hasDescription = Boolean(portrait.description || portrait.summary)
  checks.push({ id: 'portrait.description', status: hasDescription ? 'pass' : 'warn', message: hasDescription ? '已有 Markdown 说明' : '缺少 Markdown 说明' })
  checks.push({ id: 'portrait.pricing', status: portrait.pricing.rates.length ? 'pass' : 'warn', message: portrait.pricing.rates.length ? '已有价格' : '价格未知' })
  checks.push({ id: 'portrait.performance.speed', status: portrait.performance.speedClass ? 'pass' : 'warn', message: portrait.performance.speedClass ? '已有速度分级' : '速度未知' })
  portrait.pricing.rates.forEach((rate, index) => checks.push({
    id: `portrait.pricing.${index}`,
    status: rate.evidenceId && evidenceIds.has(rate.evidenceId) ? 'pass' : 'warn',
    message: rate.evidenceId && evidenceIds.has(rate.evidenceId) ? `${rate.operation} 价格有证据` : `${rate.operation} 价格缺少证据`,
  }))
  if (portrait.performance.typicalLatencyMs) {
    const measured = (portrait.evidence ?? []).some(item => ['benchmark', 'runtime-probe', 'usage'].includes(item.kind))
    checks.push({ id: 'portrait.performance.latency-evidence', status: measured ? 'pass' : 'warn', message: measured ? '延迟有测量证据' : '延迟缺少测量证据' })
  }
  return { state: checks.some(check => check.status === 'warn') ? 'partial' : 'valid', checkedAt: new Date().toISOString(), checks }
}

function useConfig(api) {
  const [state, setState] = useState({ status: 'loading', settingsWritable: false, multi: undefined })
  const load = async () => {
    setState(current => ({ ...current, status: 'loading', error: undefined }))
    try {
      const settings = responseValue(await api.settings.describe({}))
      const multi = settings.namespaces.find(item => item.ns === MULTI_NS)
      setState({ status: 'ready', settingsWritable: settings.writable, multi })
    } catch (error) {
      setState(current => ({ ...current, status: 'error', error: error instanceof Error ? error.message : String(error) }))
    }
  }
  useEffect(() => { void load() }, [api])
  return [state, load]
}

function descriptionOf(portrait, fallbackName) {
  if (typeof portrait.description === 'string' && portrait.description.trim()) return portrait.description
  const sections = []
  if (portrait.summary) sections.push(`# ${portrait.summary}`)
  const add = (title, values) => {
    if (Array.isArray(values) && values.length) sections.push(`## ${title}\n${values.map(value => `- ${value}`).join('\n')}`)
  }
  add('擅长', portrait.specialties)
  add('局限', portrait.limitations)
  add('适合', portrait.bestFor)
  add('避免用于', portrait.avoidFor)
  return sections.join('\n\n') || `# ${fallbackName}\n\n## 定位\n\n## 擅长\n\n## 局限\n\n## 适用场景\n`
}

function speedClassOf(probe) {
  const value = Number(probe.timeToFirstTokenMs ?? probe.latencyMs)
  if (value <= 1_000) return 'instant'
  if (value <= 2_500) return 'fast'
  if (value <= 6_000) return 'balanced'
  return 'slow'
}

/** Qualitative Markdown plus structured, measured metrics for one model row. */
function ModelPortraitDetails({ api, provider, model, displayName, disabled }) {
  const [config, reload] = useConfig(api)
  const [draft, setDraft] = useState(() => initialPortrait())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(undefined)
  const [error, setError] = useState(undefined)
  const targetId = `llm:${provider}/${model}`
  const binding = object(object(object(config.multi?.value).portraits)[targetId])
  const saved = object(binding.portrait)

  useEffect(() => {
    const portrait = { ...initialPortrait(), ...saved, pricing: { rates: [], ...object(saved.pricing) }, performance: object(saved.performance), validation: object(saved.validation) }
    setDraft({ ...portrait, description: descriptionOf(portrait, displayName || model) })
  }, [config.multi?.revision, targetId, displayName])

  if (!model) return null
  if (config.status === 'loading' && !config.multi) return <div className="mmp-muted">{t('loadingPortraits')}</div>
  if (config.status === 'error') return <div className="mmp-error">{config.error}</div>

  const rates = Array.isArray(draft.pricing?.rates) ? draft.pricing.rates : []
  const setRate = (index, key, value) => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: rates.map((rate, at) => at === index ? { ...rate, [key]: value } : rate) } }))
  const normalizedPortrait = (source) => {
    const description = String(source.description ?? '').trim()
    const portrait = {
      ...initialPortrait(), ...source,
      ...(description ? { description } : {}),
      specialties: [], limitations: [], bestFor: [], avoidFor: [],
      pricing: { ...object(source.pricing), rates: (source.pricing?.rates ?? []).map(rate => ({ ...rate, amount: Number(rate.amount) })).filter(rate => rate.operation && rate.unit && Number.isFinite(rate.amount) && rate.amount >= 0 && rate.currency) },
      performance: object(source.performance), evidence: Array.isArray(source.evidence) ? source.evidence : [], qualityScores: object(source.qualityScores),
    }
    delete portrait.summary
    if (!description) delete portrait.description
    portrait.validation = validatePortrait(portrait)
    return portrait
  }
  const persist = async (source, successMessage) => {
    if (!config.multi) throw new Error(t('settingsMissing'))
    const portrait = normalizedPortrait(source)
    const value = { kind: 'llm', provider, model, portrait }
    responseValue(await api.settings.mutate({ ns: MULTI_NS, ops: [{ op: 'set', path: ['portraits', targetId], value }], expectedRevision: config.multi.revision }))
    setDraft(portrait)
    setMessage(successMessage)
    await reload()
  }
  const run = async (action) => {
    setBusy(true); setError(undefined); setMessage(undefined)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) }
  }
  const save = () => run(() => persist(draft, t('notesSaved')))
  const probe = () => run(async () => {
    const started = Date.now()
    const response = provider === 'doubao-speech'
      ? await fetch('/dsh-realtime-voice/doubao/probe', {
        method: 'POST', headers: { 'x-dsh-model-probe': '1' }, credentials: 'same-origin',
      })
      : await fetch('/dsh-multi-model-provider/probe', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-model-probe': '1' }, credentials: 'same-origin',
        body: JSON.stringify({ provider, model }),
      })
    const result = await response.json().catch(() => ({}))
    const observedAt = typeof result.observedAt === 'string' ? result.observedAt : new Date().toISOString()
    const reachable = response.ok && result.ok === true
    const lastProbe = {
      observedAt, reachable,
      latencyMs: Number.isFinite(result.latencyMs) ? result.latencyMs : Date.now() - started,
      ...(Number.isFinite(result.timeToFirstTokenMs) ? { timeToFirstTokenMs: result.timeToFirstTokenMs } : {}),
    }
    const evidence = [...(Array.isArray(draft.evidence) ? draft.evidence : []).filter(item => item.id !== 'runtime-probe:latest'), {
      id: 'runtime-probe:latest', kind: 'runtime-probe', source: 'DSH minimal live probe', observedAt,
      claims: reachable
        ? ['reachable=true', `latencyMs=${lastProbe.latencyMs}`, ...(lastProbe.timeToFirstTokenMs === undefined ? [] : [`timeToFirstTokenMs=${lastProbe.timeToFirstTokenMs}`])]
        : ['reachable=false'],
      ...(reachable ? {} : { notes: String(result.error ?? `HTTP ${response.status}`) }),
    }]
    const next = { ...draft, performance: {
      ...object(draft.performance), lastProbe,
      ...(reachable ? { speedClass: speedClassOf(lastProbe), typicalLatencyMs: { min: lastProbe.latencyMs, max: lastProbe.latencyMs } } : {}),
    }, evidence }
    await persist(next, reachable ? t('probeSaved') : t('probeFailedSaved'))
    if (!reachable) throw new Error(String(result.error ?? t('modelUnreachable', { status: response.status })))
  })
  const lastProbe = object(draft.performance?.lastProbe)

  return <section className="mmp-provider-extension">
    <div><div className="mmp-subtitle">{t('notesTitle')}</div><div className="mmp-muted">{t('notesHint')}</div></div>
    <div className="mmp-field"><label>{t('notesMarkdown')}</label><textarea className="mmp-textarea" style={{ minHeight: 180 }} value={draft.description ?? ''} disabled={disabled || busy} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></div>
    <div className="mmp-grid3">
      <div><div className="mmp-muted">{t('availability')}</div><div>{lastProbe.observedAt ? (lastProbe.reachable ? t('reachable') : t('unreachable')) : t('notProbed')}</div></div>
      <div><div className="mmp-muted">{t('timeToFirstToken')}</div><div>{Number.isFinite(lastProbe.timeToFirstTokenMs) ? `${lastProbe.timeToFirstTokenMs} ms` : '—'}</div></div>
      <div><div className="mmp-muted">{t('totalLatency')}</div><div>{Number.isFinite(lastProbe.latencyMs) ? `${lastProbe.latencyMs} ms` : '—'}</div></div>
    </div>
    {lastProbe.observedAt && <div className="mmp-muted">{t('probeObservedAt', { time: new Date(lastProbe.observedAt).toLocaleString() })}</div>}
    <div className="mmp-subtitle">{t('pricing')}</div>
    {rates.map((rate, index) => <div className="mmp-price" key={index}><div className="mmp-field"><label>{t('operation')}</label><input className="mmp-input" value={rate.operation ?? ''} disabled={disabled || busy} onChange={event => setRate(index, 'operation', event.target.value)} placeholder="input / output" /></div><div className="mmp-field"><label>{t('unit')}</label><input className="mmp-input" value={rate.unit ?? ''} disabled={disabled || busy} onChange={event => setRate(index, 'unit', event.target.value)} placeholder="1M tokens" /></div><div className="mmp-field"><label>{t('amount')}</label><input className="mmp-input" type="number" min="0" step="any" value={rate.amount ?? ''} disabled={disabled || busy} onChange={event => setRate(index, 'amount', event.target.value)} /></div><div className="mmp-field"><label>{t('currency')}</label><input className="mmp-input" value={rate.currency ?? 'CNY'} disabled={disabled || busy} onChange={event => setRate(index, 'currency', event.target.value.toUpperCase())} /></div><button className="mmp-button" data-danger="true" disabled={disabled || busy} onClick={() => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: rates.filter((_, at) => at !== index) } }))}>{t('remove')}</button></div>)}
    <div className="mmp-actions"><button className="mmp-button" disabled={disabled || busy} onClick={() => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: [...rates, { operation: '', unit: '', amount: '', currency: 'CNY' }] } }))}>{t('addPrice')}</button><button className="mmp-button" data-primary="true" disabled={disabled || busy || !config.settingsWritable} onClick={save}>{t('saveNotes')}</button><button className="mmp-button" disabled={disabled || busy || !config.settingsWritable} onClick={probe}>{t('testSpeed')}</button></div>
    <div className="mmp-muted">{t('probeCostHint')}</div>
    {message && <div className="mmp-success" role="status">{message}</div>}{error && <div className="mmp-error" role="alert">{error}</div>}
  </section>
}

export const inject = ['slots', 'connection']

export function apply(ctx) {
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-multi-model-provider'
    tag.textContent = CSS
    document.head.appendChild(tag)
    return () => tag.remove()
  }, 'multi-model-provider: settings styles')
  const connection = ctx.get('connection')
  ctx.slots.inject('settings.models.model.details', () => ctx.slots.register({
    name: 'settings.models.model.details', id: 'model-portrait', order: 10,
    inject: () => ({ api: connection.api }),
  }, ModelPortraitDetails))
}
