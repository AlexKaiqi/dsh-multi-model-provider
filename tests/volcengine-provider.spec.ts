import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { PI_AI_SETTINGS_NAMESPACE } from '../src/operations.ts'
import {
  inspectVolcengineProvider,
  migrateLegacyVolcengineCredential,
  selectVolcengineLanguageModels,
  VOLCENGINE_ARK_BASE_URL,
  VOLCENGINE_ARK_PAYG_BASE_URL,
} from '../src/providers/volcengine.ts'
import { TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'

function context(arkConfigured = true): Context {
  return {
    settings: {
      describe: vi.fn(() => [
        {
          ns: PI_AI_SETTINGS_NAMESPACE,
          value: { providers: { volcengine: { models: [{ id: 'doubao-seed-selected' }] } } },
          revision: 3,
          applies: 'live',
        },
        {
          ns: TASK_MODEL_SETTINGS_NAMESPACE,
          value: {
            connections: { 'doubao-speech': { provider: 'doubao-speech' } },
            models: {
              'doubao/tts': { connection: 'doubao-speech', model: 'seed-tts-1.0', task: 'speech-synthesis', enabled: true, runtimeAdapter: 'doubao-speech', input: ['text'], output: ['audio'], execution: 'streaming', capabilities: ['speech.synthesize.short'], operations: ['synthesize'], roles: ['text-to-speech'], profile: {} },
              'doubao/realtime': { connection: 'doubao-speech', model: '1.2.6.1', task: 'realtime-speech', enabled: true, runtimeAdapter: 'doubao-realtime-duplex', input: ['text', 'audio'], output: ['text', 'audio'], execution: 'realtime', capabilities: ['speech.realtime_session'], operations: ['realtime-session'], roles: ['realtime-voice'], profile: {} },
            },
            defaults: {},
          },
          revision: 4,
          applies: 'live',
        },
      ]),
      mutate: vi.fn(async () => undefined),
    },
    credentials: {
      describe: vi.fn(async (ref: string) => ({ configured: ref === 'ARK_API_KEY' ? arkConfigured : false, writable: true, source: 'file' })),
      resolve: vi.fn(async (ref: string) => ref === 'ARK_API_KEY' && arkConfigured ? { value: 'must-not-leak', source: 'file' } : undefined),
    },
    llm: {
      discoverModels: vi.fn(async () => [{ id: 'doubao-seed-2-0-lite-260215', name: 'Doubao Seed 2.0 Lite', contextWindow: 256000, maxTokens: 32000 }]),
      listProviders: vi.fn(() => []),
    },
    taskModelRuntime: { hasAdapter: vi.fn(() => false) },
    realtimeModelRuntime: { hasAdapter: vi.fn((id: string | undefined) => id === 'doubao-realtime-duplex') },
  } as unknown as Context
}

describe('Volcengine provider orientation', () => {
  it('copies the legacy credential reference to ARK_API_KEY without deleting the legacy value', async () => {
    const values = new Map([['VOLCENGINE_API_KEY', 'legacy-secret']])
    const ctx = {
      credentials: {
        describe: vi.fn(async (ref: string) => ({ configured: values.has(String(ref)), writable: true, source: 'file' })),
        resolve: vi.fn(async (ref: string) => values.has(String(ref)) ? { value: values.get(String(ref)), source: 'file' } : undefined),
        set: vi.fn(async (ref: string, value: string) => { values.set(String(ref), value) }),
      },
    } as unknown as Context

    await expect(migrateLegacyVolcengineCredential(ctx)).resolves.toBe(true)
    expect(values.get('ARK_API_KEY')).toBe('legacy-secret')
    expect(values.get('VOLCENGINE_API_KEY')).toBe('legacy-secret')
    await expect(migrateLegacyVolcengineCredential(ctx)).resolves.toBe(false)
    expect(ctx.credentials.set).toHaveBeenCalledTimes(1)
  })

  it('teaches the Agent credentials, live availability, selections, and invocation paths', async () => {
    const ctx = context()
    const result = await inspectVolcengineProvider(ctx, new AbortController().signal)
    expect(ctx.llm.discoverModels).toHaveBeenCalledWith(PI_AI_SETTINGS_NAMESPACE, expect.objectContaining({
      baseURL: VOLCENGINE_ARK_BASE_URL,
      api: 'openai-completions',
      apiKey: 'must-not-leak',
    }))
    expect(result).toMatchObject({
      provider: 'volcengine',
      credentials: { arkApiKey: { ref: 'ARK_API_KEY', configured: true }, doubaoApiKey: { ref: 'DOUBAO_API_KEY', configured: false } },
      displayName: '火山方舟',
      ark: {
        discovery: 'ok',
        availableModels: [{ id: 'doubao-seed-2-0-lite-260215' }],
        routes: {
          payAsYouGo: { provider: 'volcengine', baseURL: VOLCENGINE_ARK_PAYG_BASE_URL, selectedLanguageModels: [{ id: 'doubao-seed-selected' }] },
          agentPlan: { provider: 'volcengine-agent-plan', baseURL: 'https://ark.cn-beijing.volces.com/api/plan/v3', selectedLanguageModels: [] },
        },
      },
      relatedTaskProvider: {
        provider: 'doubao-speech',
        credentialRef: 'DOUBAO_API_KEY',
        taskRoutes: [
          { id: 'doubao/tts', callability: false },
          { id: 'doubao/realtime', callability: true, availability: { callable: true } },
        ],
      },
    })
    expect(ctx.taskModelRuntime.hasAdapter).toHaveBeenCalledWith('doubao-speech', expect.anything())
    expect(ctx.taskModelRuntime.hasAdapter).not.toHaveBeenCalledWith('doubao-realtime-duplex', expect.anything())
    expect(ctx.realtimeModelRuntime.hasAdapter).toHaveBeenCalledWith('doubao-realtime-duplex')
    expect(JSON.stringify(result)).not.toContain('must-not-leak')
  })

  it('returns an actionable credential requirement without attempting discovery', async () => {
    const ctx = context(false)
    const result = await inspectVolcengineProvider(ctx, new AbortController().signal)
    expect(ctx.llm.discoverModels).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ark: { discovery: 'credential-required', availableModels: [] }, next: expect.stringContaining('ARK_API_KEY') })
  })
})

