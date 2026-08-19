import { useEffect, useMemo, useState } from 'react'

const MULTI_NS = 'multi-model-provider'
const LLM_NS = 'llm-pi-ai'
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API = 'openai-responses'
const REFS = ['ARK_API_KEY', 'DOUBAO_APPID', 'DOUBAO_TOKEN', 'DOUBAO_REALTIME_API_KEY']
const SPEEDS = ['', 'instant', 'fast', 'balanced', 'slow', 'async']

const CSS = `
.mmp-page{display:flex;flex-direction:column;gap:20px;padding-bottom:32px;color:var(--dsw-alias-label-primary)}
.mmp-tabs{display:flex;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);padding-bottom:10px}
.mmp-tab,.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}
.mmp-tab[data-active=true],.mmp-button[data-primary=true]{background:var(--dsw-alias-interactive-bg-active,#e9e9e9);font-weight:600}
.mmp-button:disabled{opacity:.45;cursor:default}.mmp-button[data-danger=true]{color:var(--dsw-alias-label-error,#c33)}
.mmp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px;background:var(--dsw-alias-bg-card,transparent)}
.mmp-title{font-size:16px;font-weight:600}.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.mmp-field>label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.mmp-input,.mmp-select,.mmp-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-textarea{min-height:82px;resize:vertical}.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mmp-status{font-size:12px;padding:3px 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform)}
.mmp-status[data-ok=true]{color:var(--dsw-alias-label-success,#16803c)}.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}.mmp-success{font-size:12px;color:var(--dsw-alias-label-success,#16803c)}
.mmp-list{display:flex;flex-direction:column;gap:7px;max-height:320px;overflow:auto}.mmp-row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mmp-row-main{flex:1;min-width:0}.mmp-id{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.mmp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mmp-tag{font-size:11px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-module-platform)}
.mmp-portrait-layout{display:grid;grid-template-columns:minmax(190px,30%) minmax(0,1fr);gap:14px}.mmp-target{width:100%;text-align:left;border:0;border-radius:8px;padding:9px;background:transparent;color:inherit;cursor:pointer}.mmp-target[data-active=true]{background:var(--dsw-alias-bg-module-platform)}
.mmp-price{display:grid;grid-template-columns:1.2fr 1fr .7fr .7fr auto;gap:7px;align-items:end}.mmp-checks{display:flex;flex-direction:column;gap:5px}.mmp-check{font-size:12px}.mmp-check[data-status=warn]{color:var(--dsw-alias-label-warning,#9a6700)}
.mmp-divider{height:1px;background:var(--dsw-alias-border-l2);margin:3px 0}.mmp-capability{display:flex;flex-direction:column;gap:14px}.mmp-provider-extension{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
.mmp-search-summary{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.mmp-provider-row{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:12px}.mmp-provider-head{display:flex;align-items:center;gap:8px}.mmp-provider-name{font-size:14px;line-height:22px;font-weight:500}.mmp-provider-actions{margin-left:auto}.mmp-provider-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-error-primary)}.mmp-provider-dot[data-ready=true]{background:var(--dsw-alias-state-success-primary)}.mmp-provider-editor{border-radius:12px;background:var(--dsw-alias-bg-module-platform);padding:14px 16px}
@media(max-width:760px){.mmp-grid,.mmp-grid3,.mmp-portrait-layout{grid-template-columns:1fr}.mmp-price{grid-template-columns:1fr 1fr}.mmp-price .mmp-button{grid-column:span 2}}
`

function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function responseValue(response) {
  if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? '请求失败')
  return response.result.value
}

function textList(value) {
  return String(value ?? '').split(/[\n,，]+/).map(item => item.trim()).filter(Boolean)
}

