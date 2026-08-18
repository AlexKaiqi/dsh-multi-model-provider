import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { settingsNamespace, type SettingsDescriptor, type SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { ModelManagerError } from './operations.ts'
import {
  MODEL_EXECUTION_MODES,
  MODEL_MODALITIES,
  TASK_MODEL_TASKS,
  type CredentialStatus,
  type ListTaskModelsInput,
  type ModelExecutionMode,
  type ModelModality,
  type RegisterTaskModelInput,
  type TaskModelRegistryConfig,
  type TaskModelTask,
} from './types.ts'

export const TASK_MODEL_SETTINGS_NAMESPACE = settingsNamespace('multi-model-provider')

const modalitySchema = z.union(MODEL_MODALITIES)
const taskSchema = z.union(TASK_MODEL_TASKS)
const executionSchema = z.union(MODEL_EXECUTION_MODES)

const connectionSchema = z.object({
  provider: z.string().required().description('Provider family, for example openai.'),
  displayName: z.string().description('Human-readable connection name.'),
  credentialRef: z.string().role('credential-ref').description('Secure credential reference; never the credential value.'),
  baseURL: z.string().description('Optional absolute API base URL.'),
}).description('Reusable provider connection and authentication reference.')

const taskModelSchema = z.object({
  connection: z.string().required().description('Key in the connections dictionary.'),
  model: z.string().required().description('Exact model id accepted by the provider.'),
  displayName: z.string().description('Human-readable model name.'),
  task: taskSchema.required().description('Semantic task; language models remain in llm-pi-ai.'),
  runtimeAdapter: z.string().description('Adapter contract required to execute this route.'),
  input: z.array(modalitySchema).default([]).description('Accepted input modalities.'),
  output: z.array(modalitySchema).default([]).description('Produced output modalities or data shapes.'),
  execution: executionSchema.default('request-response').description('Invocation lifecycle.'),
  operations: z.array(z.string()).default([]).description('Provider operations such as generate, edit, or transcribe.'),
  roles: z.array(z.string()).default([]).description('Routing roles this model may fill.'),
  profile: z.dict(z.any()).default({}).description('Non-secret provider-specific capability metadata.'),
}).description('A registered task-model route. Registration does not make it callable by itself.')

export const TASK_MODEL_REGISTRY_SCHEMA = z.object({
  connections: z.dict(connectionSchema).default({}).description('Reusable endpoint and credential-reference profiles.'),
  models: z.dict(taskModelSchema).default({}).description('Image, audio, video, embedding, and reranking model routes.'),
  defaults: z.dict(z.string(), taskSchema)
    .default({} as Record<TaskModelTask, string>)
    .description('Optional default route id for each task.'),
}) as z<TaskModelRegistryConfig>

export const BUILTIN_TASK_MODEL_REGISTRY: TaskModelRegistryConfig = {
  connections: {
    openai: {
      provider: 'openai',
      displayName: 'OpenAI',
      credentialRef: 'OPENAI_API_KEY',
      baseURL: 'https://api.openai.com/v1',
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
      operations: ['generate', 'edit'],
      roles: ['image-generator'],
      profile: {},
    },
  },
  defaults: {},
}

const TASK_DEFAULTS: Record<TaskModelTask, {
  input: readonly ModelModality[]
  output: readonly ModelModality[]
  execution: ModelExecutionMode
  operations: readonly string[]
}> = {
  'image-generation': { input: ['text'], output: ['image'], execution: 'request-response', operations: ['generate'] },
  'speech-synthesis': { input: ['text'], output: ['audio'], execution: 'streaming', operations: ['synthesize'] },
  transcription: { input: ['audio'], output: ['text'], execution: 'request-response', operations: ['transcribe'] },
  'audio-generation': { input: ['text'], output: ['audio'], execution: 'async-job', operations: ['generate'] },
  'video-generation': { input: ['text', 'image'], output: ['video'], execution: 'async-job', operations: ['generate'] },
  embedding: { input: ['text'], output: ['vector'], execution: 'request-response', operations: ['embed'] },
  reranking: { input: ['text'], output: ['data'], execution: 'request-response', operations: ['rerank'] },
}

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
  if (connection.credentialRef !== undefined) credentialRef(nonBlank(connection.credentialRef, `connections.${id}.credentialRef`))
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
  const baseURL = absoluteHttpUrl(input.baseURL, 'baseURL')
  const defaults = TASK_DEFAULTS[input.task]
  const existingModel = config.models[id]

  const connectionFields: Record<string, unknown> = {
    provider: nonBlank(provider, 'provider'),
    ...(input.connectionDisplayName === undefined ? {} : { displayName: optionalText(input.connectionDisplayName) }),
    ...(credential === undefined ? {} : { credentialRef: credential }),
    ...(baseURL === undefined ? {} : { baseURL }),
  }
  const modelFields: Record<string, unknown> = {
    connection: connectionId,
    model: modelId,
    task: input.task,
    ...(input.displayName === undefined ? {} : { displayName: optionalText(input.displayName) }),
    ...(input.runtimeAdapter === undefined ? {} : { runtimeAdapter: optionalText(input.runtimeAdapter) }),
    input: stringList(input.input, 'input') ?? existingModel?.input ?? defaults.input,
    output: stringList(input.output, 'output') ?? existingModel?.output ?? defaults.output,
    execution: input.execution ?? existingModel?.execution ?? defaults.execution,
    operations: stringList(input.operations, 'operations') ?? existingModel?.operations ?? defaults.operations,
    roles: stringList(input.roles, 'roles') ?? existingModel?.roles ?? [],
    profile: input.profile ?? existingModel?.profile ?? {},
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

  const effectiveCredential = credential ?? existingConnection?.credentialRef
  const status = effectiveCredential === undefined ? undefined : await credentialStatus(ctx, effectiveCredential)
  const requiredAdapter = optionalText(input.runtimeAdapter) ?? existingModel?.runtimeAdapter
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
    settingsNs: TASK_MODEL_SETTINGS_NAMESPACE,
    settingsPath: ['models', id],
    next: status?.configured === false
      ? `Store ${status.ref} in the secure multi-model-provider credential field; do not paste the key into chat.`
      : requiredAdapter === undefined
        ? 'The route is registered. Install and declare a compatible runtime adapter before invoking it.'
        : `The route is registered. Runtime adapter '${requiredAdapter}' is still required for invocation.`,
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
    const status = connection.credentialRef === undefined
      ? undefined
      : await credentialStatus(ctx, connection.credentialRef)
    models.push({
      id,
      provider: connection.provider,
      connection: model.connection,
      model: model.model,
      displayName: model.displayName ?? model.model,
      task: model.task,
      input: [...model.input],
      output: [...model.output],
      execution: model.execution,
      operations: [...model.operations],
      roles: [...model.roles],
      registration: userModels[id] === undefined ? 'built-in' : 'user',
      availability: {
        status: 'registered-only',
        callable: false,
        ...(model.runtimeAdapter === undefined ? {} : { requiredAdapter: model.runtimeAdapter }),
        reason: model.runtimeAdapter === undefined
          ? 'No runtime adapter contract is declared for this route.'
          : `Registration is present, but runtime adapter '${model.runtimeAdapter}' is not provided by this plugin.`,
      },
      connectionProfile: {
        displayName: connection.displayName ?? connection.provider,
        ...(connection.baseURL === undefined ? {} : { baseURL: connection.baseURL }),
        ...(status === undefined ? {} : { credential: status }),
      },
      ...(input.includeProfile === true ? { profile: model.profile } : {}),
    })
  }

  const counts = Object.fromEntries(TASK_MODEL_TASKS.map(task => [task, models.filter(model => model.task === task).length]))
  return {
    models,
    count: models.length,
    counts,
    defaults: config.defaults,
    settingsNs: TASK_MODEL_SETTINGS_NAMESPACE,
    note: 'Task-model registration is catalog metadata. A runtime adapter must separately claim and execute each route.',
  }
}
