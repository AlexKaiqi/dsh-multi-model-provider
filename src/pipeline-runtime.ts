import { Context, Service } from '@deepseek-ai/cordis'
import type { JsonValue } from '@deepseek-ai/dsh-session'
import { ModelManagerError } from './operations.ts'
import { effectiveTaskModelAvailability, resolveTaskModelRoute } from './registry.ts'
import type { TaskModelInvocationResult, TaskModelTask } from './types.ts'

export interface PipelineTaskRequest {
  readonly routeId: string
  readonly operation: string
  readonly request: Readonly<Record<string, JsonValue>>
}

/** Internal plugin-to-plugin execution facade; unlike invoke_task_model it carries no tool/session authority. */
export class TaskPipelineRuntime extends Service {
  constructor(ctx: Context) {
    super(ctx, 'taskPipelineRuntime')
  }

  async invoke(expectedTask: TaskModelTask, input: PipelineTaskRequest, signal: AbortSignal): Promise<TaskModelInvocationResult> {
    const route = resolveTaskModelRoute(this.ctx, input.routeId)
    if (route.registration.task !== expectedTask) {
      throw new ModelManagerError(`task route '${route.id}' serves '${route.registration.task}', expected '${expectedTask}'`, 'TASK_PIPELINE_STAGE_MISMATCH')
    }
    if (route.registration.execution === 'realtime') {
      throw new ModelManagerError(`task route '${route.id}' is realtime and cannot be used as a composed stage`, 'TASK_PIPELINE_REALTIME_STAGE')
    }
    const availability = await effectiveTaskModelAvailability(this.ctx, route)
    if (!availability.enabled) throw new ModelManagerError(`task route '${route.id}' is disabled`, 'TASK_MODEL_DISABLED')
    if (!availability.adapterAvailable) throw new ModelManagerError(`task route '${route.id}' adapter is unavailable`, 'TASK_MODEL_ADAPTER_UNAVAILABLE')
    if (!availability.credentialReady) throw new ModelManagerError(`task route '${route.id}' credentials are unavailable`, 'TASK_MODEL_CREDENTIAL_MISSING')
    const operation = input.operation.trim()
    if (!route.registration.operations.includes(operation)) {
      throw new ModelManagerError(`task route '${route.id}' does not declare '${operation}'`, 'UNSUPPORTED_TASK_MODEL_OPERATION')
    }
    return this.ctx.taskModelRuntime.invoke(route, operation, input.request, signal)
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    taskPipelineRuntime: TaskPipelineRuntime
  }
}
