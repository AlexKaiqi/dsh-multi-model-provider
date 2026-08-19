import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { settingsNamespace, type SettingsDescriptor, type SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { ModelManagerError } from './operations.ts'
import { initialPortrait, normalizePortrait } from './portrait-core.ts'
import {
  MODEL_EXECUTION_MODES,
  MODEL_MODALITIES,
  TASK_MODEL_CAPABILITIES,
  TASK_MODEL_TASKS,
  type CredentialStatus,
  type DiscoverTaskModelsInput,
  type ListTaskModelsInput,
  type ModelExecutionMode,
  type ModelModality,
  type RegisterTaskModelInput,
  type ResolvedTaskModelRoute,
  type TaskModelRegistryConfig,
  type TaskModelCapability,
  type TaskModelTask,
  type SelectTaskModelsInput,
} from './types.ts'

export const TASK_MODEL_SETTINGS_NAMESPACE = settingsNamespace('multi-model-provider')

const modalitySchema = z.union(MODEL_MODALITIES)
const taskSchema = z.union(TASK_MODEL_TASKS)
const executionSchema = z.union(MODEL_EXECUTION_MODES)
const capabilitySchema = z.union(TASK_MODEL_CAPABILITIES)

const connectionSchema = z.object({
  provider: z.string().required().description('Provider family, for example openai.'),
  displayName: z.string().description('Human-readable connection name.'),
  credentialRef: z.string().role('credential-ref').description('Secure credential reference; never the credential value.'),
  credentialRefs: z.dict(z.string().role('credential-ref')).description('Named secure credential references for multi-credential providers.'),
  baseURL: z.string().description('Optional absolute API base URL.'),
  catalogEndpoint: z.string().description('Optional provider model-catalog endpoint; defaults to baseURL/models.'),
  catalogCredentialName: z.string().description('Credential slot used for catalog discovery.'),
  profile: z.dict(z.any()).default({}).description('Non-secret provider-specific connection metadata.'),
}).description('Reusable provider connection and authentication reference.')

const taskModelSchema = z.object({
  enabled: z.boolean().default(true).description('Whether routing and direct invocation may use this registered route.'),
  connection: z.string().required().description('Key in the connections dictionary.'),
  model: z.string().required().description('Exact model id accepted by the provider.'),
  displayName: z.string().description('Human-readable model name.'),
  task: taskSchema.required().description('Semantic task; language models remain in llm-pi-ai.'),
  runtimeAdapter: z.string().description('Adapter contract required to execute this route.'),
  credentialNames: z.array(z.string()).description('Named connection credential slots required by this route.'),
  input: z.array(modalitySchema).default([]).description('Accepted input modalities.'),
  output: z.array(modalitySchema).default([]).description('Produced output modalities or data shapes.'),
  execution: executionSchema.default('request-response').description('Invocation lifecycle.'),
  capabilities: z.array(capabilitySchema).default([]).description('Stable cross-provider capability ids.'),
  operations: z.array(z.string()).default([]).description('Provider operations such as generate, edit, or transcribe.'),
  roles: z.array(z.string()).default([]).description('Routing roles this model may fill.'),
  profile: z.dict(z.any()).default({}).description('Non-secret provider-specific capability metadata.'),
  portrait: z.dict(z.any()).description('Router-facing model portrait: pricing, strengths, speed, evidence, and validation.'),
}).description('A registered task-model route. Registration does not make it callable by itself.')

const externalPortraitSchema = z.object({
  kind: z.union(['llm'] as const).required().description('Runtime registry owning this portrait target.'),
  provider: z.string().required().description('Exact LLM provider route.'),
  model: z.string().required().description('Exact provider model id.'),
  portrait: z.dict(z.any()).required().description('Evidence-backed router-facing model portrait.'),
}).description('Portrait binding for a model whose runtime registration is owned by llm-pi-ai.')

export const TASK_MODEL_REGISTRY_SCHEMA = z.object({
  connections: z.dict(connectionSchema).default({}).description('Reusable endpoint and credential-reference profiles.'),
  models: z.dict(taskModelSchema).default({}).description('Image, audio, video, embedding, and reranking model routes.'),
  defaults: z.dict(z.string(), taskSchema)
    .default({} as Record<TaskModelTask, string>)
    .description('Optional default route id for each task.'),
  portraits: z.dict(externalPortraitSchema).default({})
    .description('Portraits for LLM routes, keyed as llm:<provider>/<model>.'),
}) as unknown as z<TaskModelRegistryConfig>

export const BUILTIN_TASK_MODEL_REGISTRY: TaskModelRegistryConfig = {
  connections: {
    openai: {
      provider: 'openai',
      displayName: 'OpenAI',
      credentialRef: 'OPENAI_API_KEY',
      baseURL: 'https://api.openai.com/v1',
      profile: {},
    },
    volcengine: {
      provider: 'volcengine',
      displayName: '火山引擎（方舟 / 豆包）',
      credentialRefs: {
        arkApiKey: 'ARK_API_KEY',
        speechAppId: 'DOUBAO_APPID',
        speechToken: 'DOUBAO_TOKEN',
      },
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      catalogEndpoint: 'https://ark.cn-beijing.volces.com/api/v3/models',
      catalogCredentialName: 'arkApiKey',
      profile: {
        products: ['ark', 'doubao-speech'],
        catalogDiscovery: 'openai-models',
        speechResources: 'documented-resource-ids',
      },
    },
  },
  models: {
    'openai/gpt-image-2': {
      connection: 'openai',
      model: 'gpt-image-2',
      displayName: 'GPT Image 2',
      task: 'image-generation',
      runtimeAdapter: 'openai-images',
      input: ['text', 'image'],
      output: ['image'],
      execution: 'request-response',
      capabilities: ['image.generate'],
      operations: ['generate', 'edit'],
      roles: ['image-generator'],
      profile: {},
      portrait: initialPortrait('OpenAI image generation and editing model.'),
    },
    'doubao/volc.bigasr.sauc.duration': {
      enabled: true,
      connection: 'volcengine',
      model: 'volc.bigasr.sauc.duration',
      displayName: '豆包大模型录音文件识别',
      task: 'transcription',
      runtimeAdapter: 'doubao-speech',
      credentialNames: ['speechAppId', 'speechToken'],
      input: ['audio', 'file'],
      output: ['text'],
      execution: 'streaming',
      capabilities: ['speech.transcribe.file', 'speech.transcribe.stream'],
      operations: ['transcribe-file', 'transcribe-stream'],
      roles: ['speech-to-text'],
      profile: { resourceIdRole: 'asr' },
      portrait: initialPortrait('Doubao/Volcengine large-model speech transcription resource.'),
    },
    'doubao/seed-tts-1.0': {
      enabled: true,
      connection: 'volcengine',
      model: 'seed-tts-1.0',
      displayName: '豆包 Seed TTS 1.0',
      task: 'speech-synthesis',
      runtimeAdapter: 'doubao-speech',
      credentialNames: ['speechAppId', 'speechToken'],
      input: ['text'],
      output: ['audio'],
      execution: 'streaming',
      capabilities: ['speech.synthesize.short'],
      operations: ['synthesize'],
      roles: ['text-to-speech'],
      profile: { resourceIdRole: 'tts' },
      portrait: initialPortrait('Doubao/Volcengine short-text speech synthesis resource.'),
    },
  },
  defaults: {},
  portraits: {},
}

const TASK_DEFAULTS: Record<TaskModelTask, {
  input: readonly ModelModality[]
  output: readonly ModelModality[]
  execution: ModelExecutionMode
  operations: readonly string[]
}> = {
  'image-understanding': { input: ['image', 'file'], output: ['text'], execution: 'request-response', operations: ['understand'] },
  'image-generation': { input: ['text'], output: ['image'], execution: 'request-response', operations: ['generate'] },
  'speech-synthesis': { input: ['text'], output: ['audio'], execution: 'streaming', operations: ['synthesize'] },
  transcription: { input: ['audio', 'file'], output: ['text'], execution: 'request-response', operations: ['transcribe'] },
  'speech-translation': { input: ['audio', 'file'], output: ['text'], execution: 'streaming', operations: ['translate'] },
  'speech-analysis': { input: ['audio', 'file'], output: ['data'], execution: 'request-response', operations: ['analyze'] },
  'voice-conversion': { input: ['audio', 'file'], output: ['audio'], execution: 'async-job', operations: ['convert-voice'] },
  'podcast-generation': { input: ['text', 'audio', 'file'], output: ['audio'], execution: 'async-job', operations: ['create-podcast'] },
  'realtime-speech': { input: ['text', 'audio'], output: ['text', 'audio'], execution: 'realtime', operations: ['realtime-session'] },
  'voice-cloning': { input: ['audio', 'file'], output: ['data'], execution: 'async-job', operations: ['clone-voice'] },
  'voice-design': { input: ['text'], output: ['data'], execution: 'async-job', operations: ['design-voice'] },
  'audio-generation': { input: ['text'], output: ['audio'], execution: 'async-job', operations: ['generate'] },
  'video-generation': { input: ['text', 'image'], output: ['video'], execution: 'async-job', operations: ['generate'] },
  embedding: { input: ['text'], output: ['vector'], execution: 'request-response', operations: ['embed'] },
  reranking: { input: ['text'], output: ['data'], execution: 'request-response', operations: ['rerank'] },
}

const CREDENTIAL_NAME = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/

function nonBlank(value: string, name: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new ModelManagerError(`${name} must not be blank`, 'INVALID_TASK_MODEL_CONFIGURATION')
  return normalized
}

function optionalText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function absoluteHttpUrl(value: string | undefined, name: string): string | undefined {
  const normalized = optionalText(value)
  if (normalized === undefined) return undefined
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch (cause) {
    throw new ModelManagerError(`${name} must be an absolute URL`, 'INVALID_TASK_MODEL_CONFIGURATION', { cause })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ModelManagerError(`${name} must use http or https`, 'INVALID_TASK_MODEL_CONFIGURATION')
  }
  return normalized
}

function stringList(values: readonly string[] | undefined, name: string): string[] | undefined {
  if (values === undefined) return undefined
  const normalized = values.map((value, index) => nonBlank(value, `${name}[${index}]`))
  return [...new Set(normalized)]
}

function namedCredentialRefs(
  values: Readonly<Record<string, unknown>> | undefined,
  name: string,
): Record<string, string> | undefined {
  if (values === undefined) return undefined
  const refs: Record<string, string> = {}
  for (const [rawKey, rawRef] of Object.entries(values)) {
    const key = nonBlank(rawKey, `${name} key`)
    if (!CREDENTIAL_NAME.test(key)) {
      throw new ModelManagerError(
        `${name} key '${key}' must start with a letter and contain only letters, digits, dot, underscore, or hyphen`,
        'INVALID_TASK_MODEL_CONFIGURATION',
      )
    }
    if (typeof rawRef !== 'string') {
      throw new ModelManagerError(`${name}.${key} must be a credential reference name`, 'INVALID_TASK_MODEL_CONFIGURATION')
    }
    const ref = nonBlank(rawRef, `${name}.${key}`)
    try {
      credentialRef(ref)
    } catch (cause) {
      throw new ModelManagerError(
        `${name}.${key} '${ref}' must be a POSIX environment-variable name`,
        'INVALID_TASK_MODEL_CONFIGURATION',
        { cause },
      )
    }
    refs[key] = ref
  }
  return refs
}

async function namedCredentialStatuses(
  ctx: Context,
  refs: Readonly<Record<string, string>> | undefined,
): Promise<Record<string, CredentialStatus> | undefined> {
  if (refs === undefined || Object.keys(refs).length === 0) return undefined
  return Object.fromEntries(await Promise.all(
    Object.entries(refs).map(async ([name, ref]) => [name, await credentialStatus(ctx, ref)] as const),
  ))
}

function selectedCredentialRefs(
  connection: TaskModelRegistryConfig['connections'][string],
  names: readonly string[] | undefined,
): { credentialRef?: string; credentialRefs?: Record<string, string> } {
  if (names === undefined) {
    return {
      ...(connection.credentialRef === undefined ? {} : { credentialRef: connection.credentialRef }),
      ...(connection.credentialRefs === undefined ? {} : { credentialRefs: { ...connection.credentialRefs } }),
    }
  }
  const selected = new Set(names)
  return {
    ...(selected.has('default') && connection.credentialRef !== undefined ? { credentialRef: connection.credentialRef } : {}),
    credentialRefs: Object.fromEntries(
      Object.entries(connection.credentialRefs ?? {}).filter(([name]) => selected.has(name)),
    ),
  }
}

function requiredDescriptor(ctx: Context): SettingsDescriptor {
  const descriptor = ctx.settings.describe({ redactSecrets: true })
    .find(item => item.ns === TASK_MODEL_SETTINGS_NAMESPACE)
  if (descriptor === undefined) {
    throw new ModelManagerError(
      'multi-model-provider settings are unavailable; register the plugin before using its tools',
      'TASK_MODEL_SETTINGS_UNAVAILABLE',
    )
  }
  return descriptor
}

function resolvedConfig(descriptor: SettingsDescriptor): TaskModelRegistryConfig {
  return descriptor.value as TaskModelRegistryConfig
}

export function resolveTaskModelRoute(ctx: Context, id: string): ResolvedTaskModelRoute {
  const routeId = nonBlank(id, 'id')
  const config = resolvedConfig(requiredDescriptor(ctx))
  const registration = config.models[routeId]
  if (registration === undefined) throw new ModelManagerError(`unknown task model '${routeId}'`, 'UNKNOWN_TASK_MODEL')
  const connection = config.connections[registration.connection]
  if (connection === undefined) {
    throw new ModelManagerError(
      `task model '${routeId}' references unknown connection '${registration.connection}'`,
      'INVALID_TASK_MODEL_CONFIGURATION',
    )
  }
  return { id: routeId, connection, registration }
}

async function credentialStatus(ctx: Context, ref: string): Promise<CredentialStatus> {
  let branded
  try {
    branded = credentialRef(ref)
  } catch (cause) {
    throw new ModelManagerError(
      `credentialRef '${ref}' must be a POSIX environment-variable name`,
      'INVALID_TASK_MODEL_CONFIGURATION',
      { cause },
    )
  }
  const info = await ctx.credentials.describe(branded)
  return {
    ref,
    configured: info.configured,
    writable: info.writable,
    ...(info.source === undefined ? {} : { source: info.source }),
  }
}

function validateConnection(id: string, connection: TaskModelRegistryConfig['connections'][string]): void {
  nonBlank(id, 'connection id')
  nonBlank(connection.provider, `connections.${id}.provider`)
  absoluteHttpUrl(connection.baseURL, `connections.${id}.baseURL`)
  absoluteHttpUrl(connection.catalogEndpoint, `connections.${id}.catalogEndpoint`)
  if (connection.credentialRef !== undefined) credentialRef(nonBlank(connection.credentialRef, `connections.${id}.credentialRef`))
  const refs = namedCredentialRefs(connection.credentialRefs, `connections.${id}.credentialRefs`)
  const catalogCredentialName = optionalText(connection.catalogCredentialName)
  if (catalogCredentialName !== undefined
    && catalogCredentialName !== 'default'
    && refs?.[catalogCredentialName] === undefined) {
    throw new ModelManagerError(
      `connections.${id}.catalogCredentialName references unknown credential slot '${catalogCredentialName}'`,
      'INVALID_TASK_MODEL_CONFIGURATION',
    )
  }
}

export function validateTaskModelRegistry(config: TaskModelRegistryConfig): void {
  for (const [id, connection] of Object.entries(config.connections)) validateConnection(id, connection)

  for (const [id, model] of Object.entries(config.models)) {
    nonBlank(id, 'model route id')
    nonBlank(model.connection, `models.${id}.connection`)
    nonBlank(model.model, `models.${id}.model`)
    if (config.connections[model.connection] === undefined) {
      throw new ModelManagerError(
        `models.${id}.connection references unknown connection '${model.connection}'`,
        'INVALID_TASK_MODEL_CONFIGURATION',
      )
    }
    stringList(model.input, `models.${id}.input`)
    stringList(model.output, `models.${id}.output`)
    stringList(model.capabilities, `models.${id}.capabilities`)
    const credentialNames = stringList(model.credentialNames, `models.${id}.credentialNames`)
    const connection = config.connections[model.connection]!
    for (const name of credentialNames ?? []) {
      if (name !== 'default' && connection.credentialRefs?.[name] === undefined) {
        throw new ModelManagerError(
          `models.${id}.credentialNames references unknown connection credential slot '${name}'`,
          'INVALID_TASK_MODEL_CONFIGURATION',
        )
      }
    }
    stringList(model.operations, `models.${id}.operations`)
    stringList(model.roles, `models.${id}.roles`)
  }

  for (const [task, id] of Object.entries(config.defaults)) {
    const model = config.models[id]
    if (model === undefined) {
      throw new ModelManagerError(`defaults.${task} references unknown model '${id}'`, 'INVALID_TASK_MODEL_CONFIGURATION')
    }
    if (model.task !== task) {
      throw new ModelManagerError(
        `defaults.${task} references a '${model.task}' model`,
        'INVALID_TASK_MODEL_CONFIGURATION',
      )
    }
  }

  for (const [id, binding] of Object.entries(config.portraits ?? {})) {
    if (!id.startsWith('llm:')) {
      throw new ModelManagerError(`portraits.${id} must use llm:<provider>/<model> id`, 'INVALID_TASK_MODEL_CONFIGURATION')
    }
    nonBlank(binding.provider, `portraits.${id}.provider`)
    nonBlank(binding.model, `portraits.${id}.model`)
    normalizePortrait(binding.portrait)
  }
}

export function registerTaskModelSettings(ctx: Context): void {
  ctx.settings.register(TASK_MODEL_SETTINGS_NAMESPACE, TASK_MODEL_REGISTRY_SCHEMA, {
    base: BUILTIN_TASK_MODEL_REGISTRY,
    applies: 'live',
    validate: validateTaskModelRegistry,
  })
}

export async function registerTaskModel(
  ctx: Context,
  input: RegisterTaskModelInput,
): Promise<Record<string, unknown>> {
  const id = nonBlank(input.id, 'id')
  const connectionId = nonBlank(input.connection, 'connection')
  const modelId = nonBlank(input.model, 'model')
  const descriptor = requiredDescriptor(ctx)
  const config = resolvedConfig(descriptor)
  const existingConnection = config.connections[connectionId]
  const provider = optionalText(input.provider) ?? existingConnection?.provider
  if (provider === undefined) {
    throw new ModelManagerError(
      `provider is required when creating connection '${connectionId}'`,
      'INVALID_TASK_MODEL_CONFIGURATION',
    )
  }

  const credential = optionalText(input.credentialRef)
  if (credential !== undefined) await credentialStatus(ctx, credential)
  const credentialRefs = namedCredentialRefs(input.credentialRefs, 'credentialRefs')
  if (credentialRefs !== undefined) await namedCredentialStatuses(ctx, credentialRefs)
  const baseURL = absoluteHttpUrl(input.baseURL, 'baseURL')
  const catalogEndpoint = absoluteHttpUrl(input.catalogEndpoint, 'catalogEndpoint')
  const catalogCredentialName = optionalText(input.catalogCredentialName)
  const defaults = TASK_DEFAULTS[input.task]
  const existingModel = config.models[id]

  const connectionFields: Record<string, unknown> = {
    provider: nonBlank(provider, 'provider'),
    ...(input.connectionDisplayName === undefined ? {} : { displayName: optionalText(input.connectionDisplayName) }),
    ...(credential === undefined ? {} : { credentialRef: credential }),
    ...(credentialRefs === undefined ? {} : { credentialRefs }),
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(catalogEndpoint === undefined ? {} : { catalogEndpoint }),
    ...(catalogCredentialName === undefined ? {} : { catalogCredentialName }),
    ...(input.connectionProfile === undefined ? {} : { profile: input.connectionProfile }),
  }
  const modelFields: Record<string, unknown> = {
    enabled: input.enabled ?? existingModel?.enabled ?? true,
    connection: connectionId,
    model: modelId,
    task: input.task,
    ...(input.displayName === undefined ? {} : { displayName: optionalText(input.displayName) }),
    ...(input.runtimeAdapter === undefined ? {} : { runtimeAdapter: optionalText(input.runtimeAdapter) }),
    ...(input.credentialNames === undefined ? {} : { credentialNames: stringList(input.credentialNames, 'credentialNames') }),
    input: stringList(input.input, 'input') ?? existingModel?.input ?? defaults.input,
    output: stringList(input.output, 'output') ?? existingModel?.output ?? defaults.output,
    execution: input.execution ?? existingModel?.execution ?? defaults.execution,
    capabilities: stringList(input.capabilities, 'capabilities') as TaskModelCapability[] | undefined
      ?? existingModel?.capabilities
      ?? [],
    operations: stringList(input.operations, 'operations') ?? existingModel?.operations ?? defaults.operations,
    roles: stringList(input.roles, 'roles') ?? existingModel?.roles ?? [],
    profile: input.profile ?? existingModel?.profile ?? {},
    portrait: input.portrait === undefined
      ? existingModel?.portrait ?? initialPortrait(input.displayName ?? modelId)
      : normalizePortrait(input.portrait),
  }

  const ops: SettingsPathOp[] = [
    ...Object.entries(connectionFields)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => ({ op: 'set' as const, path: ['connections', connectionId, field], value })),
    ...Object.entries(modelFields)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => ({ op: 'set' as const, path: ['models', id, field], value })),
  ]
  await ctx.settings.mutate(TASK_MODEL_SETTINGS_NAMESPACE, ops, descriptor.revision)

  const effectiveCredentialRef = credential ?? existingConnection?.credentialRef
  const effectiveNamedCredentialRefs = credentialRefs ?? existingConnection?.credentialRefs
  const effectiveConnection = {
    provider,
    ...(effectiveCredentialRef === undefined ? {} : { credentialRef: effectiveCredentialRef }),
    ...(effectiveNamedCredentialRefs === undefined ? {} : { credentialRefs: effectiveNamedCredentialRefs }),
  }
  const effectiveCredentialNames = input.credentialNames ?? existingModel?.credentialNames
  const selectedRefs = selectedCredentialRefs(effectiveConnection, effectiveCredentialNames)
  const status = selectedRefs.credentialRef === undefined ? undefined : await credentialStatus(ctx, selectedRefs.credentialRef)
  const statuses = await namedCredentialStatuses(ctx, selectedRefs.credentialRefs)
  const requiredAdapter = optionalText(input.runtimeAdapter) ?? existingModel?.runtimeAdapter
  const missingRefs = [
    ...(status?.configured === false ? [status.ref] : []),
    ...Object.values(statuses ?? {}).filter(item => !item.configured).map(item => item.ref),
  ]
  return {
    id,
    registered: true,
    callable: false,
    task: input.task,
    connection: connectionId,
    provider,
    model: modelId,
    ...(requiredAdapter === undefined ? {} : { requiredAdapter }),
    ...(status === undefined ? {} : { credential: status }),
    ...(statuses === undefined ? {} : { credentials: statuses }),
    settingsNs: TASK_MODEL_SETTINGS_NAMESPACE,
    settingsPath: ['models', id],
    next: missingRefs.length > 0
      ? `Store ${[...new Set(missingRefs)].join(', ')} in the secure multi-model-provider credential fields; do not paste secrets into chat.`
      : requiredAdapter === undefined
        ? 'The route is registered. Install and declare a compatible runtime adapter before invoking it.'
        : `The route is registered. Runtime adapter '${requiredAdapter}' is still required for invocation.`,
  }
}

