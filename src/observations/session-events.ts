import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-session'
import type { TaskModelInvocationRecord } from '../types.ts'

declare module '@deepseek-ai/dsh-session' {
  interface SessionEventMap {
    'multi-model/invocation': TaskModelInvocationRecord
  }
}

export function recordTaskModelObservation(exec: ToolRunContext, value: TaskModelInvocationRecord): void {
  exec.agent?.session.append('multi-model/invocation', value)
}
