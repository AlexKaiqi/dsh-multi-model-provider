import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { configureModelRoute, ModelManagerError, PI_AI_SETTINGS_NAMESPACE } from '../operations.ts'
import { TASK_MODEL_SETTINGS_NAMESPACE } from '../registry.ts'
import type { ModelProfileInput, SelectVolcengineLanguageModelsInput } from '../types.ts'

export const VOLCENGINE_PROVIDER = 'volcengine'
export const VOLCENGINE_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
export const VOLCENGINE_ARK_API = 'openai-responses'

const CREDENTIALS = {
  arkApiKey: 'ARK_API_KEY',
  doubaoApiKey: 'DOUBAO_API_KEY',
} as const

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function descriptor(ctx: Context, ns: string) {
  return ctx.settings.describe({ redactSecrets: true }).find(item => item.ns === ns)
}

function selectedLanguageModels(ctx: Context): unknown[] {
  const root = object(descriptor(ctx, PI_AI_SETTINGS_NAMESPACE)?.value)
  const providers = object(root?.providers)
  const profile = object(providers?.[VOLCENGINE_PROVIDER])
  return Array.isArray(profile?.models) ? profile.models : []
}

async function credentialStatuses(ctx: Context) {
  return Object.fromEntries(await Promise.all(Object.entries(CREDENTIALS).map(async ([slot, ref]) => {
    const status = await ctx.credentials.describe(credentialRef(ref))
    return [slot, { ref, configured: status.configured, writable: status.writable, ...(status.source === undefined ? {} : { source: status.source }) }]
  })))
}

async function discoverArkModels(ctx: Context, signal: AbortSignal): Promise<{ models: unknown[]; error?: string }> {
  const resolved = await ctx.credentials.resolve(credentialRef(CREDENTIALS.arkApiKey))
  if (resolved === undefined) return { models: [] }
  try {
    const models = await ctx.llm.discoverModels(PI_AI_SETTINGS_NAMESPACE, {
      baseURL: VOLCENGINE_ARK_BASE_URL,
      api: VOLCENGINE_ARK_API,
      apiKey: resolved.value,
      signal,
    })
    return { models: models.map(model => ({
      id: model.id,
      ...(model.name === undefined ? {} : { name: model.name }),
      ...(model.contextWindow === undefined ? {} : { contextWindow: model.contextWindow }),
      ...(model.maxTokens === undefined ? {} : { maxTokens: model.maxTokens }),
    })) }
  } catch (error) {
    return { models: [], error: error instanceof Error ? error.message : 'Ark model discovery failed' }
  }
}

/** One provider-specific orientation call: credentials, live catalog, selections, and invocation paths. */
export async function inspectVolcengineProvider(ctx: Context, signal: AbortSignal): Promise<Record<string, unknown>> {
  const credentials = await credentialStatuses(ctx)
  const discovery = await discoverArkModels(ctx, signal)
  const taskRoot = object(descriptor(ctx, TASK_MODEL_SETTINGS_NAMESPACE)?.value)
  const taskModels = object(taskRoot?.models) ?? {}
  const taskRoutes = Object.entries(taskModels)
    .filter(([, value]) => object(value)?.connection === 'doubao-speech')
    .map(([id, value]) => {
      const route = object(value)!
      return {
        id,
        model: route.model,
        task: route.task,
        enabled: route.enabled !== false,
        runtimeAdapter: route.runtimeAdapter,
        callability: ctx.taskModelRuntime.hasAdapter(typeof route.runtimeAdapter === 'string' ? route.runtimeAdapter : undefined),
      }
    })
  const arkConfigured = (credentials.arkApiKey as { configured: boolean }).configured
  return {
    provider: VOLCENGINE_PROVIDER,
    displayName: '火山方舟',
    credentials,
    ark: {
      api: VOLCENGINE_ARK_API,
      baseURL: VOLCENGINE_ARK_BASE_URL,
      catalogEndpoint: `${VOLCENGINE_ARK_BASE_URL}/models`,
      discovery: arkConfigured ? discovery.error === undefined ? 'ok' : 'failed' : 'credential-required',
      ...(discovery.error === undefined ? {} : { error: discovery.error }),
      availableModels: discovery.models,
      selectedLanguageModels: selectedLanguageModels(ctx),
    },
    relatedTaskProvider: {
      provider: 'doubao-speech',
      displayName: '豆包语音',
      credentialRef: CREDENTIALS.doubaoApiKey,
      taskRoutes,
    },
    routingRules: {
      languageAndVlm: 'Select with select_volcengine_language_models; these become ordinary llm-pi-ai models and are used through the Agent model selector.',
      imageVideoAudioSpeech: 'Register/select task routes, then invoke with invoke_task_model only when list_task_models reports callable.',
      platformEndpoint: 'When the account uses a deployed Platform endpoint, its ep-* endpoint id is the model id; do not substitute a display name.',
    },
    next: !arkConfigured
      ? 'Store ARK_API_KEY in the secure Models credentials UI, then call inspect_volcengine_provider again. Do not paste the key into chat.'
      : discovery.error !== undefined
        ? 'Fix the Ark credential or endpoint access, then retry discovery.'
        : 'Choose zero or more language/VLM entries with select_volcengine_language_models. Zero explicitly disables the Volcengine LLM route.',
  }
}

function normalizeProfiles(models: readonly ModelProfileInput[]): ModelProfileInput[] {
  const seen = new Set<string>()
  return models.map((model, index) => {
    const id = model.id.trim()
    if (id === '') throw new ModelManagerError(`models[${index}].id must not be blank`, 'INVALID_VOLCENGINE_MODEL_SELECTION')
    if (seen.has(id)) throw new ModelManagerError(`duplicate Volcengine model id '${id}'`, 'INVALID_VOLCENGINE_MODEL_SELECTION')
    seen.add(id)
    return { ...model, id }
  })
}

export async function selectVolcengineLanguageModels(ctx: Context, input: SelectVolcengineLanguageModelsInput): Promise<Record<string, unknown>> {
  const models = normalizeProfiles(input.models)
  if (models.length === 0) {
    const current = descriptor(ctx, PI_AI_SETTINGS_NAMESPACE)
    if (current === undefined) throw new ModelManagerError('llm-pi-ai settings are unavailable', 'MODEL_SETTINGS_UNAVAILABLE')
    const ops: SettingsPathOp[] = [{ op: 'unset', path: ['providers', VOLCENGINE_PROVIDER] }]
    await ctx.settings.mutate(PI_AI_SETTINGS_NAMESPACE, ops, current.revision)
    return {
      provider: VOLCENGINE_PROVIDER,
      selected: [],
      allDisabled: true,
      note: 'The Volcengine LLM route was removed. No fallback model was selected; task-model selections are unchanged.',
    }
  }
  const result = await configureModelRoute(ctx, {
    provider: VOLCENGINE_PROVIDER,
    displayName: '火山方舟',
    api: VOLCENGINE_ARK_API,
    baseURL: VOLCENGINE_ARK_BASE_URL,
    apiKeyEnv: CREDENTIALS.arkApiKey,
    models,
  })
  return {
    ...result,
    selected: models.map(model => model.id),
    allDisabled: false,
    usage: 'Create a new Agent or use the session model selector with provider=volcengine and one selected model id.',
  }
}
