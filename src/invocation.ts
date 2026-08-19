import type { Context } from '@deepseek-ai/cordis'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { ModelManagerError } from './operations.ts'
import { recordTaskModelObservation } from './observations/session-events.ts'
import { resolveTaskModelRoute } from './registry.ts'
import type { InvokeTaskModelInput, TaskModelInvocationRecord } from './types.ts'

export async function invokeTaskModel(
  ctx: Context,
  input: InvokeTaskModelInput,
  exec: ToolRunContext,
): Promise<Record<string, unknown>> {
  const route = resolveTaskModelRoute(ctx, input.id)
  if (route.registration.enabled === false) {
    throw new ModelManagerError(
      `task model '${route.id}' is registered but disabled by the current model selection`,
      'TASK_MODEL_DISABLED',
    )
  }
  const operation = input.operation.trim()
  if (operation === '') throw new ModelManagerError('operation must not be blank', 'INVALID_TASK_MODEL_INVOCATION')
  if (route.registration.operations.length > 0 && !route.registration.operations.includes(operation)) {
    throw new ModelManagerError(
      `task model '${route.id}' does not declare operation '${operation}'`,
      'UNSUPPORTED_TASK_MODEL_OPERATION',
    )
  }
  const adapter = route.registration.runtimeAdapter
  if (adapter === undefined) throw new ModelManagerError(`task model '${route.id}' declares no runtime adapter`, 'TASK_MODEL_ADAPTER_UNDECLARED')
  const started = Date.now()
  const startedAt = new Date(started).toISOString()
  try {
    const result = await ctx.taskModelRuntime.invoke(route, operation, input.request, exec.signal)
    const invocation: TaskModelInvocationRecord = {
      routeId: route.id,
      provider: route.connection.provider,
      model: route.registration.model,
      task: route.registration.task,
      adapter,
      operation,
      startedAt,
      durationMs: Date.now() - started,
      success: true,
      inputModalities: route.registration.input,
      outputModalities: result.outputModalities ?? route.registration.output,
      ...(result.metrics === undefined ? {} : { metrics: result.metrics }),
    }
    recordTaskModelObservation(exec, invocation)
    return { id: route.id, ...result, invocation }
  } catch (error) {
    recordTaskModelObservation(exec, {
      routeId: route.id,
      provider: route.connection.provider,
      model: route.registration.model,
      task: route.registration.task,
      adapter,
      operation,
      startedAt,
      durationMs: Date.now() - started,
      success: false,
      inputModalities: route.registration.input,
      outputModalities: route.registration.output,
      ...typeof (error as { code?: unknown } | null)?.code === 'string' ? { errorCode: (error as { code: string }).code } : {},
    })
    throw error
  }
}
