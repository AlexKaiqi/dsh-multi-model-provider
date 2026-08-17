import type { Context } from '@deepseek-ai/cordis'
import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { HarnessError, ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { settingsNamespace, type SettingsDescriptor, type SettingsPathOp } from '@deepseek-ai/dsh-settings'
import type {
  ConfigureModelRouteInput,
  CredentialStatus,
  ListModelRoutesInput,
  ModelProfileInput,
  ModelRouteView,
  SelectDefaultModelInput,
} from './types.ts'

export const PI_AI_SETTINGS_NAMESPACE = settingsNamespace('llm-pi-ai')

export class ModelManagerError extends HarnessError {
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, code, options)
  }
}

function nonBlank(value: string, name: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new ModelManagerError(`${name} must not be blank`, 'INVALID_MODEL_CONFIGURATION')
  return normalized
}

function positiveInteger(value: number | undefined, name: string): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ModelManagerError(`${name} must be a positive safe integer`, 'INVALID_MODEL_CONFIGURATION')
  }
  return value
}

function optionalText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function settingsDescriptor(ctx: Context, ns: string): SettingsDescriptor | undefined {
  return ctx.settings.describe({ redactSecrets: true }).find(descriptor => descriptor.ns === ns)
}

function requiredPiAiDescriptor(ctx: Context): SettingsDescriptor {
  const descriptor = settingsDescriptor(ctx, PI_AI_SETTINGS_NAMESPACE)
  if (descriptor === undefined) {
    throw new ModelManagerError(
      'llm-pi-ai settings are unavailable; load @deepseek-ai/dsh-llm-pi-ai before multi-model-provider',
      'MODEL_SETTINGS_UNAVAILABLE',
    )
  }
  return descriptor
}

function nestedValue(root: unknown, path: readonly string[]): unknown {
  let value = root
  for (const key of path) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
    value = (value as Record<string, unknown>)[key]
  }
  return value
}

async function credentialStatus(ctx: Context, ref: string): Promise<CredentialStatus> {
  const info = await ctx.credentials.describe(credentialRef(ref))
  return {
    ref,
    configured: info.configured,
    writable: info.writable,
    ...(info.source === undefined ? {} : { source: info.source }),
  }
}

function modelProfile(input: ModelProfileInput, index: number): Record<string, unknown> {
  const id = nonBlank(input.id, `models[${index}].id`)
  const name = optionalText(input.name)
  const contextWindow = positiveInteger(input.contextWindow, `models[${index}].contextWindow`)
  const maxTokens = positiveInteger(input.maxTokens, `models[${index}].maxTokens`)
  return {
    id,
    ...(name === undefined ? {} : { name }),
    ...(contextWindow === undefined ? {} : { contextWindow }),
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(input.input === undefined || input.input.length === 0 ? {} : { input: [...input.input] }),
  }
}

function providerProfile(input: ConfigureModelRouteInput): Record<string, unknown> {
  const apiKeyEnv = optionalText(input.apiKeyEnv)
  const displayName = optionalText(input.displayName)
  const baseURL = optionalText(input.baseURL)
  if (baseURL !== undefined) {
    let parsed: URL
    try {
      parsed = new URL(baseURL)
    } catch (cause) {
      throw new ModelManagerError('baseURL must be an absolute URL', 'INVALID_MODEL_CONFIGURATION', { cause })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new ModelManagerError('baseURL must use http or https', 'INVALID_MODEL_CONFIGURATION')
    }
  }

  const models = input.models?.map(modelProfile)
  return {
    ...(apiKeyEnv === undefined ? {} : { apiKeyEnv }),
    ...(displayName === undefined ? {} : { displayName }),
    ...(input.api === undefined ? {} : { api: input.api }),
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(models === undefined || models.length === 0 ? {} : { models }),
    ...(positiveInteger(input.defaultContextWindow, 'defaultContextWindow') === undefined
      ? {}
      : { defaultContextWindow: input.defaultContextWindow }),
    ...(positiveInteger(input.defaultMaxTokens, 'defaultMaxTokens') === undefined
      ? {}
      : { defaultMaxTokens: input.defaultMaxTokens }),
  }
}

