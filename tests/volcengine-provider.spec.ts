import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { PI_AI_SETTINGS_NAMESPACE } from '../src/operations.ts'
import { inspectVolcengineProvider, selectVolcengineLanguageModels, VOLCENGINE_ARK_BASE_URL } from '../src/providers/volcengine.ts'
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
              'doubao/tts': { connection: 'doubao-speech', model: 'seed-tts-1.0', task: 'speech-synthesis', enabled: true, runtimeAdapter: 'doubao-speech' },
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
  } as unknown as Context
}

describe('Volcengine provider orientation', () => {
  it('teaches the Agent credentials, live availability, selections, and invocation paths', async () => {
    const ctx = context()
    const result = await inspectVolcengineProvider(ctx, new AbortController().signal)
    expect(ctx.llm.discoverModels).toHaveBeenCalledWith(PI_AI_SETTINGS_NAMESPACE, expect.objectContaining({
      baseURL: VOLCENGINE_ARK_BASE_URL,
      api: 'openai-responses',
      apiKey: 'must-not-leak',
    }))
    expect(result).toMatchObject({
      provider: 'volcengine',
      credentials: { arkApiKey: { ref: 'ARK_API_KEY', configured: true }, doubaoApiKey: { ref: 'DOUBAO_API_KEY', configured: false } },
      ark: {
        discovery: 'ok',
        availableModels: [{ id: 'doubao-seed-2-0-lite-260215' }],
        selectedLanguageModels: [{ id: 'doubao-seed-selected' }],
      },
      relatedTaskProvider: {
        provider: 'doubao-speech',
        credentialRef: 'DOUBAO_API_KEY',
        taskRoutes: [{ id: 'doubao/tts', callability: false }],
      },
    })
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
        { op: 'set', path: ['providers', 'volcengine', 'api'], value: 'openai-responses' },
        { op: 'set', path: ['providers', 'volcengine', 'baseURL'], value: VOLCENGINE_ARK_BASE_URL },
        expect.objectContaining({ op: 'set', path: ['providers', 'volcengine', 'models'] }),
      ]),
      3,
    )
    expect(result).toMatchObject({ provider: 'volcengine', selected: ['doubao-seed-2-0-lite-260215'], allDisabled: false })
  })

  it('preserves an explicit empty selection by removing the LLM route', async () => {
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
