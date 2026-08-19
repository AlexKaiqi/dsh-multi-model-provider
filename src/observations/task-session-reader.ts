import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { TaskModelInvocationRecord } from '../types.ts'

export function taskModelObservations(events: readonly SessionEvent[] | undefined): TaskModelInvocationRecord[] {
  if (events === undefined) return []
  return events
    .filter(event => event.type === 'multi-model/invocation')
    .map(event => event.data as TaskModelInvocationRecord)
}
