import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { TaskPipelineRuntime } from '../src/pipeline-runtime.ts'
import { TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'

function context(task = 'transcription', execution = 'request-response'): Context {
  const value = {
    connections: { speech: { provider: 'test', credentialRef: 'TEST_KEY', profile: {} } },
    models: { route: { enabled: true, connection: 'speech', model: 'm', task, runtimeAdapter: 'adapter', input: ['audio'], output: ['text'], execution, capabilities: [], operations: ['run'], roles: [], profile: {} } },
    defaults: {}, portraits: {},
  }
  const ctx = new Context()
  ctx.provide('settings', { describe: () => [{ ns: TASK_MODEL_SETTINGS_NAMESPACE, value, revision: 1 }] } as never)
  ctx.provide('credentials', { describe: vi.fn(async () => ({ configured: true, writable: true })), resolve: vi.fn(async () => ({ value: 'secret' })) } as never)
  ctx.provide('taskModelRuntime', { hasAdapter: vi.fn(() => true), invoke: vi.fn(async () => ({ output: { text: 'ok' } })) } as never)
  new TaskPipelineRuntime(ctx)
  return ctx
}

describe('task pipeline runtime', () => {
  it('invokes an explicit enabled non-realtime stage through its registered adapter', async () => {
    const ctx = context()
    await expect(ctx.taskPipelineRuntime.invoke('transcription', { routeId: 'route', operation: 'run', request: { uri: 'attachment://a' } }, new AbortController().signal)).resolves.toEqual({ output: { text: 'ok' } })
    expect(ctx.taskModelRuntime.invoke).toHaveBeenCalledWith(expect.objectContaining({ id: 'route' }), 'run', { uri: 'attachment://a' }, expect.any(AbortSignal))
  })

  it('rejects mismatched and realtime stages before adapter invocation', async () => {
    const mismatch = context('speech-synthesis')
    await expect(mismatch.taskPipelineRuntime.invoke('transcription', { routeId: 'route', operation: 'run', request: {} }, new AbortController().signal)).rejects.toMatchObject({ code: 'TASK_PIPELINE_STAGE_MISMATCH' })
    const realtime = context('transcription', 'realtime')
    await expect(realtime.taskPipelineRuntime.invoke('transcription', { routeId: 'route', operation: 'run', request: {} }, new AbortController().signal)).rejects.toMatchObject({ code: 'TASK_PIPELINE_REALTIME_STAGE' })
  })
})
