import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { RealtimeModelRuntime } from '../src/realtime.ts'
import { TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'
import type { TaskModelRegistryConfig } from '../src/types.ts'

const registry: TaskModelRegistryConfig = {
  connections: {
    openai: { provider: 'openai', credentialRef: 'OPENAI_API_KEY', baseURL: 'https://api.openai.com/v1' },
  },
  models: {
    'openai/gpt-realtime': {
      connection: 'openai',
      model: 'gpt-realtime',
      displayName: 'GPT Realtime',
      task: 'realtime-speech',
      runtimeAdapter: 'openai-webrtc',
      input: ['text', 'audio'],
      output: ['text', 'audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: ['voice-deliberation'],
      profile: { voice: 'marin' },
    },
  },
  defaults: {},
  portraits: {},
}

function context(credentialConfigured = true): Context {
  const ctx = new Context()
  ctx.provide('settings', {
    describe: vi.fn(() => [{
      ns: TASK_MODEL_SETTINGS_NAMESPACE,
      schema: TASK_MODEL_REGISTRY_SCHEMA.toJSON(),
      value: registry,
      revision: 1,
      applies: 'live',
    }]),
  } as never)
  ctx.provide('credentials', {
    describe: vi.fn(async () => ({ configured: credentialConfigured, writable: true })),
  } as never)
  ctx.provide('taskModelRuntime', {
    hasAdapter: vi.fn(() => true),
    credentials: vi.fn(async () => credentialConfigured ? { default: 'host-secret' } : {}),
  } as never)
  return ctx
}

describe('realtime model runtime', () => {
  it('joins registered routes, provider adapters, host credentials, and product profiles', async () => {
    const ctx = context()
    try {
      const runtime = new RealtimeModelRuntime(ctx, { maxContextChars: 1_000 })
      runtime.registerAdapter({
        id: 'openai-webrtc',
        protocol: 'openai-webrtc',
        session: input => ({ model: input.route.model, instructions: input.instructions, tools: input.profile.tools }),
      })
      runtime.registerProfile({
        id: 'session-assistant',
        instructions: context => `role\n${context}`,
        tools: [{ name: 'submit_to_agent' }, { name: '' }],
        voice: { openai: 'marin' },
      })

      const route = await runtime.model('', 'openai-webrtc')
      expect(route).toMatchObject({ id: 'openai/gpt-realtime', adapter: 'openai-webrtc', source: 'task-model' })
      await expect(runtime.model('unknown-route', 'openai-webrtc'))
        .rejects.toMatchObject({ code: 'UNKNOWN_REALTIME_MODEL' })
      expect(await runtime.model(undefined, 'openai-webrtc')).toMatchObject({ id: 'openai/gpt-realtime' })
      expect(await runtime.credential(route!)).toEqual({ value: 'host-secret', credentialRef: 'OPENAI_API_KEY' })
      expect(await runtime.publicModels()).toEqual([
        expect.objectContaining({ id: 'openai/gpt-realtime', available: true, protocol: 'openai-webrtc' }),
      ])

      const session = runtime.session({ profileId: 'session-assistant', route: route!, context: 'x'.repeat(2_000) }) as {
        model: string
        instructions: string
        tools: Array<{ name: string }>
      }
      expect(session.model).toBe('gpt-realtime')
      expect(session.instructions).toBe(`role\n${'x'.repeat(1_000)}`)
      expect(session.tools).toEqual([{ name: 'submit_to_agent' }])
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('rejects duplicate adapters and profiles', async () => {
    const ctx = context()
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      const adapter = { id: 'openai-webrtc', protocol: 'openai-webrtc', session: () => ({}) }
      runtime.registerAdapter(adapter)
      expect(() => runtime.registerAdapter(adapter)).toThrow(/already registered/)
      runtime.registerProfile({ id: 'session-assistant', instructions: 'role' })
      expect(() => runtime.registerProfile({ id: 'session-assistant', instructions: 'role' })).toThrow(/already registered/)
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('keeps credential-missing routes discoverable without marking them available', async () => {
    const ctx = context(false)
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      runtime.registerAdapter({ id: 'openai-webrtc', protocol: 'openai-webrtc', session: () => ({}) })
      const routes = await runtime.models()
      expect(routes).toHaveLength(1)
      expect(await runtime.publicModels()).toEqual([
        expect.objectContaining({
          id: 'openai/gpt-realtime',
          available: false,
          missingCredential: 'OPENAI_API_KEY',
        }),
      ])
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