function catalogURL(connection: TaskModelRegistryConfig['connections'][string]): string {
  if (connection.catalogEndpoint !== undefined) return connection.catalogEndpoint
  if (connection.baseURL === undefined) {
    throw new ModelManagerError('connection declares neither catalogEndpoint nor baseURL', 'TASK_MODEL_CATALOG_UNAVAILABLE')
  }
  return `${connection.baseURL.replace(/\/+$/, '')}/models`
}

export async function discoverTaskModels(
  ctx: Context,
  input: DiscoverTaskModelsInput,
  signal: AbortSignal = AbortSignal.timeout(15_000),
): Promise<Record<string, unknown>> {
  const connectionId = nonBlank(input.connection, 'connection')
  const descriptor = requiredDescriptor(ctx)
  const config = resolvedConfig(descriptor)
  const connection = config.connections[connectionId]
  if (connection === undefined) throw new ModelManagerError(`unknown connection '${connectionId}'`, 'UNKNOWN_TASK_MODEL_CONNECTION')
  const endpoint = catalogURL(connection)
  const credentialName = optionalText(connection.catalogCredentialName)
  let authorization: string | undefined
  if (credentialName !== undefined) {
    const ref = credentialName === 'default'
      ? connection.credentialRef
      : connection.credentialRefs?.[credentialName]
    if (ref === undefined) {
      throw new ModelManagerError(
        `catalog credential slot '${credentialName}' is not configured on connection '${connectionId}'`,
        'TASK_MODEL_CATALOG_CREDENTIAL_UNDECLARED',
      )
    }
    const resolved = await ctx.credentials.resolve(credentialRef(ref))
    if (resolved === undefined) {
      throw new ModelManagerError(
        `credential reference '${ref}' required by connection '${connectionId}' is not configured`,
        'TASK_MODEL_CREDENTIAL_MISSING',
      )
    }
    authorization = `Bearer ${resolved.value}`
  }
  const started = Date.now()
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: authorization === undefined ? {} : { Authorization: authorization },
    signal,
  })
  if (!response.ok) {
    throw new ModelManagerError(
      `model catalog request failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`,
      'TASK_MODEL_CATALOG_REQUEST_FAILED',
    )
  }
  const body = await response.json() as {
    data?: Array<{ id?: unknown; owned_by?: unknown }>
    models?: Array<string | { id?: unknown; name?: unknown; owned_by?: unknown }>
  }
  const rows = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : []
  const registrations = Object.entries(config.models)
    .filter(([, model]) => model.connection === connectionId)
  const models = rows.map((row) => {
    if (typeof row === 'string') return { id: row }
    const name = 'name' in row ? row.name : undefined
    return {
      id: typeof row.id === 'string' ? row.id : typeof name === 'string' ? name : '',
      ...(typeof row.owned_by === 'string' ? { ownedBy: row.owned_by } : {}),
    }
  })
    .filter((row): row is { id: string; ownedBy?: string } => row.id !== '')
    .map(row => {
      const registered = registrations.find(([, model]) => model.model === row.id)
      return {
        ...row,
        registered: registered !== undefined,
        ...(registered === undefined ? {} : { routeId: registered[0], enabled: registered[1].enabled !== false }),
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id))
  return {
    connection: connectionId,
    provider: connection.provider,
    endpoint,
    latencyMs: Date.now() - started,
    count: models.length,
    models,
    note: 'Discovery is advisory and never registers or enables models automatically.',
  }
}