export async function configureModelRoute(ctx: Context, input: ConfigureModelRouteInput): Promise<Record<string, unknown>> {
  const provider = nonBlank(input.provider, 'provider')
  const descriptor = requiredPiAiDescriptor(ctx)
  const profile = providerProfile(input)
  const fields = Object.entries(profile)
  const ops: SettingsPathOp[] = fields.length === 0
    ? [{ op: 'set', path: ['providers', provider], value: {} }]
    : fields.map(([field, value]) => ({
      op: 'set',
      path: ['providers', provider, field],
      value,
    }))
  await ctx.settings.mutate(PI_AI_SETTINGS_NAMESPACE, ops, descriptor.revision)

  const ref = typeof profile.apiKeyEnv === 'string' ? profile.apiKeyEnv : undefined
  const credential = ref === undefined ? undefined : await credentialStatus(ctx, ref)
  const live = ctx.llm.listProviders().some(entry => entry.id === provider)
  return {
    provider,
    saved: true,
    live,
    settingsNs: PI_AI_SETTINGS_NAMESPACE,
    settingsPath: ['providers', provider],
    ...(credential === undefined ? {} : { credential }),
    requiresCredential: credential?.configured === false,
    next: credential?.configured === false
      ? `Store ${credential.ref} in the secure Models settings field; do not paste the key into chat.`
      : live
        ? 'The provider route is ready for model selection.'
        : 'The settings change was accepted; re-list routes to observe adapter activation.',
  }
}

export async function listModelRoutes(
  ctx: Context,
  input: ListModelRoutesInput = {},
): Promise<Record<string, unknown>> {
  const requestedProvider = optionalText(input.provider)
  const liveEntries = ctx.llm.listProviders()
  const liveById = new Map(liveEntries.map(entry => [entry.id, entry]))
  const directory = ctx.llm.listConfigurableProviders()
  const directoryById = new Map(directory.map(entry => [entry.provider, entry]))
  const ids = requestedProvider === undefined
    ? input.includeDormant === true
      ? [...new Set([...liveById.keys(), ...directoryById.keys()])]
      : [...liveById.keys()]
    : [requestedProvider]

  if (requestedProvider !== undefined && !liveById.has(requestedProvider) && !directoryById.has(requestedProvider)) {
    throw new ModelManagerError(`unknown provider route '${requestedProvider}'`, 'UNKNOWN_MODEL_PROVIDER')
  }

  const descriptors = new Map(ctx.settings.describe({ redactSecrets: true }).map(item => [item.ns as string, item]))
  const providers: ModelRouteView[] = []
  for (const id of ids) {
    const live = liveById.get(id)
    const configurable = directoryById.get(id)
    const profile = configurable === undefined
      ? undefined
      : nestedValue(descriptors.get(configurable.settingsNs)?.value, configurable.settingsPath)
    const ref = typeof profile === 'object' && profile !== null && !Array.isArray(profile)
      && typeof (profile as Record<string, unknown>).apiKeyEnv === 'string'
      ? (profile as Record<string, string>).apiKeyEnv
      : undefined

    let models
    let modelError
    if (live !== undefined && input.includeModels !== false) {
      try {
        models = await ctx.llm.listModels(id)
      } catch (cause) {
        modelError = cause instanceof Error ? cause.message : String(cause)
      }
    }

    providers.push({
      provider: id,
      displayName: live?.name ?? configurable?.displayName ?? id,
      status: live === undefined ? 'dormant' : 'live',
      ...(configurable?.declared === undefined ? {} : { declared: configurable.declared }),
      ...(configurable === undefined ? {} : {
        settingsNs: configurable.settingsNs,
        settingsPath: [...configurable.settingsPath],
      }),
      ...(ref === undefined ? {} : { credential: await credentialStatus(ctx, ref) }),
      ...(models === undefined ? {} : { models }),
      ...(modelError === undefined ? {} : { modelError }),
    })
  }

  return {
    providers,
    liveCount: liveEntries.length,
    dormantCount: directory.filter(entry => !liveById.has(entry.provider)).length,
  }
}

export async function selectDefaultModel(
  ctx: Context,
  input: SelectDefaultModelInput,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const provider = nonBlank(input.provider, 'provider')
  const model = nonBlank(input.model, 'model')
  const reasoningEffort = optionalText(input.reasoningEffort)
  const info = await ctx.llm.resolveModelInfo(provider, model, signal)
  if (reasoningEffort !== undefined) {
    const supported = info.reasoning?.efforts.some(effort => effort.id === reasoningEffort) === true
    if (!supported) {
      throw new ModelManagerError(
        `model '${provider}/${model}' does not advertise reasoning effort '${reasoningEffort}'`,
        'UNSUPPORTED_REASONING_EFFORT',
      )
    }
  }

  const selection: ModelSelection = {
    provider,
    model,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(reasoningEffort) }),
  }
  await ctx.agentDefaultModel.saveSelection(selection)
  return {
    selection,
    model: {
      name: info.name,
      ...(info.description === undefined ? {} : { description: info.description }),
      ...(info.inputModalities === undefined ? {} : { inputModalities: [...info.inputModalities] }),
      ...(info.context === undefined ? {} : { contextWindow: info.context.contextWindow }),
    },
    appliesTo: 'new-agents',
    currentSessionChanged: false,
  }
}
