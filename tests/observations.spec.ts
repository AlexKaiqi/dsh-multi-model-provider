import type { Context } from '@deepseek-ai/cordis'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { describe, expect, it, vi } from 'vitest'
import { invokeTaskModel } from '../src/invocation.ts'
import { summarizeModelUsage } from '../src/observations/aggregate.ts'
import { TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'
import type { TaskModelInvocationRecord, TaskModelRegistryConfig } from '../src/types.ts'

const registry: TaskModelRegistryConfig = {
  connections: { doubao: { provider: 'doubao', credentialRefs: { appId: 'DOUBAO_APPID', token: 'DOUBAO_TOKEN' } } },
  models: {
    'doubao/tts': {
      connection: 'doubao', model: 'seed-tts-1.0', task: 'speech-synthesis', runtimeAdapter: 'doubao-speech',
      input: ['text'], output: ['audio'], execution: 'streaming', capabilities: ['speech.synthesize.short'],
      operations: ['synthesize'], roles: ['text-to-speech'], profile: {},
    },
  },
  defaults: {},
}

function context(value: TaskModelRegistryConfig = registry, user?: Record<string, unknown>): Context {
  return {
    settings: { describe: vi.fn(() => [{ ns: TASK_MODEL_SETTINGS_NAMESPACE, schema: TASK_MODEL_REGISTRY_SCHEMA.toJSON(), value, ...(user === undefined ? {} : { user }), revision: 7, applies: 'live' }]) },
    credentials: {
      describe: vi.fn(async () => ({ configured: true, writable: true, source: 'file' })),
      resolve: vi.fn(async () => ({ value: 'secret-that-must-not-leak', source: 'file' })),
    },
    taskModelRuntime: {
      hasAdapter: vi.fn(() => true),
      invoke: vi.fn(async () => ({
        output: { audio: { uri: 'attachment://audio-1', mimeType: 'audio/mpeg' } },
        outputModalities: ['audio'],
        metrics: { estimatedCost: 0.02, currency: 'CNY', providerRequestId: 'request-1' },
      })),
    },
  } as unknown as Context
}

describe('task-model observation recording', () => {
  it('refuses direct invocation of a disabled registration', async () => {
    const value = structuredClone(registry)
    value.models['doubao/tts'] = { ...value.models['doubao/tts']!, enabled: false }
    await expect(invokeTaskModel(context(value), { id: 'doubao/tts', operation: 'synthesize', request: {} }, { signal: new AbortController().signal } as ToolRunContext))
      .rejects.toMatchObject({ code: 'TASK_MODEL_DISABLED' })
  })

  it('honors provider-editor selection during direct invocation', async () => {
    const ctx = context(registry, { connections: { doubao: { models: [] } } })
    await expect(invokeTaskModel(ctx, { id: 'doubao/tts', operation: 'synthesize', request: {} }, { signal: new AbortController().signal } as ToolRunContext))
      .rejects.toMatchObject({ code: 'TASK_MODEL_DISABLED' })
    expect(ctx.taskModelRuntime.invoke).not.toHaveBeenCalled()
  })

  it('rejects realtime routes from the generic invocation runtime', async () => {
    const value = structuredClone(registry)
    value.models['doubao/realtime'] = {
      ...value.models['doubao/tts']!,
      task: 'realtime-speech',
      execution: 'realtime',
      runtimeAdapter: 'doubao-realtime-duplex',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
    }
    await expect(invokeTaskModel(context(value), { id: 'doubao/realtime', operation: 'realtime-session', request: {} }, { signal: new AbortController().signal } as ToolRunContext))
      .rejects.toMatchObject({ code: 'REALTIME_TASK_MODEL_REQUIRES_RUNTIME', message: expect.stringContaining('realtimeModelRuntime') })
  })

  it('records metrics without request content or credentials', async () => {
    const append = vi.fn()
    const exec = { signal: new AbortController().signal, agent: { session: { append } } } as unknown as ToolRunContext
    const result = await invokeTaskModel(context(), { id: 'doubao/tts', operation: 'synthesize', request: { text: 'private request content' } }, exec)
    expect(result).toMatchObject({ id: 'doubao/tts', invocation: { success: true, metrics: { estimatedCost: 0.02 } } })
    expect(append).toHaveBeenCalledWith('multi-model/invocation', expect.objectContaining({ routeId: 'doubao/tts', adapter: 'doubao-speech', success: true }))
    const durableRecord = JSON.stringify(append.mock.calls[0]?.[1])
    expect(durableRecord).not.toContain('private request content')
    expect(durableRecord).not.toContain('secret-that-must-not-leak')
  })
})

describe('observation aggregation', () => {
  it('aggregates task-model observations independently of portraits', () => {
    const record: TaskModelInvocationRecord = {
      routeId: 'doubao/tts', provider: 'doubao', model: 'seed-tts-1.0', task: 'speech-synthesis', adapter: 'doubao-speech',
      operation: 'synthesize', startedAt: '2026-08-19T00:00:00.000Z', durationMs: 240, success: true,
      inputModalities: ['text'], outputModalities: ['audio'], metrics: { estimatedCost: 0.02, currency: 'CNY' },
    }
    const events = [
      { type: 'multi-model/invocation', seq: 0, time: 1, data: record },
      { type: 'multi-model/invocation', seq: 1, time: 2, data: { ...record, durationMs: 600, success: false } },
    ] as never
    expect(summarizeModelUsage({ id: 'doubao/tts' }, events)).toMatchObject({
      scope: 'current-session', count: 2,
      models: [{ id: 'doubao/tts', calls: 2, successes: 1, failures: 1, successRate: 0.5, latencyMs: { p50: 240, p95: 600 }, estimatedCost: 0.04 }],
    })
  })

  it('adapts native Harness LLM events without copying content', () => {
    const events = [
      { type: 'request/header', seq: 0, time: 900, data: { header: { config: { provider: 'volcengine', model: 'doubao-seed-1-6' } } } },
      { type: 'step/start', seq: 1, time: 1000, data: { turn: 1, step: 0 } },
      { type: 'assistant/message', seq: 2, time: 1600, data: { turn: 1, step: 0, content: [{ type: 'text', text: 'must not be copied' }], usage: { inputTokens: 120, outputTokens: 30, cacheReadTokens: 20 } } },
    ] as never
    const summary = summarizeModelUsage({ id: 'llm:volcengine/doubao-seed-1-6' }, events)
    expect(summary).toMatchObject({ count: 1, models: [{ id: 'llm:volcengine/doubao-seed-1-6', kind: 'llm', calls: 1, latencyMs: { p50: 600, p95: 600 }, tokens: { input: 120, output: 30, cacheRead: 20 } }] })
    expect(JSON.stringify(summary)).not.toContain('must not be copied')
  })
})