export async function selectTaskModels(
  ctx: Context,
  input: SelectTaskModelsInput,
): Promise<Record<string, unknown>> {
  const connectionId = nonBlank(input.connection, 'connection')
  const descriptor = requiredDescriptor(ctx)
  const config = resolvedConfig(descriptor)
  if (config.connections[connectionId] === undefined) {
    throw new ModelManagerError(`unknown connection '${connectionId}'`, 'UNKNOWN_TASK_MODEL_CONNECTION')
  }
  const ids = stringList(input.ids, 'ids') ?? []
  const routes = Object.entries(config.models).filter(([, model]) => model.connection === connectionId)
  const routeIds = new Set(routes.map(([id]) => id))
  for (const id of ids) {
    if (!routeIds.has(id)) {
      throw new ModelManagerError(
        `task model '${id}' is not registered on connection '${connectionId}'`,
        'INVALID_TASK_MODEL_SELECTION',
      )
    }
  }
  const selected = new Set(ids)
  const ops: SettingsPathOp[] = routes.map(([id]) => ({
    op: 'set' as const,
    path: ['models', id, 'enabled'],
    value: selected.has(id),
  }))
  if (ops.length > 0) await ctx.settings.mutate(TASK_MODEL_SETTINGS_NAMESPACE, ops, descriptor.revision)
  return {
    connection: connectionId,
    selected: ids,
    disabled: routes.map(([id]) => id).filter(id => !selected.has(id)),
    allDisabled: ids.length === 0,
    note: ids.length === 0
      ? 'All registered models on this connection are explicitly disabled; no fallback selection was applied.'
      : 'Only the selected registered routes are enabled on this connection.',
  }
}

