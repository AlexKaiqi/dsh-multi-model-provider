import { VOLCENGINE_ARK_API, VOLCENGINE_ARK_API_KEY, VOLCENGINE_ARK_BASE_URL, VOLCENGINE_PROVIDER } from '../volcengine-defaults.ts'

function value(response) {
  if (!response.ok) throw new Error(response.error.message)
  return response.value
}

export async function loadArkSettings(remote) {
  const settings = value(await remote.settings.describe())
  const namespace = settings.namespaces.find(item => item.ns === 'llm-pi-ai')
  if (!namespace) throw new Error('llm-pi-ai settings are unavailable')
  const profile = namespace.value?.providers?.[VOLCENGINE_PROVIDER] ?? {}
  const ref = profile.apiKeyEnv || VOLCENGINE_ARK_API_KEY
  const credentials = value(await remote.credentials.describe([ref]))
  return { namespace, profile, ref, keyConfigured: credentials[ref]?.configured === true, writable: settings.writable }
}

export function arkDraft(snapshot) {
  return {
    baseURL: snapshot.profile.baseURL || VOLCENGINE_ARK_BASE_URL,
    models: snapshot.profile.models ?? [],
  }
}

export async function discoverArkSettings(remote, draft, apiKey) {
  return value(await remote.llm.discoverModels('multi-model-provider', {
    provider: VOLCENGINE_PROVIDER,
    baseURL: draft.baseURL.trim() || VOLCENGINE_ARK_BASE_URL,
    ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
  }))
}

/** Save only the fields this form owns; adopt the revision before saving a key. */
export async function saveArkSettings(remote, snapshot, draft, apiKey, committed) {
  const baseURL = draft.baseURL.trim() || VOLCENGINE_ARK_BASE_URL
  const url = new URL(baseURL)
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Base URL must be an HTTP(S) endpoint without credentials, query, or fragment')
  const key = apiKey.trim()
  if (key && (!/^[\x21-\x7e]+$/.test(key) || /^(?:[A-Z_][A-Z0-9_]*=|["'])/.test(key))) throw new Error('Paste the raw API key only')
  const models = draft.models.map(model => ({ ...model, id: model.id.trim() }))
  if (!models.length || models.some(model => !model.id)) throw new Error('Select at least one model or enter its exact model ID')
  if (new Set(models.map(model => model.id)).size !== models.length) throw new Error('Model IDs must be unique')
  const fields = { baseURL, api: VOLCENGINE_ARK_API, apiKeyEnv: snapshot.ref, models }
  if (!snapshot.profile.displayName) fields.displayName = '火山方舟（按量计费）'
  const ops = Object.entries(fields).map(([field, next]) => ({ op: 'set', path: ['providers', VOLCENGINE_PROVIDER, field], value: next }))
  const namespace = value(await remote.settings.mutate('llm-pi-ai', ops, snapshot.namespace.revision))
  committed({ ...snapshot, namespace, profile: namespace.value.providers[VOLCENGINE_PROVIDER] })
  if (key) value(await remote.credentials.set(snapshot.ref, key))
}

/** Discovery capacity is not a request cap; preserve explicit saved model fields. */
export function arkModelsFromIds(text, previous, candidates) {
  return text.split(/\n/).map(id => id.trim()).filter(Boolean).map(id => {
    const saved = previous.find(model => model.id === id)
    if (saved) return saved
    const candidate = candidates.find(model => model.id === id)
    return { id, ...(candidate?.name ? { name: candidate.name } : {}), ...(candidate?.contextWindow ? { contextWindow: candidate.contextWindow } : {}) }
  })
}
