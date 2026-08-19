import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { llmTargetId } from '../model-target-id.ts'
import type { LlmInvocationObservation } from './types.ts'

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function coordinate(data: Record<string, unknown>): string | undefined {
  const turn = typeof data.turn === 'number' ? data.turn : undefined
  const step = typeof data.step === 'number' ? data.step : undefined
  return turn === undefined || step === undefined ? undefined : `${turn}:${step}`
}

/**
 * Adapts durable Harness LLM events into privacy-safe observations.
 * Prompt and response content are deliberately ignored.
 */
export function llmObservations(events: readonly SessionEvent[] | undefined): LlmInvocationObservation[] {
  if (events === undefined) return []
  let selection: { provider: string; model: string } | undefined
  const starts = new Map<string, { time: number; provider: string; model: string }>()
  const result: LlmInvocationObservation[] = []
  for (const event of events) {
    const data = object(event.data)
    if (data === undefined) continue
    if (event.type === 'request/header') {
      const config = object(object(data.header)?.config)
      if (typeof config?.provider === 'string' && typeof config.model === 'string') {
        selection = { provider: config.provider, model: config.model }
      }
      continue
    }
    if (event.type === 'step/start' && selection !== undefined) {
      const key = coordinate(data)
      if (key !== undefined) starts.set(key, { time: event.time, ...selection })
      continue
    }
    if (event.type !== 'assistant/message') continue
    const key = coordinate(data)
    const start = key === undefined ? undefined : starts.get(key)
    const usage = object(data.usage)
    if (start === undefined || usage === undefined) continue
    const tokens = Object.fromEntries(
      ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'reasoningTokens']
        .filter(name => typeof usage[name] === 'number')
        .map(name => [name, usage[name] as number]),
    )
    result.push({
      id: llmTargetId(start.provider, start.model),
      provider: start.provider,
      model: start.model,
      startedAt: new Date(start.time).toISOString(),
      durationMs: Math.max(0, event.time - start.time),
      success: true,
      usage: tokens,
    })
  }
  return result
}
