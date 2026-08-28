import { Context, Service } from '@deepseek-ai/cordis';
import type { JsonValue } from '@deepseek-ai/dsh-session';
import type { TaskModelInvocationResult, TaskModelTask } from './types.ts';
export interface PipelineTaskRequest {
    readonly routeId: string;
    readonly operation: string;
    readonly request: Readonly<Record<string, JsonValue>>;
}
/** Internal plugin-to-plugin execution facade; unlike invoke_task_model it carries no tool/session authority. */
export declare class TaskPipelineRuntime extends Service {
    constructor(ctx: Context);
    invoke(expectedTask: TaskModelTask, input: PipelineTaskRequest, signal: AbortSignal): Promise<TaskModelInvocationResult>;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        taskPipelineRuntime: TaskPipelineRuntime;
    }
}
