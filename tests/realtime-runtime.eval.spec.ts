import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { RealtimeModelRuntime } from '../src/realtime.ts'
import { TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'
import type { RealtimeModelRoute, TaskModelRegistryConfig } from '../src/types.ts'

const registry: TaskModelRegistryConfig = {
  connections: {
    openai: {
      provider: 'openai',
      credentialRef: 'OPENAI_API_KEY',
      baseURL: 'https://api.openai.test/v1',
    },
    'doubao-speech': {
      provider: 'doubao-speech',
      credentialRef: 'DOUBAO_API_KEY',
      credentialRefs: { apiKey: 'DOUBAO_API_KEY', realtimeApiKey: 'DOUBAO_API_KEY' },
      baseURL: 'wss://doubao.example.test/realtime',
    },
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
    'doubao/realtime-duplex': {
      connection: 'doubao-speech',
      model: '1.2.6.1',
      displayName: 'Doubao Realtime',
      task: 'realtime-speech',
      runtimeAdapter: 'doubao-realtime-duplex',
      input: ['text', 'audio'],
      output: ['text', 'audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: ['voice-deliberation'],
      profile: { endpoint: 'wss://doubao.example.test/realtime', voice: 'saturn' },
    },
    'doubao/disabled': {
      enabled: false,
      connection: 'doubao-speech',
      model: 'disabled',
      task: 'realtime-speech',
      runtimeAdapter: 'doubao-realtime-duplex',
      input: ['audio'],
      output: ['audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: [],
      profile: {},
    },
    'openai/unregistered-adapter': {
      connection: 'openai',
      model: 'unregistered-adapter',
      task: 'realtime-speech',
      runtimeAdapter: 'missing-adapter',
      input: ['audio'],
      output: ['audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: [],
      profile: {},
    },
  },
  defaults: {},
  portraits: {},
}

function context(credentials: (provider: string) => Promise<Record<string, string>>): Context {
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
    describe: vi.fn(async () => ({ configured: true, writable: true })),
  } as never)
  ctx.provide('taskModelRuntime', {
    hasAdapter: vi.fn(() => true),
    credentials: vi.fn(async (route: { connection: { provider: string } }) => credentials(route.connection.provider)),
  } as never)
  return ctx
}

function registerAdapters(runtime: RealtimeModelRuntime, session = vi.fn(input => input)): void {
  runtime.registerAdapter({ id: 'openai-webrtc', protocol: 'openai-webrtc', session })
  runtime.registerAdapter({ id: 'doubao-realtime-duplex', protocol: 'doubao-realtime-duplex', session })
}

describe('realtime runtime evaluation cases', () => {
  it('exposes only enabled routes backed by a registered adapter', async () => {
    const ctx = context(async () => ({ default: 'secret' }))
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      registerAdapters(runtime)
      expect((await runtime.models()).map(route => route.id)).toEqual([
        'openai/gpt-realtime',
        'doubao/realtime-duplex',
      ])
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it.each([
    ['exact route id', 'doubao/realtime-duplex', '', 'doubao/realtime-duplex'],
    ['provider model id', '1.2.6.1', '', 'doubao/realtime-duplex'],
    ['protocol fallback', '', 'openai-webrtc', 'openai/gpt-realtime'],
  ])('selects the expected route for %s', async (_name, routeId, protocol, expected) => {
    const ctx = context(async () => ({ default: 'secret' }))
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      registerAdapters(runtime)
      expect((await runtime.model(routeId, protocol))?.id).toBe(expected)
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('rejects a nonblank unknown route id instead of silently selecting a default', async () => {
    const ctx = context(async () => ({ default: 'secret' }))
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      registerAdapters(runtime)
      await expect(runtime.model('missing', 'doubao-realtime-duplex'))
        .rejects.toMatchObject({ code: 'UNKNOWN_REALTIME_MODEL' })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('reports availability without exposing credential values', async () => {
    const ctx = context(async provider => provider === 'openai'
      ? { default: 'openai-secret' }
      : {})
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      registerAdapters(runtime)
      const rows = await runtime.publicModels()
      expect(rows).toEqual([
        expect.objectContaining({ id: 'openai/gpt-realtime', available: true, missingCredential: '' }),
        expect.objectContaining({ id: 'doubao/realtime-duplex', available: false, missingCredential: 'DOUBAO_API_KEY' }),
      ])
      expect(JSON.stringify(rows)).not.toContain('openai-secret')
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('turns credential resolution failures into an unavailable public route', async () => {
    const ctx = context(async () => { throw new Error('credential backend unavailable') })
    try {
      const runtime = new RealtimeModelRuntime(ctx)
      registerAdapters(runtime)
      const route = await runtime.model('openai/gpt-realtime') as RealtimeModelRoute
      expect(await runtime.credential(route)).toEqual({ value: '', credentialRef: 'OPENAI_API_KEY' })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('bounds context, strips NUL bytes, filters blank tools, and disposes registrations', async () => {
    const ctx = context(async () => ({ default: 'secret' }))
    try {
      const runtime = new RealtimeModelRuntime(ctx, { maxContextChars: 1_000 })
      const session = vi.fn(input => input)
      const disposeAdapter = runtime.registerAdapter({ id: 'openai-webrtc', protocol: 'openai-webrtc', session })
      const disposeProfile = runtime.registerProfile({
        id: 'session-assistant',
        instructions: value => `role:${value}`,
        tools: [{ name: 'submit_to_agent' }, { name: ' ' }],
      })
      const route = await runtime.model('openai/gpt-realtime') as RealtimeModelRoute
      const result = runtime.session({
        profileId: 'session-assistant',
        route,
        context: `\0  ${'x'.repeat(1_200)}  `,
      }) as { instructions: string, profile: { tools: Array<{ name: string }> } }
      expect(result.instructions).toBe(`role:${'x'.repeat(1_000)}`)
      expect(result.profile.tools).toEqual([{ name: 'submit_to_agent' }])

      disposeProfile()
      expect(() => runtime.profile('session-assistant')).toThrow(/unknown realtime profile/)
      disposeAdapter()
      expect(runtime.hasAdapter('openai-webrtc')).toBe(false)
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
