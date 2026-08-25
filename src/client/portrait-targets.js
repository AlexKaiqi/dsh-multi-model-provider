function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function targetFromLanguage(raw) {
  const row = object(raw)
  if (typeof row.id !== 'string' || typeof row.provider !== 'string' || typeof row.model !== 'string') return undefined
  return {
    id: row.id,
    kind: 'llm',
    provider: row.provider,
    providerName: typeof row.providerName === 'string' && row.providerName ? row.providerName : row.provider,
    model: row.model,
    name: typeof row.displayName === 'string' && row.displayName ? row.displayName : row.model,
    input: Array.isArray(row.inputModalities) && row.inputModalities.length ? row.inputModalities : ['text'],
    output: ['text'],
    enabled: row.status === 'live',
    portrait: object(row.portrait),
  }
}

function targetFromTask(raw) {
  const row = object(raw)
  if (typeof row.id !== 'string' || typeof row.provider !== 'string' || typeof row.model !== 'string') return undefined
  const connection = object(row.connectionProfile)
  return {
    id: row.id,
    kind: 'task',
    provider: row.provider,
    providerName: typeof connection.displayName === 'string' && connection.displayName ? connection.displayName : row.provider,
    model: row.model,
    name: typeof row.displayName === 'string' && row.displayName ? row.displayName : row.model,
    input: Array.isArray(row.input) ? row.input : [],
    output: Array.isArray(row.output) ? row.output : [],
    task: row.task,
    enabled: row.enabled === true,
    portrait: object(row.portrait),
  }
}

/** Convert the server-side modelCatalog.snapshot() response into portrait selector rows. */
export function snapshotPortraitTargets(catalog) {
  const language = (Array.isArray(catalog?.languageModels) ? catalog.languageModels : [])
    .map(targetFromLanguage)
    .filter(Boolean)
  const task = (Array.isArray(catalog?.taskModels) ? catalog.taskModels : [])
    .map(targetFromTask)
    .filter(Boolean)
  return [...language, ...task]
}

export function portraitTargetState(target) {
  const portrait = object(target?.portrait)
  return object(portrait.validation).state ?? (Object.keys(portrait).length ? 'unvalidated' : 'missing')
}

/** Filter the portrait selector without changing the underlying model registry. */
export function filterPortraitTargets(targets, filters = {}) {
  const query = String(filters.query ?? '').trim().toLocaleLowerCase()
  const kind = filters.kind ?? 'all'
  const provider = filters.provider ?? 'all'
  const state = filters.state ?? 'all'
  const availability = filters.availability ?? 'all'
  return targets.filter((item) => {
    if (kind !== 'all' && item.kind !== kind) return false
    if (provider !== 'all' && item.provider !== provider) return false
    if (state !== 'all' && portraitTargetState(item) !== state) return false
    if (availability === 'enabled' && item.enabled === false) return false
    if (availability === 'disabled' && item.enabled !== false) return false
    return !query || [item.name, item.id, item.provider, item.model, item.task]
      .filter(value => typeof value === 'string')
      .some(value => value.toLocaleLowerCase().includes(query))
  })
}
