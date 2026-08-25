import { lookup } from 'node:dns/promises'
import type { LookupAddress } from 'node:dns'
import { isIP } from 'node:net'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { settingsNamespace, type SettingsDescriptor, type SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { ModelManagerError } from './operations.ts'
import { initialPortrait, normalizePortrait, normalizeStoredPortrait } from './portrait-core.ts'
import { builtinTaskPortrait } from './portraits/builtin-task.ts'
import {
  DOUBAO_REALTIME_BASE_URL,
  DOUBAO_SPEECH_CATALOG,
  DOUBAO_SPEECH_LEGACY_CATALOG,
  DOUBAO_SPEECH_PROVIDER,
} from './doubao-speech-catalog.ts'
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

const SECRET_METADATA_KEY = /(?:api[-_]?key|access[-_]?token|refresh[-_]?token|secret|password|credential)/i
const SECRET_METADATA_VALUE = /^(?:bearer\s+|sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.)/i

function assertSecretFreeMetadata(value: unknown, name: string, depth = 0): void {
  if (depth > 8) throw new ModelManagerError(`${name} is nested too deeply`, 'INVALID_TASK_MODEL_CONFIGURATION')
  if (typeof value === 'string') {
    if (SECRET_METADATA_VALUE.test(value.trim())) {
      throw new ModelManagerError(`${name} appears to contain a credential value; store only credential references`, 'SECRET_VALUE_NOT_ALLOWED')
    }
    return
  }
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    if (value.length > 1_000) throw new ModelManagerError(`${name} is too large`, 'INVALID_TASK_MODEL_CONFIGURATION')
    value.forEach((item, index) => assertSecretFreeMetadata(item, `${name}[${index}]`, depth + 1))
    return
  }
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length > 200) throw new ModelManagerError(`${name} is too large`, 'INVALID_TASK_MODEL_CONFIGURATION')
  for (const [key, item] of entries) {
    if (SECRET_METADATA_KEY.test(key)) {
      throw new ModelManagerError(`${name}.${key} is secret-shaped; profiles must contain non-secret metadata only`, 'SECRET_VALUE_NOT_ALLOWED')
    }
    assertSecretFreeMetadata(item, `${name}.${key}`, depth + 1)
  }
}