function listText(value) {
  if (Array.isArray(value)) return value.join('\n')
  return typeof value === 'string' ? value : ''
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

function snapshotTargets(multi, llm) {
  const root = object(multi?.value)
  const connections = object(root.connections)
  const task = Object.entries(object(root.models)).map(([id, raw]) => {
    const model = object(raw)
    const connection = object(connections[model.connection])
    return {
      id, kind: 'task', provider: connection.provider ?? model.connection ?? '', model: model.model ?? '',
      name: model.displayName ?? model.model ?? id, input: model.input ?? [], output: model.output ?? [],
      task: model.task, enabled: model.enabled !== false, portrait: model.portrait,
      path: ['models', id, 'portrait'],
    }
  })
  const llmRoot = object(llm?.value)
  const profiles = object(llmRoot.providers)
  const bindings = object(root.portraits)
  const language = Object.entries(profiles).flatMap(([provider, raw]) => {
    const profile = object(raw)
    return (Array.isArray(profile.models) ? profile.models : []).map((rawModel) => {
      const model = object(rawModel)
      const id = `llm:${provider}/${model.id}`
      return {
        id, kind: 'llm', provider, model: model.id ?? '', name: model.name ?? model.id ?? id,
        input: Array.isArray(model.input) && model.input.length ? model.input : ['text'], output: ['text'], enabled: true,
        portrait: object(bindings[id]).portrait,
        path: ['portraits', id],
      }
    })
  })
  return [...language, ...task]
}

function useConfig(api) {
  const [state, setState] = useState({ status: 'loading', settingsWritable: false, llm: undefined, multi: undefined, credentials: {} })
  const load = async () => {
    setState(current => ({ ...current, status: 'loading', error: undefined }))
    try {
      const [settings, credentials] = await Promise.all([
        api.settings.describe({}).then(responseValue),
        api.credentials.describe({ refs: REFS }).then(responseValue),
      ])
      const byNs = new Map(settings.namespaces.map(item => [item.ns, item]))
      setState({ status: 'ready', settingsWritable: settings.writable, llm: byNs.get(LLM_NS), multi: byNs.get(MULTI_NS), credentials: credentials.credentials })
    } catch (error) {
      setState(current => ({ ...current, status: 'error', error: error instanceof Error ? error.message : String(error) }))
    }
  }
  useEffect(() => { void load() }, [api])
  return [state, load]
}

function SecretField({ label, name, status, value, onChange }) {
  return <div className="mmp-field">
    <label htmlFor={`mmp-${name}`}>{label} <span className="mmp-status" data-ok={status?.configured === true}>{status?.configured ? `已配置 · ${status.source ?? '安全存储'}` : '未配置'}</span></label>
    <input id={`mmp-${name}`} className="mmp-input" type="password" autoComplete="off" value={value} onChange={event => onChange(event.target.value)} placeholder={status?.configured ? '留空则保持现有值' : '仅写入本机安全凭据存储'} disabled={status?.writable === false} />
  </div>
}

function ArkCapability({ api, config, reload }) {
  const llmValue = object(config.llm?.value)
  const currentProfile = object(object(llmValue.providers).volcengine)
  const currentModels = Array.isArray(currentProfile.models) ? currentProfile.models : []
  const [arkKey, setArkKey] = useState('')
  const [baseURL, setBaseURL] = useState(currentProfile.baseURL ?? ARK_BASE_URL)
  const [models, setModels] = useState(currentModels)
  const [available, setAvailable] = useState([])
  const [manual, setManual] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(undefined)
  const [error, setError] = useState(undefined)

  useEffect(() => {
    setBaseURL(currentProfile.baseURL ?? ARK_BASE_URL)
    setModels(currentModels)
  }, [config.llm?.revision])

  const selected = new Set(models.map(model => model.id))
  const setSelected = (candidate, checked) => {
    setModels(current => checked
      ? current.some(item => item.id === candidate.id) ? current : [...current, candidate]
      : current.filter(item => item.id !== candidate.id))
  }
  const run = async (action) => {
    setBusy(true); setError(undefined); setMessage(undefined)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) }
  }
  const discover = () => run(async () => {
    const key = arkKey.trim()
    if (!key && config.credentials.ARK_API_KEY?.configured !== true) throw new Error('请先输入方舟 API Key；查询只会临时使用它，不会回显。')
    const result = responseValue(await api.llm.discoverModels({ settingsNs: LLM_NS, provider: 'volcengine', baseURL: baseURL.trim(), api: ARK_API, ...(key ? { apiKey: key } : {}) }))
    setAvailable(result.models)
    setQuery('')
    setMessage(`查询到 ${result.models.length} 个模型；请勾选后保存。`)
  })
  const addManual = () => {
    const id = manual.trim()
    if (!id) return
    setSelected({ id }, true); setManual('')
  }
  const saveArk = () => run(async () => {
    if (!config.llm) throw new Error('llm-pi-ai 设置未加载')
    const key = arkKey.trim()
    if (models.length > 0 && !key && config.credentials.ARK_API_KEY?.configured !== true) throw new Error('启用方舟模型前需要配置 API Key')
    const ops = models.length === 0
      ? [{ op: 'unset', path: ['providers', 'volcengine'] }]
      : [{ op: 'set', path: ['providers', 'volcengine'], value: { displayName: '火山方舟', apiKeyEnv: 'ARK_API_KEY', api: ARK_API, baseURL: baseURL.trim(), models } }]
    responseValue(await api.settings.mutate({ ns: LLM_NS, ops, expectedRevision: config.llm.revision }))
    if (key) responseValue(await api.credentials.set({ ref: 'ARK_API_KEY', value: key }))
    setArkKey(''); setMessage(models.length ? `已启用 ${models.length} 个方舟模型。` : '已取消全部方舟语言模型。')
    await reload()
  })

  const candidates = available.length ? available : models
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filtered = candidates.filter(candidate => !normalizedQuery || [candidate.id, candidate.name]
    .filter(value => typeof value === 'string')
    .some(value => value.toLocaleLowerCase().includes(normalizedQuery)))

  return <div className="mmp-capability">
    <div><div className="mmp-subtitle">方舟 · 语言 / 视觉语言模型</div><div className="mmp-muted">标准 Provider ID：volcengine。模型写入 DSH 的 llm-pi-ai 注册表。</div></div>
    <div className="mmp-grid">
      <SecretField label="方舟 API Key" name="ark-key" status={config.credentials.ARK_API_KEY} value={arkKey} onChange={setArkKey} />
      <div className="mmp-field"><label htmlFor="mmp-ark-url">API Base URL</label><input id="mmp-ark-url" className="mmp-input" value={baseURL} onChange={event => setBaseURL(event.target.value)} /></div>
    </div>
    <div className="mmp-actions"><button className="mmp-button" onClick={discover} disabled={busy}>查询可用模型</button><button className="mmp-button" onClick={() => setModels([])} disabled={busy}>全部取消</button><span className="mmp-muted">协议：{ARK_API}</span></div>
    <div className="mmp-actions"><input className="mmp-input" style={{ maxWidth: 360 }} value={manual} onChange={event => setManual(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addManual() }} placeholder="手动添加模型 / ep-* Endpoint ID" /><button className="mmp-button" onClick={addManual}>添加</button></div>
    {candidates.length > 0 && <div className="mmp-field"><label htmlFor="mmp-ark-search">检索模型</label><input id="mmp-ark-search" className="mmp-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="按模型 ID 或显示名称检索" /><span className="mmp-search-summary">显示 {filtered.length} / {candidates.length} 个模型</span></div>}
    <div className="mmp-list">{filtered.map(candidate => <label className="mmp-row" key={candidate.id}><input type="checkbox" checked={selected.has(candidate.id)} onChange={event => setSelected(candidate, event.target.checked)} /><span className="mmp-row-main"><span className="mmp-id">{candidate.id}</span>{candidate.name && <span className="mmp-muted"> · {candidate.name}</span>}<span className="mmp-tags">{candidate.contextWindow && <span className="mmp-tag">上下文 {candidate.contextWindow}</span>}{candidate.maxTokens && <span className="mmp-tag">输出 {candidate.maxTokens}</span>}</span></span></label>)}</div>
    {candidates.length > 0 && filtered.length === 0 && <div className="mmp-muted">没有匹配的模型。</div>}
    {!available.length && !models.length && <div className="mmp-muted">尚未选择模型。可以查询目录、手动填模型 ID，或保持全不选。</div>}
    <div className="mmp-actions"><button className="mmp-button" data-primary="true" onClick={saveArk} disabled={busy || !config.settingsWritable}>{models.length ? `保存方舟配置（${models.length}）` : '保存：全部不选'}</button></div>
    {error && <div className="mmp-error" role="alert">{error}</div>}{message && <div className="mmp-success" role="status">{message}</div>}
  </div>
}

