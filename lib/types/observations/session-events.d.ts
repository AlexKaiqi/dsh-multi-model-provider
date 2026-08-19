import type { ToolRunContext } from '@deepseek-ai/dsh-tools';
import type { TaskModelInvocationRecord } from '../types.ts';
declare module '@deepseek-ai/dsh-session' {
    interface SessionEventMap {
        'multi-model/invocation': TaskModelInvocationRecord;
    }
}
export declare function recordTaskModelObservation(exec: ToolRunContext, value: TaskModelInvocationRecord): void;
//# sourceMappingURL=session-events.d.ts.map