export async function listTaskModels(
  ctx: Context,
  input: ListTaskModelsInput = {},
): Promise<Record<string, unknown>> {
  const requestedId = optionalText(input.id)
  const provider = optionalText(input.provider)
  const descriptor = requiredDescriptor(ctx)
  const config = resolvedConfig(descriptor)
  if (requestedId !== undefined && config.models[requestedId] === undefined) {
    throw new ModelManagerError(`unknown task model '${requestedId}'`, 'UNKNOWN_TASK_MODEL')
  }

  const userModels = typeof descriptor.user === 'object' && descriptor.user !== null && !Array.isArray(descriptor.user)
    ? (descriptor.user as { models?: Record<string, unknown> }).models ?? {}
    : {}
  const models: Array<Record<string, unknown> & { readonly task: TaskModelTask }> = []
  for (const [id, model] of Object.entries(config.models)) {
    if (requestedId !== undefined && id !== requestedId) continue
    if (input.task !== undefined && model.task !== input.task) continue
    const connection = config.connections[model.connection]
    if (connection === undefined) continue
    if (provider !== undefined && connection.provider !== provider) continue
    const selectedRefs = selectedCredentialRefs(connection, model.credentialNames)
    const status = selectedRefs.credentialRef === undefined
      ? undefined
      : await credentialStatus(ctx, selectedRefs.credentialRef)
    const statuses = await namedCredentialStatuses(ctx, selectedRefs.credentialRefs)
    const credentialReady = status?.configured !== false
      && Object.values(statuses ?? {}).every(item => item.configured)
    const runtime = (ctx as Context & { taskModelRuntime?: { hasAdapter(id: string | undefined, route?: ResolvedTaskModelRoute): boolean } }).taskModelRuntime
    const route: ResolvedTaskModelRoute = { id, connection, registration: model }
    const adapterAvailable = runtime?.hasAdapter(model.runtimeAdapter, route) ?? false
    const enabled = model.enabled !== false
    const callable = enabled && adapterAvailable && credentialReady
    models.push({
      id,
      enabled,
      provider: connection.provider,
      connection: model.connection,
      model: model.model,
      displayName: model.displayName ?? model.model,
      task: model.task,
      input: [...model.input],
      output: [...model.output],
      execution: model.execution,
      capabilities: [...(model.capabilities ?? [])],
      operations: [...model.operations],
      roles: [...model.roles],
      registration: userModels[id] === undefined ? 'built-in' : 'user',
      availability: {
        status: callable ? 'callable' : 'registered-only',
        callable,
        ...(model.runtimeAdapter === undefined ? {} : { requiredAdapter: model.runtimeAdapter }),
        reason: callable
          ? `Runtime adapter '${model.runtimeAdapter}' is available and credential references are configured.`
          : !enabled
          ? 'The route is registered but explicitly disabled by the current model selection.'
          : model.runtimeAdapter === undefined
          ? 'No runtime adapter contract is declared for this route.'
          : !adapterAvailable
            ? `Registration is present, but runtime adapter '${model.runtimeAdapter}' is unavailable.`
            : 'Runtime adapter is available, but one or more credential references are not configured.',
      },
      connectionProfile: {
        displayName: connection.displayName ?? connection.provider,
        ...(connection.baseURL === undefined ? {} : { baseURL: connection.baseURL }),
        ...(status === undefined ? {} : { credential: status }),
        ...(statuses === undefined ? {} : { credentials: statuses }),
        ...(connection.profile === undefined ? {} : { metadata: connection.profile }),
      },
      ...(input.includeProfile === true ? { profile: model.profile } : {}),
      portrait: model.portrait === undefined ? undefined : {
        summary: model.portrait.summary,
        specialties: model.portrait.specialties,
        speedClass: model.portrait.performance.speedClass,
        pricingRates: model.portrait.pricing.rates.length,
        validation: model.portrait.validation,
      },
    })
  }

  const counts = Object.fromEntries(TASK_MODEL_TASKS.map(task => [task, models.filter(model => model.task === task).length]))
  return {
    models,
    count: models.length,
    enabledCount: models.filter(model => model.enabled === true).length,
    counts,
    defaults: config.defaults,
    settingsNs: TASK_MODEL_SETTINGS_NAMESPACE,
    note: 'Task-model registration is catalog metadata. A runtime adapter must separately claim and execute each route.',
  }
}
