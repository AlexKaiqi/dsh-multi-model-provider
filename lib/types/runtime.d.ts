import { Context, Service } from '@deepseek-ai/cordis';
import type { JsonValue } from '@deepseek-ai/dsh-session';
import type { ResolvedTaskModelRoute, TaskModelAdapterProbeResult, TaskModelInvocationResult, TaskModelRuntimeAdapter } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        taskModelRuntime: TaskModelRuntime;
    }
}
export declare class TaskModelRuntime extends Service {
    private readonly adapters;
    constructor(ctx: Context);
    registerAdapter(adapter: TaskModelRuntimeAdapter): () => void;
    hasAdapter(id: string | undefined, route?: ResolvedTaskModelRoute): boolean;
    invoke(route: ResolvedTaskModelRoute, operation: string, request: Readonly<Record<string, JsonValue>>, signal: AbortSignal): Promise<TaskModelInvocationResult>;
    probe(route: ResolvedTaskModelRoute, signal: AbortSignal): Promise<TaskModelAdapterProbeResult>;
    private requiredAdapter;
    credentials(route: ResolvedTaskModelRoute): Promise<Record<string, string>>;
}
export default TaskModelRuntime;
//# sourceMappingURL=runtime.d.ts.map