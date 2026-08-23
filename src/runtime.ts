import { Context, Service } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { ModelManagerError } from './operations.ts'
import type {
  ResolvedTaskModelRoute,
  TaskModelAdapterProbeResult,
  TaskModelInvocationResult,
  TaskModelRuntimeAdapter,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    taskModelRuntime: TaskModelRuntime
  }
}

export class TaskModelRuntime extends Service {
  private readonly adapters = new Map<string, TaskModelRuntimeAdapter>()

  constructor(ctx: Context) {
    super(ctx, 'taskModelRuntime')
  }

  registerAdapter(adapter: TaskModelRuntimeAdapter): () => void {
    const id = adapter.id.trim()
    if (id === '') throw new ModelManagerError('task-model adapter id must not be blank', 'INVALID_TASK_MODEL_ADAPTER')
    if (this.adapters.has(id)) {
      throw new ModelManagerError(`task-model adapter '${id}' is already registered`, 'DUPLICATE_TASK_MODEL_ADAPTER')
    }
    const dispose = this.ctx.effect(function* (this: TaskModelRuntime) {
      this.adapters.set(id, adapter)
      yield () => this.adapters.delete(id)
    }.bind(this), 'taskModelRuntime.registerAdapter()')
    return () => void dispose()
  }

  hasAdapter(id: string | undefined, route?: ResolvedTaskModelRoute): boolean {
    if (id === undefined) return false
    const adapter = this.adapters.get(id)
    if (adapter === undefined) return false
    return route === undefined || adapter.available?.(route) !== false
  }

  async invoke(
    route: ResolvedTaskModelRoute,
    operation: string,
    request: Readonly<Record<string, JsonValue>>,
    signal: AbortSignal,
  ): Promise<TaskModelInvocationResult> {
    const adapter = this.requiredAdapter(route)
    const credentials = await this.credentials(route)
    return adapter.invoke({ route, operation, request, credentials }, signal)
  }

  async probe(route: ResolvedTaskModelRoute, signal: AbortSignal): Promise<TaskModelAdapterProbeResult> {
    const adapter = this.requiredAdapter(route)
    const credentials = await this.credentials(route)
    if (adapter.probe === undefined) {
      return { supported: false, ok: false, message: `adapter '${adapter.id}' exposes no live probe; provider reachability was not measured` }
    }
    return adapter.probe(route, credentials, signal)
  }

  private requiredAdapter(route: ResolvedTaskModelRoute): TaskModelRuntimeAdapter {
    const adapterId = route.registration.runtimeAdapter
    if (adapterId === undefined) {
      throw new ModelManagerError(`task model '${route.id}' declares no runtime adapter`, 'TASK_MODEL_ADAPTER_UNDECLARED')
    }
    const adapter = this.adapters.get(adapterId)
    if (adapter === undefined || adapter.available?.(route) === false) {
      throw new ModelManagerError(
        `runtime adapter '${adapterId}' is not available for task model '${route.id}'`,
        'TASK_MODEL_ADAPTER_UNAVAILABLE',
      )
    }
    return adapter
  }

  async credentials(route: ResolvedTaskModelRoute): Promise<Record<string, string>> {
    const allRefs = {
      ...(route.connection.credentialRef === undefined ? {} : { default: route.connection.credentialRef }),
      ...(route.connection.credentialRefs ?? {}),
    }
    const selected = route.registration.credentialNames === undefined
      ? undefined
      : new Set(route.registration.credentialNames)
    const refs = Object.fromEntries(
      Object.entries(allRefs).filter(([name]) => selected === undefined || selected.has(name)),
    )
    const credentials: Record<string, string> = {}
    for (const [name, ref] of Object.entries(refs)) {
      const resolved = await this.ctx.credentials.resolve(credentialRef(ref))
      if (resolved === undefined) {
        throw new ModelManagerError(
          `credential reference '${ref}' required by task model '${route.id}' is not configured`,
          'TASK_MODEL_CREDENTIAL_MISSING',
        )
      }
      credentials[name] = resolved.value
    }
    return credentials
  }
}

export default TaskModelRuntime
