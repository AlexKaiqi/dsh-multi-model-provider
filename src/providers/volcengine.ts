import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { SettingsPathOp } from '@deepseek-ai/dsh-settings'
import { configureModelRoute, ModelManagerError, PI_AI_SETTINGS_NAMESPACE } from '../operations.ts'
import { listTaskModels } from '../registry.ts'
import type { ModelProfileInput, SelectVolcengineLanguageModelsInput } from '../types.ts'

export const VOLCENGINE_PROVIDER = 'volcengine'
export const VOLCENGINE_AGENT_PLAN_PROVIDER = 'volcengine-agent-plan'
/** Agent Plan and pay-as-you-go are independent routes and may coexist. */
export const VOLCENGINE_ARK_PLAN_BASE_URL = 'https://ark.cn-beijing.volces.com/api/plan/v3'
export const VOLCENGINE_ARK_PAYG_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3'
export const VOLCENGINE_ARK_BASE_URL = VOLCENGINE_ARK_PAYG_BASE_URL
export const VOLCENGINE_ARK_API = 'openai-completions'
export const VOLCENGINE_ARK_API_KEY = 'ARK_API_KEY'

const CREDENTIALS = {
  arkApiKey: VOLCENGINE_ARK_API_KEY,
  doubaoApiKey: 'DOUBAO_API_KEY',
} as const

export const LEGACY_VOLCENGINE_ARK_API_KEY = 'VOLCENGINE_API_KEY'

/** Copy the pre-ARK credential reference forward without exposing or deleting its value. */
export async function migrateLegacyVolcengineCredential(ctx: Context): Promise<boolean> {
  const target = credentialRef(CREDENTIALS.arkApiKey)
  const current = await ctx.credentials.describe(target)
  if (current.configured) return false

  const legacy = credentialRef(LEGACY_VOLCENGINE_ARK_API_KEY)
  const legacyStatus = await ctx.credentials.describe(legacy)
  if (!legacyStatus.configured) return false
  if (!current.writable) {
    throw new ModelManagerError(
      `${CREDENTIALS.arkApiKey} is read-only; cannot migrate ${LEGACY_VOLCENGINE_ARK_API_KEY}`,
      'VOLCENGINE_CREDENTIAL_MIGRATION_UNAVAILABLE',
    )
  }

  const resolved = await ctx.credentials.resolve(legacy)
  if (resolved === undefined) return false
  await ctx.credentials.set(target, resolved.value)
  return true
}

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function descriptor(ctx: Context, ns: string) {
  return ctx.settings.describe({ redactSecrets: true }).find(item => item.ns === ns)
}

function selectedLanguageModels(ctx: Context, provider: string): unknown[] {
  const root = object(descriptor(ctx, PI_AI_SETTINGS_NAMESPACE)?.value)
  const providers = object(root?.providers)
  const profile = object(providers?.[provider])
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
  const listedTasks = await listTaskModels(ctx, { provider: 'doubao-speech' })
  const taskRoutes = (Array.isArray(listedTasks.models) ? listedTasks.models : []).map(value => {
    const route = object(value) ?? {}
    const availability = object(route.availability) ?? {}
    return {
      id: route.id,
      model: route.model,
      task: route.task,
      enabled: route.enabled,
      runtimeAdapter: availability.requiredAdapter,
      callability: availability.callable === true,
      availability,
    }
  })
  const arkConfigured = (credentials.arkApiKey as { configured: boolean }).configured
  return {
    provider: VOLCENGINE_PROVIDER,
    displayName: '火山方舟',
    credentials,
    ark: {
      api: VOLCENGINE_ARK_API,
      discovery: arkConfigured ? discovery.error === undefined ? 'ok' : 'failed' : 'credential-required',
      ...(discovery.error === undefined ? {} : { error: discovery.error }),
      availableModels: discovery.models,
      routes: {
        payAsYouGo: {
          provider: VOLCENGINE_PROVIDER,
          displayName: '火山方舟（按量计费）',
          baseURL: VOLCENGINE_ARK_PAYG_BASE_URL,
          catalogEndpoint: `${VOLCENGINE_ARK_PAYG_BASE_URL}/models`,
          selectedLanguageModels: selectedLanguageModels(ctx, VOLCENGINE_PROVIDER),
        },
        agentPlan: {
          provider: VOLCENGINE_AGENT_PLAN_PROVIDER,
          displayName: '火山方舟 Agent Plan',
          baseURL: VOLCENGINE_ARK_PLAN_BASE_URL,
          catalogEndpoint: `${VOLCENGINE_ARK_PLAN_BASE_URL}/models`,
          selectedLanguageModels: selectedLanguageModels(ctx, VOLCENGINE_AGENT_PLAN_PROVIDER),
        },
      },
    },
    relatedTaskProvider: {
      provider: 'doubao-speech',
      displayName: '豆包语音',
      credentialRef: CREDENTIALS.doubaoApiKey,
      taskRoutes,
    },
    routingRules: {
      languageAndVlm: 'Select payg or agent-plan independently with select_volcengine_language_models; both become ordinary llm-pi-ai providers in the Agent model selector.',
      billingIsolation: 'provider=volcengine uses /api/v3; provider=volcengine-agent-plan uses /api/plan/v3. Neither route silently falls back to the other.',
      imageVideoAudioSpeech: 'Register/select task routes, then use invoke_task_model for callable non-realtime routes; realtime-speech routes use realtimeModelRuntime.',
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
  const mode = input.mode ?? 'payg'
  const plan = mode === 'agent-plan'
  const provider = plan ? VOLCENGINE_AGENT_PLAN_PROVIDER : VOLCENGINE_PROVIDER
  const baseURL = plan ? VOLCENGINE_ARK_PLAN_BASE_URL : VOLCENGINE_ARK_PAYG_BASE_URL
  const displayName = plan ? '火山方舟 Agent Plan' : '火山方舟（按量计费）'
  if (models.length === 0) {
    const current = descriptor(ctx, PI_AI_SETTINGS_NAMESPACE)
    if (current === undefined) throw new ModelManagerError('llm-pi-ai settings are unavailable', 'MODEL_SETTINGS_UNAVAILABLE')
    const ops: SettingsPathOp[] = [{ op: 'unset', path: ['providers', provider] }]
    await ctx.settings.mutate(PI_AI_SETTINGS_NAMESPACE, ops, current.revision)
    return {
      provider,
      billingMode: mode,
      selected: [],
      allDisabled: true,
      note: `The ${displayName} LLM route was removed. The other billing route and task-model selections are unchanged.`,
    }
  }
  const result = await configureModelRoute(ctx, {
    provider,
    displayName,
    api: VOLCENGINE_ARK_API,
    baseURL,
    apiKeyEnv: CREDENTIALS.arkApiKey,
    models,
  })
  return {
    ...result,
    selected: models.map(model => model.id),
    allDisabled: false,
    billingMode: mode,
    usage: `Use provider=${provider} in the session model selector. This route stays pinned to ${baseURL} and never falls back to the other billing route.`,
  }
}