describe('Volcengine language/VLM selection', () => {
  it('configures the official provider route from a complete selection', async () => {
    const ctx = context()
    const result = await selectVolcengineLanguageModels(ctx, { models: [{ id: 'doubao-seed-2-0-lite-260215', input: ['text', 'image'] }] })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      expect.arrayContaining([
        { op: 'set', path: ['providers', 'volcengine', 'api'], value: 'openai-completions' },
        { op: 'set', path: ['providers', 'volcengine', 'baseURL'], value: VOLCENGINE_ARK_BASE_URL },
        expect.objectContaining({ op: 'set', path: ['providers', 'volcengine', 'models'] }),
      ]),
      3,
    )
    expect(VOLCENGINE_ARK_BASE_URL).toBe(VOLCENGINE_ARK_PAYG_BASE_URL)
    expect(result).toMatchObject({ provider: 'volcengine', selected: ['doubao-seed-2-0-lite-260215'], allDisabled: false, billingMode: 'payg' })
  })

  it('configures Agent Plan without replacing the pay-as-you-go provider', async () => {
    const ctx = context()
    const result = await selectVolcengineLanguageModels(ctx, { mode: 'agent-plan', models: [{ id: 'glm-5-2-260617', input: ['text'] }] })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      expect.arrayContaining([
        { op: 'set', path: ['providers', 'volcengine-agent-plan', 'baseURL'], value: 'https://ark.cn-beijing.volces.com/api/plan/v3' },
        expect.objectContaining({ op: 'set', path: ['providers', 'volcengine-agent-plan', 'models'] }),
      ]),
      3,
    )
    expect(result).toMatchObject({ provider: 'volcengine-agent-plan', billingMode: 'agent-plan', selected: ['glm-5-2-260617'] })
  })

  it('preserves an explicit empty selection by removing only the selected LLM route', async () => {
    const ctx = context()
    const result = await selectVolcengineLanguageModels(ctx, { models: [] })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      [{ op: 'unset', path: ['providers', 'volcengine'] }],
      3,
    )
    expect(result).toMatchObject({ selected: [], allDisabled: true })
  })
})