function TaskCapability({ api, config, reload, readOnly = false }) {
  const multiValue = object(config.multi?.value)
  const connections = object(multiValue.connections)
  const taskModels = Object.entries(object(multiValue.models)).filter(([, raw]) => {
    const model = object(raw)
    return model.connection === 'doubao-speech' || object(connections[model.connection]).provider === 'doubao-speech'
  })
  const [appId, setAppId] = useState('')
  const [token, setToken] = useState('')
  const [realtimeKey, setRealtimeKey] = useState('')
  const [query, setQuery] = useState('')
  const [enabledTasks, setEnabledTasks] = useState(() => new Set(taskModels.filter(([, raw]) => object(raw).enabled !== false).map(([id]) => id)))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(undefined)
  const [error, setError] = useState(undefined)

  useEffect(() => {
    setEnabledTasks(new Set(taskModels.filter(([, raw]) => object(raw).enabled !== false).map(([id]) => id)))
  }, [config.multi?.revision])

  const run = async (action) => {
    setBusy(true); setError(undefined); setMessage(undefined)
    try { await action() } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) }
  }
  const hasCredential = (ref, draft) => Boolean(draft.trim() || config.credentials[ref]?.configured === true)
  const realtimeSelected = taskModels.some(([id, raw]) => enabledTasks.has(id) && object(raw).task === 'realtime-speech')
  const classicSpeechSelected = taskModels.some(([id, raw]) => enabledTasks.has(id) && object(raw).task !== 'realtime-speech')
  const testRealtime = async () => {
    const response = await fetch('/dsh-chatvoice/realtime/doubao/probe', {
      method: 'POST', headers: { 'x-dsh-model-probe': '1' },
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok || body.ok !== true) throw new Error(body.error ?? `豆包 Realtime 测试失败（HTTP ${response.status}）`)
    return body
  }
  const saveProvider = () => run(async () => {
    if (!config.multi) throw new Error('multi-model-provider 设置未加载')
    if (enabledTasks.size > 0 && !hasCredential('DOUBAO_APPID', appId)) throw new Error('已选模型需要豆包 App ID')
    if (classicSpeechSelected && !hasCredential('DOUBAO_TOKEN', token)) throw new Error('ASR / TTS 模型需要语音 Access Token')
    if (realtimeSelected && !hasCredential('DOUBAO_REALTIME_API_KEY', realtimeKey)) throw new Error('Realtime Duplex 模型需要 Realtime API Key')
    const writes = [["DOUBAO_APPID", appId], ["DOUBAO_TOKEN", token], ["DOUBAO_REALTIME_API_KEY", realtimeKey]].filter(([, value]) => value.trim())
    for (const [ref, value] of writes) responseValue(await api.credentials.set({ ref, value: value.trim() }))
    const ops = taskModels.map(([id]) => ({ op: 'set', path: ['models', id, 'enabled'], value: enabledTasks.has(id) }))
    if (ops.length) responseValue(await api.settings.mutate({ ns: MULTI_NS, ops, expectedRevision: config.multi.revision }))
    setAppId(''); setToken(''); setRealtimeKey('')
    await reload()
    if (realtimeSelected) {
      const probe = await testRealtime()
      setMessage(`已注册 ${enabledTasks.size} 个豆包语音模型；Realtime 连接测试通过（${probe.latencyMs} ms）。`)
      return
    }
    setMessage(enabledTasks.size ? `已注册 ${enabledTasks.size} 个豆包语音模型。` : '已停用全部豆包语音模型。')
  })
  const probeRealtime = () => run(async () => {
    if (!hasCredential('DOUBAO_APPID', appId) || !hasCredential('DOUBAO_REALTIME_API_KEY', realtimeKey)) throw new Error('请先保存 App ID 和 Realtime API Key')
    const probe = await testRealtime()
    setMessage(`Realtime 连接测试通过（${probe.latencyMs} ms）。`)
  })

  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredTasks = taskModels.filter(([id, raw]) => {
    if (!normalizedQuery) return true
    const model = object(raw)
    return [id, model.model, model.displayName, model.task, ...(model.input ?? []), ...(model.output ?? [])]
      .filter(value => typeof value === 'string')
      .some(value => value.toLocaleLowerCase().includes(normalizedQuery))
  })

  return <div className="mmp-capability">
    <div><div className="mmp-subtitle">豆包语音</div><div className="mmp-muted">独立 Provider ID：doubao-speech。模型来自内置语音能力目录，不使用方舟 /models 接口。</div></div>
    <div className="mmp-grid3"><SecretField label="豆包 App ID" name="doubao-appid" status={config.credentials.DOUBAO_APPID} value={appId} onChange={setAppId} /><SecretField label="语音 Token" name="doubao-token" status={config.credentials.DOUBAO_TOKEN} value={token} onChange={setToken} /><SecretField label="Realtime API Key" name="doubao-realtime-key" status={config.credentials.DOUBAO_REALTIME_API_KEY} value={realtimeKey} onChange={setRealtimeKey} /></div>
    <div className="mmp-actions"><button className="mmp-button" onClick={() => setEnabledTasks(new Set())} disabled={busy || readOnly}>全部取消</button></div>
    {taskModels.length > 0 && <div className="mmp-field"><label htmlFor="mmp-task-search">检索任务模型</label><input id="mmp-task-search" className="mmp-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="按模型、能力或输入输出类型检索" /><span className="mmp-search-summary">显示 {filteredTasks.length} / {taskModels.length} 个模型</span></div>}
    <div className="mmp-list">{filteredTasks.map(([id, raw]) => { const model = object(raw); const realtime = model.task === 'realtime-speech'; const credentialReady = hasCredential('DOUBAO_APPID', appId) && (realtime ? hasCredential('DOUBAO_REALTIME_API_KEY', realtimeKey) : hasCredential('DOUBAO_TOKEN', token)); return <label className="mmp-row" key={id}><input type="checkbox" checked={enabledTasks.has(id)} disabled={busy || readOnly} onChange={event => setEnabledTasks(current => { const next = new Set(current); event.target.checked ? next.add(id) : next.delete(id); return next })} /><span className="mmp-row-main"><span>{model.displayName ?? model.model}</span><div className="mmp-id">{id}</div><span className="mmp-tags"><span className="mmp-tag">{model.task}</span><span className="mmp-tag">{(model.input ?? []).join(' + ')} → {(model.output ?? []).join(' + ')}</span><span className="mmp-tag">{model.execution}</span>{enabledTasks.has(id) && <span className="mmp-tag">{credentialReady ? '凭据就绪' : '缺少凭据'}</span>}</span></span></label> })}</div>
    {taskModels.length > 0 && filteredTasks.length === 0 && <div className="mmp-muted">没有匹配的任务模型。</div>}
    <div className="mmp-actions"><button className="mmp-button" data-primary="true" onClick={saveProvider} disabled={busy || readOnly || !config.settingsWritable}>{enabledTasks.size ? `保存并注册（${enabledTasks.size}）` : '保存：全部停用'}</button><button className="mmp-button" onClick={probeRealtime} disabled={busy || readOnly || !realtimeSelected}>测试 Realtime 连接</button></div>
    <div className="mmp-muted">保存时会自动测试已启用的 Realtime Duplex；只有测试通过才显示注册成功。</div>
    {error && <div className="mmp-error" role="alert">{error}</div>}{message && <div className="mmp-success" role="status">{message}</div>}
  </div>
}

function DoubaoSpeechProviderRow({ api, readOnly }) {
  const [open, setOpen] = useState(false)
  const [config, reload] = useConfig(api)
  const models = Object.values(object(object(config.multi?.value).models)).map(object).filter(model => model.connection === 'doubao-speech')
  const enabled = models.filter(model => model.enabled !== false)
  const credentialReady = enabled.every(model => config.credentials.DOUBAO_APPID?.configured === true
    && (model.task === 'realtime-speech'
      ? config.credentials.DOUBAO_REALTIME_API_KEY?.configured === true
      : config.credentials.DOUBAO_TOKEN?.configured === true))
  const ready = enabled.length > 0 && credentialReady
  return <li className="mmp-provider-row">
    <div className="mmp-provider-head">
      <span className="mmp-provider-name">豆包语音</span>
      <span className="mmp-tag">任务模型</span>
      <span className="mmp-provider-dot" data-ready={ready} role="img" aria-label={ready ? '豆包语音凭据已配置' : '豆包语音尚未就绪'} title={ready ? '凭据已配置' : '尚未就绪'} />
      <span className="mmp-muted">{enabled.length ? `已启用 ${enabled.length} 个模型` : '尚未启用模型'}</span>
      <span className="mmp-provider-actions"><button type="button" className="mmp-button" onClick={() => setOpen(value => !value)}>{open ? '收起' : '编辑'}</button></span>
    </div>
    {open && <div className="mmp-provider-editor"><TaskCapability api={api} config={config} reload={reload} readOnly={readOnly} /></div>}
  </li>
}

function ProviderPanel({ api, config, reload }) {
  return <section className="mmp-card">
    <div><div className="mmp-title">火山引擎</div><div className="mmp-muted">方舟语言模型、豆包语音和 Realtime 统一归属 Provider：volcengine；仅凭据与运行协议按能力区分。</div></div>
    <ArkCapability api={api} config={config} reload={reload} />
    <div className="mmp-divider" />
    <TaskCapability api={api} config={config} reload={reload} />
  </section>
}

function VolcengineProviderExtension({ api }) {
  const [config, reload] = useConfig(api)
  if (config.status === 'loading' && !config.multi) return <div className="mmp-provider-extension"><div className="mmp-muted">正在加载火山语音能力…</div></div>
  if (config.status === 'error') return <div className="mmp-provider-extension"><div className="mmp-error">{config.error}</div></div>
  return <div className="mmp-provider-extension"><TaskCapability api={api} config={config} reload={reload} /></div>
}

function PortraitEditor({ api, config, reload }) {
  const targets = useMemo(() => snapshotTargets(config.multi, config.llm), [config.multi?.revision, config.llm?.revision])
  const [targetId, setTargetId] = useState(targets[0]?.id ?? '')
  const target = targets.find(item => item.id === targetId) ?? targets[0]
  const [draft, setDraft] = useState(() => initialPortrait())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(undefined)
  const [error, setError] = useState(undefined)

  useEffect(() => { if (targets.length && !targets.some(item => item.id === targetId)) setTargetId(targets[0].id) }, [targets, targetId])
  useEffect(() => { if (target) setDraft({ ...initialPortrait(target.name), ...object(target.portrait), pricing: { rates: [], ...object(object(target.portrait).pricing) }, performance: object(object(target.portrait).performance), validation: object(object(target.portrait).validation) }) }, [target?.id, config.multi?.revision])
  if (!target) return <section className="mmp-card"><div className="mmp-title">模型画像</div><div className="mmp-muted">先注册或选择至少一个模型，画像目标才会出现在这里。</div></section>

  const update = (key, value) => setDraft(current => ({ ...current, [key]: value }))
  const updatePerformance = (key, value) => setDraft(current => ({ ...current, performance: { ...current.performance, [key]: value } }))
  const rates = Array.isArray(draft.pricing?.rates) ? draft.pricing.rates : []
  const setRate = (index, key, value) => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: rates.map((rate, at) => at === index ? { ...rate, [key]: value } : rate) } }))
  const save = async () => {
    setBusy(true); setError(undefined); setMessage(undefined)
    try {
      if (!config.multi) throw new Error('multi-model-provider 设置未加载')
      const performance = { ...draft.performance }
      if (!performance.speedClass) delete performance.speedClass
      if (!performance.typicalLatencyMs?.min && !performance.typicalLatencyMs?.max) delete performance.typicalLatencyMs
      const portrait = {
        ...initialPortrait(), ...draft,
        ...(String(draft.summary ?? '').trim() ? { summary: String(draft.summary).trim() } : {}),
        specialties: textList(draft.specialties), limitations: textList(draft.limitations), bestFor: textList(draft.bestFor), avoidFor: textList(draft.avoidFor),
        pricing: { ...draft.pricing, rates: rates.map(rate => ({ ...rate, amount: Number(rate.amount) })).filter(rate => rate.operation && rate.unit && Number.isFinite(rate.amount) && rate.amount >= 0 && rate.currency) },
        performance,
        evidence: Array.isArray(draft.evidence) ? draft.evidence : [], qualityScores: object(draft.qualityScores),
      }
      if (!String(draft.summary ?? '').trim()) delete portrait.summary
      portrait.validation = validatePortrait(portrait)
      const value = target.kind === 'llm' ? { kind: 'llm', provider: target.provider, model: target.model, portrait } : portrait
      responseValue(await api.settings.mutate({ ns: MULTI_NS, ops: [{ op: 'set', path: target.path, value }], expectedRevision: config.multi.revision }))
      setMessage('画像已保存并完成结构校验。'); await reload()
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) } finally { setBusy(false) }
  }

  return <section className="mmp-card">
    <div><div className="mmp-title">模型画像</div><div className="mmp-muted">画像用于后续自动路由；价格和延迟应保留证据及观测日期。调用统计由独立观测模块采集，不写进这里。</div></div>
    <div className="mmp-portrait-layout">
      <div className="mmp-list">{targets.map(item => <button className="mmp-target" data-active={item.id === target.id} key={item.id} onClick={() => setTargetId(item.id)}><div>{item.name}</div><div className="mmp-id">{item.id}</div><div className="mmp-tags"><span className="mmp-tag">{item.kind}</span>{item.task && <span className="mmp-tag">{item.task}</span>}<span className="mmp-tag">{object(item.portrait).validation?.state ?? 'missing'}</span></div></button>)}</div>
      <div className="mmp-card">
        <div><div className="mmp-subtitle">{target.name}</div><div className="mmp-id">{target.id}</div><div className="mmp-tags"><span className="mmp-tag">输入：{target.input.join(' + ') || '未知'}</span><span className="mmp-tag">输出：{target.output.join(' + ') || '未知'}</span></div></div>
        <div className="mmp-field"><label>摘要</label><textarea className="mmp-textarea" value={draft.summary ?? ''} onChange={event => update('summary', event.target.value)} /></div>
        <div className="mmp-grid"><div className="mmp-field"><label>擅长（每行一项）</label><textarea className="mmp-textarea" value={listText(draft.specialties)} onChange={event => update('specialties', event.target.value)} /></div><div className="mmp-field"><label>局限（每行一项）</label><textarea className="mmp-textarea" value={listText(draft.limitations)} onChange={event => update('limitations', event.target.value)} /></div><div className="mmp-field"><label>适合</label><textarea className="mmp-textarea" value={listText(draft.bestFor)} onChange={event => update('bestFor', event.target.value)} /></div><div className="mmp-field"><label>避免用于</label><textarea className="mmp-textarea" value={listText(draft.avoidFor)} onChange={event => update('avoidFor', event.target.value)} /></div></div>
        <div className="mmp-grid3"><div className="mmp-field"><label>速度分级</label><select className="mmp-select" value={draft.performance?.speedClass ?? ''} onChange={event => updatePerformance('speedClass', event.target.value)}>{SPEEDS.map(speed => <option key={speed} value={speed}>{speed || '未知'}</option>)}</select></div><div className="mmp-field"><label>典型延迟最小值（ms）</label><input className="mmp-input" type="number" min="0" value={draft.performance?.typicalLatencyMs?.min ?? ''} onChange={event => updatePerformance('typicalLatencyMs', { min: Number(event.target.value), max: draft.performance?.typicalLatencyMs?.max ?? Number(event.target.value) })} /></div><div className="mmp-field"><label>典型延迟最大值（ms）</label><input className="mmp-input" type="number" min="0" value={draft.performance?.typicalLatencyMs?.max ?? ''} onChange={event => updatePerformance('typicalLatencyMs', { min: draft.performance?.typicalLatencyMs?.min ?? Number(event.target.value), max: Number(event.target.value) })} /></div></div>
        <div className="mmp-subtitle">价格</div>{rates.map((rate, index) => <div className="mmp-price" key={index}><div className="mmp-field"><label>操作</label><input className="mmp-input" value={rate.operation ?? ''} onChange={event => setRate(index, 'operation', event.target.value)} placeholder="input / output / generate" /></div><div className="mmp-field"><label>计费单位</label><input className="mmp-input" value={rate.unit ?? ''} onChange={event => setRate(index, 'unit', event.target.value)} placeholder="1M tokens" /></div><div className="mmp-field"><label>金额</label><input className="mmp-input" type="number" min="0" step="any" value={rate.amount ?? ''} onChange={event => setRate(index, 'amount', event.target.value)} /></div><div className="mmp-field"><label>币种</label><input className="mmp-input" value={rate.currency ?? 'CNY'} onChange={event => setRate(index, 'currency', event.target.value.toUpperCase())} /></div><button className="mmp-button" data-danger="true" onClick={() => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: rates.filter((_, at) => at !== index) } }))}>删除</button></div>)}<button className="mmp-button" onClick={() => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: [...rates, { operation: '', unit: '', amount: '', currency: 'CNY' }] } }))}>添加价格项</button>
        <div className="mmp-grid"><div><div className="mmp-subtitle">证据</div>{(draft.evidence ?? []).length ? <div className="mmp-list">{draft.evidence.map(item => <div className="mmp-row" key={item.id}><div className="mmp-row-main"><div>{item.source}</div><div className="mmp-tags"><span className="mmp-tag">{item.kind}</span><span className="mmp-tag">{item.observedAt}</span></div></div></div>)}</div> : <div className="mmp-muted">暂无证据。让 Agent“整理初始画像”会按画像本体定义补齐来源并自动校验。</div>}</div><div><div className="mmp-subtitle">校验</div><div className="mmp-checks">{(draft.validation?.checks ?? []).map(check => <div className="mmp-check" data-status={check.status} key={check.id}>{check.status === 'pass' ? '✓' : '△'} {check.message}</div>)}{!(draft.validation?.checks ?? []).length && <div className="mmp-muted">尚未校验</div>}</div></div></div>
        <div className="mmp-actions"><button className="mmp-button" data-primary="true" disabled={busy || !config.settingsWritable} onClick={save}>保存并校验画像</button>{message && <span className="mmp-success" role="status">{message}</span>}</div>{error && <div className="mmp-error" role="alert">{error}</div>}
      </div>
    </div>
  </section>
}

