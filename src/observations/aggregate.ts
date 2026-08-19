import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { SummarizeModelUsageInput, TaskModelInvocationRecord } from '../types.ts'
import { llmObservations } from './llm-session-reader.ts'
import { taskModelObservations } from './task-session-reader.ts'
import type { LlmInvocationObservation } from './types.ts'

function percentile(values: readonly number[], fraction: number): number | undefined {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)]
}

function summarizeTask(id: string, items: readonly TaskModelInvocationRecord[]) {
  const successes = items.filter(item => item.success).length
  return {
    id,
    kind: 'task',
    calls: items.length,
    successes,
    failures: items.length - successes,
    successRate: items.length === 0 ? undefined : successes / items.length,
    latencyMs: { p50: percentile(items.map(item => item.durationMs), 0.5), p95: percentile(items.map(item => item.durationMs), 0.95) },
    estimatedCost: items.reduce((sum, item) => sum + (item.metrics?.estimatedCost ?? 0), 0),
    currencies: [...new Set(items.map(item => item.metrics?.currency).filter((item): item is string => item !== undefined))],
    firstAt: items[0]?.startedAt,
    lastAt: items.at(-1)?.startedAt,
  }
}

function summarizeLlm(id: string, items: readonly LlmInvocationObservation[]) {
  const successes = items.filter(item => item.success).length
  const sum = (key: keyof LlmInvocationObservation['usage']) => items.reduce((total, item) => total + (item.usage[key] ?? 0), 0)
  return {
    id,
    kind: 'llm',
    provider: items[0]?.provider,
    model: items[0]?.model,
    calls: items.length,
    successes,
    failures: items.length - successes,
    successRate: items.length === 0 ? undefined : successes / items.length,
    latencyMs: { p50: percentile(items.map(item => item.durationMs), 0.5), p95: percentile(items.map(item => item.durationMs), 0.95) },
    tokens: {
      input: sum('inputTokens'),
      output: sum('outputTokens'),
      cacheRead: sum('cacheReadTokens'),
      cacheWrite: sum('cacheWriteTokens'),
      reasoning: sum('reasoningTokens'),
    },
    firstAt: items[0]?.startedAt,
    lastAt: items.at(-1)?.startedAt,
  }
}

export function summarizeModelUsage(input: SummarizeModelUsageInput, events?: readonly SessionEvent[]): Record<string, unknown> {
  const tasks = taskModelObservations(events).filter(item => input.id === undefined || item.routeId === input.id)
  const llms = llmObservations(events).filter(item => input.id === undefined || item.id === input.id)
  const byTask = new Map<string, TaskModelInvocationRecord[]>()
  const byLlm = new Map<string, LlmInvocationObservation[]>()
  for (const item of tasks) byTask.set(item.routeId, [...(byTask.get(item.routeId) ?? []), item])
  for (const item of llms) byLlm.set(item.id, [...(byLlm.get(item.id) ?? []), item])
  return {
    scope: 'current-session',
    count: tasks.length + llms.length,
    models: [
      ...[...byTask].map(([id, items]) => summarizeTask(id, items)),
      ...[...byLlm].map(([id, items]) => summarizeLlm(id, items)),
    ],
    note: 'Uses native Harness LLM events plus task-model invocation records. Only routing, timing, outcome, modality, token, and cost metadata are aggregated; prompts, responses, media, and credentials are never copied.',
  }
}
