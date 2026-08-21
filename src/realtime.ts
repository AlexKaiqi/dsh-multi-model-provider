import type { Context } from '@deepseek-ai/cordis'
import { Service } from '@deepseek-ai/cordis'
import { ModelManagerError } from './operations.ts'
import { effectiveTaskModelAvailability, resolveTaskModelRoute, TASK_MODEL_SETTINGS_NAMESPACE } from './registry.ts'
import type {
  RealtimeModelProfile,
  RealtimeModelRoute,
  RealtimeModelSessionAdapter,
  RealtimeModelTool,
  ResolvedTaskModelRoute,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    realtimeModelRuntime: RealtimeModelRuntime
  }
}

function normalizedTools(value: readonly RealtimeModelTool[] | undefined): readonly RealtimeModelTool[] {
  if (!Array.isArray(value)) return []
  return value.filter(tool => typeof tool?.name === 'string' && tool.name.trim() !== '')
}

function profileMetadata(route: ResolvedTaskModelRoute): Readonly<Record<string, unknown>> {
  const value = route.registration.profile
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/**
 * Provider-neutral runtime for registered full-duplex model sessions.
 *
 * The multi-model plugin owns route selection and credential resolution.
 * Provider plugins register wire adapters; product plugins register role
 * profiles. Neither side needs to inspect the other's settings schema.
 */
export class RealtimeModelRuntime extends Service {
  private readonly adapters = new Map<string, RealtimeModelSessionAdapter>()
  private readonly profiles = new Map<string, RealtimeModelProfile>()
  private readonly maxContextChars: number

  constructor(ctx: Context, options: { maxContextChars?: number } = {}) {
    super(ctx, 'realtimeModelRuntime')
    this.maxContextChars = Math.max(1_000, Math.min(50_000, Number(options.maxContextChars ?? 12_000)))
  }

  registerAdapter(adapter: RealtimeModelSessionAdapter): () => void {
    const id = String(adapter?.id ?? '').trim()
    if (id === '') throw new ModelManagerError('realtime adapter id must not be blank', 'INVALID_REALTIME_ADAPTER')
    if (this.adapters.has(id)) throw new ModelManagerError(`realtime adapter '${id}' is already registered`, 'DUPLICATE_REALTIME_ADAPTER')
    if (typeof adapter.session !== 'function') throw new ModelManagerError(`realtime adapter '${id}' must implement session()`, 'INVALID_REALTIME_ADAPTER')
    this.adapters.set(id, adapter)
    return () => this.adapters.delete(id)
  }

  hasAdapter(id: string | undefined): boolean {
    return id !== undefined && this.adapters.has(id)
  }

  registerProfile(profile: RealtimeModelProfile): () => void {
    const id = String(profile?.id ?? '').trim()
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) throw new ModelManagerError('realtime profile id must be lower-case hyphen-case', 'INVALID_REALTIME_PROFILE')
    if (this.profiles.has(id)) throw new ModelManagerError(`realtime profile '${id}' is already registered`, 'DUPLICATE_REALTIME_PROFILE')
    if (typeof profile.instructions !== 'function' && typeof profile.instructions !== 'string') {
      throw new ModelManagerError(`realtime profile '${id}' requires instructions`, 'INVALID_REALTIME_PROFILE')
    }
    const stored: RealtimeModelProfile = {
      id,
      instructions: profile.instructions,
      tools: normalizedTools(profile.tools),
      voice: profile.voice ?? {},
    }
    this.profiles.set(id, stored)
    return () => this.profiles.delete(id)
  }

  profile(id: string): RealtimeModelProfile {
    const profile = this.profiles.get(String(id ?? ''))
    if (profile === undefined) throw new ModelManagerError(`unknown realtime profile '${String(id ?? '')}'`, 'UNKNOWN_REALTIME_PROFILE')
    return profile
  }

  async models(): Promise<RealtimeModelRoute[]> {
    const descriptor = this.ctx.settings.describe({ redactSecrets: true })
      .find(item => item.ns === TASK_MODEL_SETTINGS_NAMESPACE)
    if (descriptor === undefined) {
      throw new ModelManagerError(
        'multi-model-provider settings are unavailable; register the plugin before listing realtime models',
        'TASK_MODEL_SETTINGS_UNAVAILABLE',
      )
    }
    const config = descriptor?.value as { models?: Record<string, { task?: string }> } | undefined
    const routes: RealtimeModelRoute[] = []
    for (const [id, registration] of Object.entries(config?.models ?? {})) {
      if (registration.task !== 'realtime-speech') continue
      const resolved = resolveTaskModelRoute(this.ctx, id, descriptor)
      const availability = await effectiveTaskModelAvailability(this.ctx, resolved, descriptor)
      // Keep credential-missing routes discoverable so the Client can explain
      // which credential is required. Opening the route still fails closed.
      if (!availability.enabled || !availability.adapterAvailable) continue
      const adapterId = resolved.registration.runtimeAdapter
      const adapter = adapterId === undefined ? undefined : this.adapters.get(adapterId)
      if (adapter === undefined) continue
      const metadata = profileMetadata(resolved)
      routes.push({
        id: resolved.id,
        model: resolved.registration.model,
        displayName: resolved.registration.displayName ?? resolved.registration.model,
        provider: resolved.connection.provider,
        adapter: adapter.id,
        protocol: adapter.protocol,
        baseURL: resolved.connection.baseURL ?? '',
        endpoint: text(metadata.endpoint) || resolved.connection.baseURL || '',
        voice: text(metadata.voice),
        source: 'task-model',
        resolved,
      })
    }
    return routes
  }

  async model(routeId?: string, protocol = ''): Promise<RealtimeModelRoute | undefined> {
    const routes = await this.models()
    const candidates = protocol === '' ? routes : routes.filter(route => route.protocol === protocol)
    const selected = String(routeId ?? '').trim()
    if (selected === '') return candidates[0]
    const route = candidates.find(candidate => candidate.id === selected)
      ?? candidates.find(candidate => candidate.model === selected)
    if (route === undefined) {
      throw new ModelManagerError(`unknown realtime model '${selected}'`, 'UNKNOWN_REALTIME_MODEL')
    }
    return route
  }

  async credential(route: RealtimeModelRoute): Promise<{ value: string, credentialRef: string }> {
    const refs: Record<string, string> = {
      ...(route.resolved.connection.credentialRef === undefined ? {} : { default: route.resolved.connection.credentialRef }),
      ...(route.resolved.connection.credentialRefs ?? {}),
    }
    try {
      const credentials = await this.ctx.taskModelRuntime.credentials(route.resolved)
      const value = credentials.apiKey ?? credentials.realtimeApiKey ?? credentials.default ?? Object.values(credentials)[0] ?? ''
      const credentialRef = refs.apiKey ?? refs.realtimeApiKey ?? refs.default ?? Object.values(refs)[0] ?? ''
      return { value, credentialRef }
    } catch {
      const credentialRef = refs.apiKey ?? refs.realtimeApiKey ?? refs.default ?? Object.values(refs)[0] ?? ''
      return { value: '', credentialRef }
    }
  }

  async publicModels(): Promise<Array<Record<string, unknown>>> {
    const rows: Array<Record<string, unknown>> = []
    for (const route of await this.models()) {
      const credential = await this.credential(route)
      rows.push({
        id: route.id,
        model: route.model,
        displayName: route.displayName,
        provider: route.provider,
        source: route.source,
        protocol: route.protocol,
        available: credential.value !== '',
        missingCredential: credential.value === '' ? credential.credentialRef : '',
      })
    }
    return rows
  }

  instructions(profile: RealtimeModelProfile, context: string): string {
    const bounded = String(context ?? '').replaceAll('\0', '').trim().slice(0, this.maxContextChars)
    return typeof profile.instructions === 'function'
      ? String(profile.instructions(bounded) ?? '')
      : [String(profile.instructions ?? ''), bounded].filter(Boolean).join('\n\n')
  }

  session(input: { profileId: string, route: RealtimeModelRoute, context?: string }): unknown {
    const profile = this.profile(input.profileId)
    const adapter = this.adapters.get(input.route.adapter)
    if (adapter === undefined) throw new ModelManagerError(`realtime adapter '${input.route.adapter}' is unavailable`, 'REALTIME_ADAPTER_UNAVAILABLE')
    return adapter.session({
      route: input.route,
      profile,
      instructions: this.instructions(profile, input.context ?? ''),
    })
  }
}

export default RealtimeModelRuntime
