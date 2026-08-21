function object(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {}
}

function modelRecord(value) {
  return typeof value === 'string' ? { id: value } : object(value)
}

/** Build the shared portrait target list from the two Settings namespaces. */
export function snapshotPortraitTargets(multi, llm) {
  const root = object(multi?.value)
  const connections = object(root.connections)
  const task = Object.entries(object(root.models)).map(([id, raw]) => {
    const model = object(raw)
    const connection = object(connections[model.connection])
    return {
      id,
      kind: 'task',
      provider: connection.provider ?? model.connection ?? '',
      model: model.model ?? '',
      name: model.displayName ?? model.model ?? id,
      input: Array.isArray(model.input) ? model.input : [],
      output: Array.isArray(model.output) ? model.output : [],
      task: model.task,
      enabled: model.enabled !== false,
      portrait: object(model.portrait),
    }
  })

  const llmRoot = object(llm?.value)
  const providers = object(llmRoot.providers)
  const bindings = object(root.portraits)
  const language = Object.entries(providers).flatMap(([provider, raw]) => {
    const profile = object(raw)
    return (Array.isArray(profile.models) ? profile.models : []).flatMap((rawModel) => {
      const model = modelRecord(rawModel)
      if (typeof model.id !== 'string' || !model.id.trim()) return []
      const id = `llm:${provider}/${model.id}`
      return [{
        id,
        kind: 'llm',
        provider,
        model: model.id,
        name: model.name ?? model.id,
        input: Array.isArray(model.input) && model.input.length ? model.input : ['text'],
        output: ['text'],
        enabled: true,
        portrait: object(object(bindings[id]).portrait),
      }]
    })
  })

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