function MultiModelSettings({ api }) {
  const [tab, setTab] = useState('provider')
  const [config, reload] = useConfig(api)
  if (config.status === 'loading' && !config.multi) return <div className="mmp-page"><div className="mmp-muted">正在加载模型配置…</div></div>
  if (config.status === 'error') return <div className="mmp-page"><div className="mmp-error">{config.error}</div><button className="mmp-button" onClick={() => void reload()}>重试</button></div>
  return <div className="mmp-page"><div className="mmp-tabs"><button className="mmp-tab" data-active={tab === 'provider'} onClick={() => setTab('provider')}>火山 / 方舟 / 豆包</button><button className="mmp-tab" data-active={tab === 'portraits'} onClick={() => setTab('portraits')}>模型画像</button></div>{tab === 'provider' ? <ProviderPanel api={api} config={config} reload={reload} /> : <PortraitEditor api={api} config={config} reload={reload} />}</div>
}

function PortraitSettings({ api }) {
  const [config, reload] = useConfig(api)
  if (config.status === 'loading' && !config.multi) return <div className="mmp-page"><div className="mmp-muted">正在加载模型画像…</div></div>
  if (config.status === 'error') return <div className="mmp-page"><div className="mmp-error">{config.error}</div><button className="mmp-button" onClick={() => void reload()}>重试</button></div>
  return <div className="mmp-page"><PortraitEditor api={api} config={config} reload={reload} /></div>
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

/** Qualitative Markdown plus structured, measured metrics for one LLM row. */
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
  if (config.status === 'loading' && !config.multi) return <div className="mmp-muted">正在加载模型说明…</div>
  if (config.status === 'error') return <div className="mmp-error">{config.error}</div>

  const rates = Array.isArray(draft.pricing?.rates) ? draft.pricing.rates : []
  const setRate = (index, key, value) => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: rates.map((rate, at) => at === index ? { ...rate, [key]: value } : rate) } }))
  const normalizedPortrait = (source) => {
    const description = String(source.description ?? '').trim()
    const portrait = {
      ...initialPortrait(), ...source,
      ...(description ? { description } : {}),
      // Qualitative routing knowledge now has one canonical Markdown home.
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
    if (!config.multi) throw new Error('multi-model-provider 设置未加载')
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
  const save = () => run(() => persist(draft, '模型说明已保存。'))
  const probe = () => run(async () => {
    const started = Date.now()
    const response = await fetch('/dsh-multi-model-provider/probe', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-model-probe': '1' },
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
        ? [`reachable=true`, `latencyMs=${lastProbe.latencyMs}`, ...(lastProbe.timeToFirstTokenMs === undefined ? [] : [`timeToFirstTokenMs=${lastProbe.timeToFirstTokenMs}`])]
        : ['reachable=false'],
      ...(reachable ? {} : { notes: String(result.error ?? `HTTP ${response.status}`) }),
    }]
    const next = { ...draft, performance: {
      ...object(draft.performance), lastProbe,
      ...(reachable ? { speedClass: speedClassOf(lastProbe), typicalLatencyMs: { min: lastProbe.latencyMs, max: lastProbe.latencyMs } } : {}),
    }, evidence }
    await persist(next, reachable ? '实测完成，结果已保存。' : '探测失败，失败结果已保存。')
    if (!reachable) throw new Error(String(result.error ?? `模型不可访问（HTTP ${response.status}）`))
  })
  const lastProbe = object(draft.performance?.lastProbe)

  return <section className="mmp-provider-extension">
    <div><div className="mmp-subtitle">模型说明与运行指标</div><div className="mmp-muted">文字信息集中为一份分章节 Markdown；可用性和速度来自实测，不再手填。价格仍按计费单位结构化保存。</div></div>
    <div className="mmp-field"><label>模型说明（Markdown）</label><textarea className="mmp-textarea" style={{ minHeight: 180 }} value={draft.description ?? ''} disabled={disabled || busy} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} /></div>
    <div className="mmp-grid3">
      <div><div className="mmp-muted">可用性</div><div>{lastProbe.observedAt ? (lastProbe.reachable ? '可访问' : '不可访问') : '尚未实测'}</div></div>
      <div><div className="mmp-muted">首 Token</div><div>{Number.isFinite(lastProbe.timeToFirstTokenMs) ? `${lastProbe.timeToFirstTokenMs} ms` : '—'}</div></div>
      <div><div className="mmp-muted">总延迟</div><div>{Number.isFinite(lastProbe.latencyMs) ? `${lastProbe.latencyMs} ms` : '—'}</div></div>
    </div>
    {lastProbe.observedAt && <div className="mmp-muted">观测时间：{new Date(lastProbe.observedAt).toLocaleString()} · 单次极小请求，仅代表当时链路状态</div>}
    <div className="mmp-subtitle">价格</div>
    {rates.map((rate, index) => <div className="mmp-price" key={index}><div className="mmp-field"><label>操作</label><input className="mmp-input" value={rate.operation ?? ''} disabled={disabled || busy} onChange={event => setRate(index, 'operation', event.target.value)} placeholder="input / output" /></div><div className="mmp-field"><label>计费单位</label><input className="mmp-input" value={rate.unit ?? ''} disabled={disabled || busy} onChange={event => setRate(index, 'unit', event.target.value)} placeholder="1M tokens" /></div><div className="mmp-field"><label>金额</label><input className="mmp-input" type="number" min="0" step="any" value={rate.amount ?? ''} disabled={disabled || busy} onChange={event => setRate(index, 'amount', event.target.value)} /></div><div className="mmp-field"><label>币种</label><input className="mmp-input" value={rate.currency ?? 'CNY'} disabled={disabled || busy} onChange={event => setRate(index, 'currency', event.target.value.toUpperCase())} /></div><button className="mmp-button" data-danger="true" disabled={disabled || busy} onClick={() => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: rates.filter((_, at) => at !== index) } }))}>删除</button></div>)}
    <div className="mmp-actions"><button className="mmp-button" disabled={disabled || busy} onClick={() => setDraft(current => ({ ...current, pricing: { ...current.pricing, rates: [...rates, { operation: '', unit: '', amount: '', currency: 'CNY' }] } }))}>添加价格项</button><button className="mmp-button" data-primary="true" disabled={disabled || busy || !config.settingsWritable} onClick={save}>保存说明与价格</button><button className="mmp-button" disabled={disabled || busy || !config.settingsWritable} onClick={probe}>测试可用性与速度</button></div>
    <div className="mmp-muted">速度测试会向该模型发送一次最多 8 token 的极小请求，可能产生少量费用。</div>
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
  ctx.slots.inject('settings.models.provider.rows', () => ctx.slots.register({
    name: 'settings.models.provider.rows', id: 'doubao-speech', order: 20,
    inject: () => ({ api: connection.api }),
  }, DoubaoSpeechProviderRow))
  ctx.slots.inject('settings.models.model.details', () => ctx.slots.register({
    name: 'settings.models.model.details', id: 'model-portrait', order: 10,
    inject: () => ({ api: connection.api }),
  }, ModelPortraitDetails))
}