const connectionSchema = z.object({
  provider: z.string().required().description('Provider family, for example openai.'),
  displayName: z.string().description('Human-readable connection name.'),
  apiKeyEnv: z.string().role('credential-ref').description('Conventional single API-key reference used by the Models UI.'),
  credentialRef: z.string().role('credential-ref').description('Secure credential reference; never the credential value.'),
  credentialRefs: z.dict(z.string().role('credential-ref')).description('Named secure credential references for multi-credential providers.'),
  baseURL: z.string().description('Optional absolute API base URL.'),
  models: z.array(z.object({
    id: z.string().required(),
    name: z.string(),
    contextWindow: z.number(),
    maxTokens: z.number(),
  })).default([]).description('Provider-local model directory.'),
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
  providerProfiles: z.dict(connectionSchema).default({})
    .description('Provider profiles added through the Models settings page.'),
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
    minimax: {
      provider: 'minimax',
      displayName: 'MiniMax',
      apiKeyEnv: 'MINIMAX_API_KEY',
      credentialRef: 'MINIMAX_API_KEY',
      baseURL: 'https://api.minimax.io',
      profile: { product: 'minimax-multimodal-api' },
    },
    google: {
      provider: 'google',
      displayName: 'Google Gemini API',
      apiKeyEnv: 'GEMINI_API_KEY',
      credentialRef: 'GEMINI_API_KEY',
      baseURL: 'https://generativelanguage.googleapis.com',
      profile: { product: 'gemini-generative-media' },
    },
    [DOUBAO_SPEECH_PROVIDER]: {
      provider: DOUBAO_SPEECH_PROVIDER,
      displayName: '豆包语音',
      apiKeyEnv: 'DOUBAO_API_KEY',
      credentialRef: 'DOUBAO_API_KEY',
      credentialRefs: {
        apiKey: 'DOUBAO_API_KEY',
        // Legacy slots keep pre-Realtime settings structurally valid until
        // the provider is saved or removed through the new single-key UI.
        speechAppId: 'DOUBAO_APPID',
        speechToken: 'DOUBAO_TOKEN',
        realtimeApiKey: 'DOUBAO_API_KEY',
      },
      profile: {
        kind: 'realtime-speech',
        adapter: 'dsh-realtime-voice',
        protocol: 'doubao-realtime-duplex',
        protocolModel: '1.2.6.1',
        modelOption: 'voice',
        product: 'doubao-speech',
        speechResources: 'documented-resource-ids',
      },
      baseURL: DOUBAO_REALTIME_BASE_URL,
      models: [],
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
    'openai/sora-2': {
      enabled: false,
      connection: 'openai',
      model: 'sora-2',
      displayName: 'Sora 2 (Legacy)',
      task: 'video-generation',
      runtimeAdapter: 'openai-videos',
      input: ['text', 'image'],
      output: ['video', 'audio'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate'],
      roles: ['legacy-synced-audio-video'],
      profile: { maxDurationSeconds: 12, resolutions: ['720x1280', '1280x720'] },
    },
    'openai/sora-2-pro': {
      enabled: false,
      connection: 'openai',
      model: 'sora-2-pro',
      displayName: 'Sora 2 Pro (Legacy)',
      task: 'video-generation',
      runtimeAdapter: 'openai-videos',
      input: ['text', 'image'],
      output: ['video', 'audio'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate'],
      roles: ['legacy-high-detail-synced-audio-video'],
      profile: { maxDurationSeconds: 12, resolutions: ['720x1280', '1280x720', '1024x1792', '1792x1024', '1080x1920', '1920x1080'] },
    },
    'google/gemini-omni-flash-preview': {
      connection: 'google',
      model: 'gemini-omni-flash-preview',
      displayName: 'Gemini Omni Flash Preview',
      task: 'video-generation',
      runtimeAdapter: 'google-interactions-video',
      input: ['text', 'image', 'video', 'audio'],
      output: ['video'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate', 'edit'],
      roles: ['default-video-generator', 'conversational-video-editor'],
      profile: { preview: true, maxDurationSeconds: 10, resolution: '720p', frameRate: 24, contextWindow: 1_048_576 },
    },
    'google/veo-3.1-generate-preview': {
      connection: 'google',
      model: 'veo-3.1-generate-preview',
      displayName: 'Veo 3.1 Preview',
      task: 'video-generation',
      runtimeAdapter: 'google-veo',
      input: ['text', 'image', 'video'],
      output: ['video'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate', 'extend'],
      roles: ['quality-first-video', 'frame-controlled-video'],
      profile: { preview: true, durationSeconds: 8, nativeAudio: true, resolutions: ['720p', '1080p', '4K'] },
    },
    'google/veo-3.1-fast-generate-preview': {
      connection: 'google',
      model: 'veo-3.1-fast-generate-preview',
      displayName: 'Veo 3.1 Fast Preview',
      task: 'video-generation',
      runtimeAdapter: 'google-veo',
      input: ['text', 'image', 'video'],
      output: ['video'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate', 'extend'],
      roles: ['fast-video', 'production-video'],
      profile: { preview: true, durationSeconds: 8, nativeAudio: true, resolutions: ['720p', '1080p', '4K'] },
    },
    'google/veo-3.1-lite-generate-preview': {
      connection: 'google',
      model: 'veo-3.1-lite-generate-preview',
      displayName: 'Veo 3.1 Lite Preview',
      task: 'video-generation',
      runtimeAdapter: 'google-veo',
      input: ['text', 'image', 'video'],
      output: ['video'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate', 'edit'],
      roles: ['cost-efficient-video', 'bulk-video'],
      profile: { preview: true, nativeAudio: true, resolutions: ['720p', '1080p'] },
    },
    'minimax/MiniMax-H3': {
      connection: 'minimax',
      model: 'MiniMax-H3',
      displayName: 'MiniMax H3',
      task: 'video-generation',
      runtimeAdapter: 'minimax-video-v2',
      input: ['text', 'image', 'video', 'audio'],
      output: ['video', 'audio'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate'],
      roles: ['omni-reference-video-generator', 'video-editor'],
      profile: { apiVersion: 'v2', nativeAudio: true, maxDurationSeconds: 15, resolutions: ['768P', '2K'] },
    },
    'minimax/MiniMax-Hailuo-2.3': {
      connection: 'minimax',
      model: 'MiniMax-Hailuo-2.3',
      displayName: 'MiniMax Hailuo 2.3',
      task: 'video-generation',
      runtimeAdapter: 'minimax-video',
      input: ['text', 'image'],
      output: ['video'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate'],
      roles: ['text-to-video', 'image-to-video'],
      profile: { apiVersion: 'v1', maxDurationSeconds: 10, resolutions: ['768P', '1080P'] },
    },
    'minimax/MiniMax-Hailuo-2.3-Fast': {
      connection: 'minimax',
      model: 'MiniMax-Hailuo-2.3-Fast',
      displayName: 'MiniMax Hailuo 2.3 Fast',
      task: 'video-generation',
      runtimeAdapter: 'minimax-video',
      input: ['text', 'image'],
      output: ['video'],
      execution: 'async-job',
      capabilities: ['video.generate'],
      operations: ['generate'],
      roles: ['image-to-video', 'cost-efficient-video'],
      profile: { apiVersion: 'v1', requiresImage: true, maxDurationSeconds: 10, resolutions: ['768P', '1080P'] },
    },
    'minimax/speech-2.8-hd': {
      connection: 'minimax',
      model: 'speech-2.8-hd',
      displayName: 'MiniMax Speech 2.8 HD',
      task: 'speech-synthesis',
      runtimeAdapter: 'minimax-speech',
      input: ['text'],
      output: ['audio'],
      execution: 'streaming',
      capabilities: ['speech.synthesize.short'],
      operations: ['synthesize'],
      roles: ['quality-first-tts'],
      profile: { languages: 40, soundTags: true, maxCharacters: 10_000 },
    },
    'minimax/speech-2.8-turbo': {
      connection: 'minimax',
      model: 'speech-2.8-turbo',
      displayName: 'MiniMax Speech 2.8 Turbo',
      task: 'speech-synthesis',
      runtimeAdapter: 'minimax-speech',
      input: ['text'],
      output: ['audio'],
      execution: 'streaming',
      capabilities: ['speech.synthesize.short'],
      operations: ['synthesize'],
      roles: ['fast-tts', 'voice-agent-tts'],
      profile: { languages: 40, soundTags: true, maxCharacters: 10_000 },
    },
    'minimax/music-3.0': {
      enabled: false,
      connection: 'minimax',
      model: 'music-3.0',
      displayName: 'MiniMax Music 3.0',
      task: 'audio-generation',
      runtimeAdapter: 'minimax-music',
      input: ['text'],
      output: ['audio'],
      execution: 'async-job',
      capabilities: ['audio.generate'],
      operations: ['generate'],
      roles: ['music-generator', 'song-generator'],
      profile: {},
    },
    'minimax/image-01': {
      connection: 'minimax',
      model: 'image-01',
      displayName: 'MiniMax Image 01',
      task: 'image-generation',
      runtimeAdapter: 'minimax-images',
      input: ['text', 'image'],
      output: ['image'],
      execution: 'request-response',
      capabilities: ['image.generate'],
      operations: ['generate'],
      roles: ['image-generator', 'subject-reference-image-generator'],
      profile: { maxImages: 9, customSize: true, seeded: true },
    },
    'openai/gpt-realtime': {
      connection: 'openai',
      model: 'gpt-realtime',
      displayName: 'GPT Realtime',
      task: 'realtime-speech',
      runtimeAdapter: 'openai-webrtc',
      input: ['text', 'audio'],
      output: ['text', 'audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: ['voice-deliberation'],
      profile: { protocol: 'openai-webrtc', voice: 'marin' },
      portrait: initialPortrait('OpenAI full-duplex Realtime speech model.'),
    },
    ...Object.fromEntries([...DOUBAO_SPEECH_LEGACY_CATALOG, ...DOUBAO_SPEECH_CATALOG].map(entry => [entry.id, {
      ...entry.registration,
      portrait: initialPortrait(entry.summary),
    }])),
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

function absoluteConnectionUrl(value: string | undefined, name: string): string | undefined {
  const normalized = optionalText(value)
  if (normalized === undefined) return undefined
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch (cause) {
    throw new ModelManagerError(`${name} must be an absolute URL`, 'INVALID_TASK_MODEL_CONFIGURATION', { cause })
  }
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) {
    throw new ModelManagerError(`${name} must use http, https, ws, or wss`, 'INVALID_TASK_MODEL_CONFIGURATION')
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
  const value = descriptor.value as TaskModelRegistryConfig
  const profiles = value.providerProfiles ?? {}
  return {
    ...value,
    connections: Object.fromEntries(Object.entries(value.connections).map(([id, connection]) => [
      id,
      profiles[id] === undefined ? connection : { ...connection, ...profiles[id] },
    ])),
  }
}

/**
 * Provider-editor model rows are an explicit route selection when they exist
 * in the user layer. The standard editor stores provider-native ids, while the
 * task registry owns stable route ids and provider metadata, so selection must
 * join across all three identities instead of expecting the ids to be equal.
 */
function providerModelSelection(
  descriptor: SettingsDescriptor,
  connectionId: string,
): ReadonlySet<string> | undefined {
  if (typeof descriptor.user !== 'object' || descriptor.user === null || Array.isArray(descriptor.user)) return undefined
  const user = descriptor.user as { providerProfiles?: unknown; connections?: unknown }
  const connections = user.providerProfiles ?? user.connections
  if (typeof connections !== 'object' || connections === null || Array.isArray(connections)) return undefined
  const connection = (connections as Record<string, unknown>)[connectionId]
  if (typeof connection !== 'object' || connection === null || Array.isArray(connection)) return undefined
  const models = (connection as { models?: unknown }).models
  if (!Array.isArray(models)) return undefined
  return new Set(models.flatMap(row => {
    if (typeof row === 'string') return row.trim() === '' ? [] : [row]
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return []
    const id = (row as { id?: unknown }).id
    return typeof id === 'string' && id.trim() !== '' ? [id] : []
  }))
}

function selectedByProviderEditor(
  selected: ReadonlySet<string>,
  routeId: string,
  model: TaskModelRegistryConfig['models'][string],
): boolean {
  const voice = typeof model.profile?.voice === 'string' ? model.profile.voice : undefined
  return selected.has(routeId) || selected.has(model.model) || (voice !== undefined && selected.has(voice))
}

function userRegisteredTaskModel(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const model = value as Record<string, unknown>
  return typeof model.connection === 'string'
    && typeof model.model === 'string'
    && typeof model.task === 'string'
}

function userSelectedTaskModel(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && (value as Record<string, unknown>).enabled === true
}

/**
 * Exact task routes that the user registered or selected for this profile.
 *
 * The merged Settings value contains the entire built-in catalog, so presence
 * in config.models alone is not evidence that a route is user configured.
 */
export function configuredTaskModelIds(ctx: Context): ReadonlySet<string> {
  const descriptor = requiredDescriptor(ctx)
  const config = resolvedConfig(descriptor)
  const user = typeof descriptor.user === 'object' && descriptor.user !== null && !Array.isArray(descriptor.user)
    ? descriptor.user as { models?: unknown }
    : {}
  const userModels = typeof user.models === 'object' && user.models !== null && !Array.isArray(user.models)
    ? user.models as Record<string, unknown>
    : {}
  const configured = new Set<string>()
  for (const [id, registration] of Object.entries(config.models)) {
    const selected = providerModelSelection(descriptor, registration.connection)
    if (userRegisteredTaskModel(userModels[id])
      || userSelectedTaskModel(userModels[id])
      || (selected !== undefined && selectedByProviderEditor(selected, id, registration))) {
      configured.add(id)
    }
  }
  return configured
}

export function resolveTaskModelRoute(ctx: Context, id: string, descriptor = requiredDescriptor(ctx)): ResolvedTaskModelRoute {
  const routeId = nonBlank(id, 'id')
  const config = resolvedConfig(descriptor)
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

export interface EffectiveTaskModelAvailability {
  readonly route: ResolvedTaskModelRoute
  readonly enabled: boolean
  readonly adapterAvailable: boolean
  readonly credentialReady: boolean
  readonly callable: boolean
  readonly credential?: CredentialStatus
  readonly credentials?: Record<string, CredentialStatus>
}

/** Authoritative effective availability after selection, adapter, and credential policy. */
export async function effectiveTaskModelAvailability(
  ctx: Context,
  routeOrId: ResolvedTaskModelRoute | string,
  descriptor = requiredDescriptor(ctx),
): Promise<EffectiveTaskModelAvailability> {
  const route = typeof routeOrId === 'string' ? resolveTaskModelRoute(ctx, routeOrId, descriptor) : routeOrId
  const selectedRefs = selectedCredentialRefs(route.connection, route.registration.credentialNames)
  const credential = selectedRefs.credentialRef === undefined
    ? undefined
    : await credentialStatus(ctx, selectedRefs.credentialRef)
  const credentials = await namedCredentialStatuses(ctx, selectedRefs.credentialRefs)
  const credentialReady = credential?.configured !== false
    && Object.values(credentials ?? {}).every(item => item.configured)
  const providerSelection = providerModelSelection(descriptor, route.registration.connection)
  const enabled = providerSelection === undefined
    ? route.registration.enabled !== false
    : selectedByProviderEditor(providerSelection, route.id, route.registration)
  const adapterAvailable = route.registration.execution === 'realtime'
    ? ctx.realtimeModelRuntime?.hasAdapter(route.registration.runtimeAdapter) ?? false
    : ctx.taskModelRuntime?.hasAdapter(route.registration.runtimeAdapter, route) ?? false
  return {
    route,
    enabled,
    adapterAvailable,
    credentialReady,
    callable: enabled && adapterAvailable && credentialReady,
    ...(credential === undefined ? {} : { credential }),
    ...(credentials === undefined ? {} : { credentials }),
  }
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
  absoluteConnectionUrl(connection.baseURL, `connections.${id}.baseURL`)
  absoluteHttpUrl(connection.catalogEndpoint, `connections.${id}.catalogEndpoint`)
  assertSecretFreeMetadata(connection.profile, `connections.${id}.profile`)
  if (connection.credentialRef !== undefined) credentialRef(nonBlank(connection.credentialRef, `connections.${id}.credentialRef`))
  const refs = namedCredentialRefs(connection.credentialRefs, `connections.${id}.credentialRefs`)
  const catalogCredentialName = optionalText(connection.catalogCredentialName)
  if (catalogCredentialName === 'default' && optionalText(connection.credentialRef) === undefined) {
    throw new ModelManagerError(
      `connections.${id}.catalogCredentialName references missing default credentialRef`,
      'INVALID_TASK_MODEL_CONFIGURATION',
    )
  }
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
  for (const [id, connection] of Object.entries(config.providerProfiles ?? {})) validateConnection(id, connection)

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
      const missing = name === 'default'
        ? connection.credentialRef === undefined
        : connection.credentialRefs?.[name] === undefined
      if (missing) {
        throw new ModelManagerError(
          `models.${id}.credentialNames references unknown connection credential slot '${name}'`,
          'INVALID_TASK_MODEL_CONFIGURATION',
        )
      }
    }
    stringList(model.operations, `models.${id}.operations`)
    stringList(model.roles, `models.${id}.roles`)
    assertSecretFreeMetadata(model.profile, `models.${id}.profile`)
    if (model.portrait !== undefined) normalizePortrait(model.portrait)
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

function catalogCredentialRef(connection: TaskModelRegistryConfig['connections'][string]): string | undefined {
  const name = optionalText(connection.catalogCredentialName)
  if (name === undefined) return undefined
  return name === 'default' ? connection.credentialRef : connection.credentialRefs?.[name]
}

function catalogOrigin(connection: TaskModelRegistryConfig['connections'][string]): string | undefined {
  try {
    return new URL(catalogURL(connection)).origin
  } catch {
    return undefined
  }
}

async function assertCatalogCredentialBinding(
  ctx: Context,
  existing: TaskModelRegistryConfig['connections'][string] | undefined,
  next: TaskModelRegistryConfig['connections'][string],
): Promise<void> {
  const nextRef = catalogCredentialRef(next)
  if (nextRef === undefined) return
  const status = await credentialStatus(ctx, nextRef)
  if (!status.configured) return
  const unchanged = existing !== undefined
    && catalogCredentialRef(existing) === nextRef
    && catalogOrigin(existing) === catalogOrigin(next)
  if (!unchanged) {
    throw new ModelManagerError(
      `configured credential '${nextRef}' cannot be rebound to a new task-catalog origin by an Agent tool; create the endpoint with an unconfigured reference, then configure it in secure Settings`,
      'TASK_MODEL_CATALOG_CREDENTIAL_REBIND_FORBIDDEN',
    )
  }
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
  const baseURL = absoluteConnectionUrl(input.baseURL, 'baseURL')
  const catalogEndpoint = absoluteHttpUrl(input.catalogEndpoint, 'catalogEndpoint')
  const catalogCredentialName = optionalText(input.catalogCredentialName)
  assertSecretFreeMetadata(input.connectionProfile, 'connectionProfile')
  assertSecretFreeMetadata(input.profile, 'profile')
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
  const nextConnection = {
    ...(existingConnection ?? {}),
    ...connectionFields,
  } as TaskModelRegistryConfig['connections'][string]
  await assertCatalogCredentialBinding(ctx, existingConnection, nextConnection)

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
  const protocol = new URL(connection.baseURL).protocol
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new ModelManagerError('connection baseURL is not an HTTP model catalog', 'TASK_MODEL_CATALOG_UNAVAILABLE')
  }
  return `${connection.baseURL.replace(/\/+$/, '')}/models`
}

function privateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127) || a >= 224
}

function privateIp(address: string): boolean {
  if (isIP(address) === 4) return privateIpv4(address)
  if (isIP(address) !== 6) return false
  const normalized = address.toLowerCase()
  if (normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (/^fe[89ab]/.test(normalized)) return true
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(normalized)?.[1]
  return mapped !== undefined && privateIpv4(mapped)
}

export async function assertSafeCatalogEndpoint(endpoint: string): Promise<void> {
  const url = new URL(endpoint)
  if (url.username !== '' || url.password !== '') {
    throw new ModelManagerError('task catalog URLs must not contain inline credentials', 'TASK_MODEL_CATALOG_ENDPOINT_FORBIDDEN')
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '')
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')
    || hostname === 'metadata.google.internal' || hostname === 'metadata') {
    throw new ModelManagerError('task catalog endpoints must not target local or metadata hosts', 'TASK_MODEL_CATALOG_ENDPOINT_FORBIDDEN')
  }
  if (isIP(hostname) !== 0 && privateIp(hostname)) {
    throw new ModelManagerError('task catalog endpoints must not target private, loopback, link-local, or multicast addresses', 'TASK_MODEL_CATALOG_ENDPOINT_FORBIDDEN')
  }
  if (!hostname.endsWith('.test') && !hostname.endsWith('.example') && isIP(hostname) === 0) {
    let addresses: LookupAddress[]
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true })
    } catch (cause) {
      throw new ModelManagerError('task catalog hostname could not be resolved safely', 'TASK_MODEL_CATALOG_ENDPOINT_UNRESOLVED', { cause })
    }
    if (addresses.length === 0 || addresses.some(item => privateIp(item.address))) {
      throw new ModelManagerError('task catalog hostname resolves to a private, loopback, link-local, or multicast address', 'TASK_MODEL_CATALOG_ENDPOINT_FORBIDDEN')
    }
  }
}

async function boundedResponseText(response: Response, maxBytes: number): Promise<string> {
  const reader = response.body?.getReader()
  if (reader === undefined) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) throw new ModelManagerError('task catalog response exceeded the size limit', 'TASK_MODEL_CATALOG_RESPONSE_TOO_LARGE')
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const joined = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(joined)
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
  await assertSafeCatalogEndpoint(endpoint)
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
    redirect: 'manual',
    signal,
  })
  if (response.status >= 300 && response.status < 400) {
    throw new ModelManagerError('model catalog redirects are not followed; configure the final trusted endpoint explicitly', 'TASK_MODEL_CATALOG_REDIRECT_FORBIDDEN')
  }
  if (!response.ok) {
    throw new ModelManagerError(
      `model catalog request failed with HTTP ${response.status}`,
      'TASK_MODEL_CATALOG_REQUEST_FAILED',
    )
  }
  const body = JSON.parse(await boundedResponseText(response, 2 * 1024 * 1024)) as {
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
  if (providerModelSelection(descriptor, connectionId) !== undefined) {
    const providerModels = routes.flatMap(([id, model]) => {
      if (!selected.has(id)) return []
      const voice = typeof model.profile?.voice === 'string' ? model.profile.voice : undefined
      return [{ id: voice ?? model.model, ...(model.displayName === undefined ? {} : { name: model.displayName }) }]
    })
    const profileRoot = typeof descriptor.user === 'object' && descriptor.user !== null
      && !Array.isArray(descriptor.user)
      && typeof (descriptor.user as { providerProfiles?: unknown }).providerProfiles === 'object'
      ? 'providerProfiles'
      : 'connections'
    ops.push({ op: 'set', path: [profileRoot, connectionId, 'models'], value: providerModels })
  }
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
    const availability = await effectiveTaskModelAvailability(ctx, { id, connection, registration: model }, descriptor)
    const {
      enabled,
      adapterAvailable,
      callable,
      credential: status,
      credentials: statuses,
    } = availability
    const bundledPortrait = builtinTaskPortrait(connection.provider, model.model, model.task)
    const portrait = model.portrait === undefined ? bundledPortrait : normalizeStoredPortrait(model.portrait)
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
      ...(portrait === undefined ? {} : {
        portraitSource: model.portrait === undefined ? 'bundled' : 'stored',
        portrait: {
          summary: portrait.summary,
          specialties: portrait.specialties,
          speedClass: portrait.performance.speedClass,
          pricingRates: portrait.pricing.rates.length,
          validation: portrait.validation,
        },
      }),
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
