import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { normalizePortrait, normalizeStoredPortrait } from '../src/portrait-core.ts'
import { getModelPortrait, prepareModelPortraits, upsertModelPortrait, validateModelPortrait } from '../src/portraits.ts'
import { TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'
import type { TaskModelRegistryConfig } from '../src/types.ts'

const registry: TaskModelRegistryConfig = {
  connections: {
    doubao: {
      provider: 'doubao',
      credentialRefs: { appId: 'DOUBAO_APPID', token: 'DOUBAO_TOKEN' },
    },
  },
  models: {
    'doubao/tts': {
      connection: 'doubao',
      model: 'seed-tts-1.0',
      task: 'speech-synthesis',
      runtimeAdapter: 'doubao-speech',
      input: ['text'],
      output: ['audio'],
      execution: 'streaming',
      capabilities: ['speech.synthesize.short'],
      operations: ['synthesize'],
      roles: ['text-to-speech'],
      profile: {},
    },
  },
  defaults: {},
}

function context(value: TaskModelRegistryConfig = registry): Context {
  return {
    settings: {
      describe: vi.fn(() => [{
        ns: TASK_MODEL_SETTINGS_NAMESPACE,
        schema: TASK_MODEL_REGISTRY_SCHEMA.toJSON(),
        value,
        revision: 7,
        applies: 'live',
      }]),
      mutate: vi.fn(async () => undefined),
    },
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
      probe: vi.fn(async () => ({ ok: true, message: 'probe passed' })),
    },
    llm: {
      listProviders: vi.fn(() => [{ id: 'volcengine', name: 'Volcengine Ark' }]),
      listConfigurableProviders: vi.fn(() => []),
      listModels: vi.fn(async () => [{ provider: 'volcengine', id: 'doubao-seed-1-6', name: 'Doubao Seed 1.6', inputModalities: ['text', 'image'] }]),
      resolveModelInfo: vi.fn(async (provider: string, model: string) => ({
        provider,
        id: model,
        name: 'Doubao Seed 1.6',
        inputModalities: ['text', 'image'],
        context: { contextWindow: 256000 },
        defaultMaxTokens: 32000,
      })),
      stream: vi.fn(async function* () {
        yield { type: 'text-delta', text: 'OK' }
        yield { type: 'finish', reason: { kind: 'stop' } }
      }),
    },
  } as unknown as Context
}

describe('model portraits', () => {
  it('hydrates legacy stored portraits before runtime reads', () => {
    const portrait = normalizeStoredPortrait({
      summary: 'legacy portrait',
      validation: { state: 'unvalidated', checks: [] },
    } as never)
    expect(portrait.pricing.rates).toEqual([])
    expect(portrait.performance).toEqual({})
    expect(portrait.evidence).toEqual([])
    expect(portrait.validation.state).toBe('unvalidated')
  })

  it('normalizes evidence-backed price, speed, strengths, and routing scores', () => {
    const portrait = normalizePortrait({
      summary: 'Low-latency Mandarin speech synthesis.',
      specialties: ['Mandarin TTS', 'streaming'],
      bestFor: ['interactive narration'],
      limitations: ['provider resource id must be enabled'],
      pricing: {
        rates: [{
          operation: 'synthesize',
          unit: '1m-characters',
          amount: 100,
          currency: 'cny',
          evidenceId: 'volc-price',
        }],
      },
      performance: { speedClass: 'fast', typicalLatencyMs: { min: 150, max: 600 } },
      qualityScores: { mandarin: 0.9, latency: 0.8 },
      evidence: [{
        id: 'volc-price',
        kind: 'provider-doc',
        source: 'https://www.volcengine.com/docs/example',
        observedAt: '2026-08-19T00:00:00.000Z',
        claims: ['price', 'streaming support'],
      }],
    })

    expect(portrait).toMatchObject({
      schemaVersion: 1,
      pricing: { rates: [{ currency: 'CNY', evidenceId: 'volc-price' }] },
      performance: { speedClass: 'fast' },
      qualityScores: { mandarin: 0.9 },
      validation: { state: 'partial' },
    })
  })

  it('stores an automatically checked portrait and composes it with registered I/O', async () => {
    const ctx = context()
    const result = await upsertModelPortrait(ctx, {
      id: 'doubao/tts',
      portrait: { summary: 'Doubao speech synthesis.', specialties: ['Mandarin TTS'] },
    })
    expect(result).toMatchObject({ automaticallyValidated: false, portrait: { validation: { state: 'partial' } } })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      TASK_MODEL_SETTINGS_NAMESPACE,
      [expect.objectContaining({ path: ['models', 'doubao/tts', 'portrait'] })],
      7,
    )

    const value = structuredClone(registry)
    value.models['doubao/tts'] = {
      ...value.models['doubao/tts']!,
      portrait: (result as { portrait: never }).portrait,
    }
    expect(await getModelPortrait(context(value), { id: 'doubao/tts' })).toMatchObject({
      declared: {
        input: ['text'],
        output: ['audio'],
        capabilities: ['speech.synthesize.short'],
      },
      portrait: { summary: 'Doubao speech synthesis.' },
    })
  })

  it('teaches the Agent the complete workflow from one short portrait request', async () => {
    const result = await prepareModelPortraits(context(), {})
    expect(result).toMatchObject({
      activation: expect.stringMatching(/configured models.*Never pre-research unconfigured catalog entries/),
      ontology: {
        interface: expect.arrayContaining(['input modalities and formats']),
        commercial: expect.arrayContaining(['effective-dated rates']),
        observations: expect.arrayContaining(['token usage']),
      },
      workflow: expect.arrayContaining([expect.stringContaining('ingest_portrait_research')]),
      candidates: expect.arrayContaining([
        expect.objectContaining({ id: 'llm:volcengine/doubao-seed-1-6', kind: 'llm', needsInitialPortrait: true }),
      ]),
    })
  })

  it('stores and reads portraits for LLM routes owned by llm-pi-ai', async () => {
    const ctx = context()
    const result = await upsertModelPortrait(ctx, {
      id: 'llm:volcengine/doubao-seed-1-6',
      portrait: { summary: 'Multimodal Doubao language model.', specialties: ['vision'] },
    })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      TASK_MODEL_SETTINGS_NAMESPACE,
      [expect.objectContaining({
        path: ['portraits', 'llm:volcengine/doubao-seed-1-6'],
        value: expect.objectContaining({ kind: 'llm', provider: 'volcengine', model: 'doubao-seed-1-6' }),
      })],
      7,
    )
    const value = {
      ...registry,
      portraits: {
        'llm:volcengine/doubao-seed-1-6': {
          kind: 'llm' as const,
          provider: 'volcengine',
          model: 'doubao-seed-1-6',
          portrait: (result as { portrait: never }).portrait,
        },
      },
    }
    expect(await getModelPortrait(context(value), { id: 'llm:volcengine/doubao-seed-1-6' })).toMatchObject({
      kind: 'llm',
      provider: 'volcengine',
      declared: { input: ['text', 'image'], output: ['text'], contextWindow: 256000 },
      portrait: { summary: 'Multimodal Doubao language model.' },
    })
  })

  it('lets an explicitly approved Agent probe an LLM and writes the measured result into its portrait', async () => {
    const value = {
      ...registry,
      portraits: {
        'llm:volcengine/doubao-seed-1-6': {
          kind: 'llm' as const,
          provider: 'volcengine',
          model: 'doubao-seed-1-6',
          portrait: normalizePortrait({
            description: '# Doubao Seed 1.6',
            evidence: [{
              id: 'provider-doc',
              kind: 'provider-doc',
              source: 'https://www.volcengine.com/docs/example',
              observedAt: '2026-08-20T00:00:00.000Z',
              claims: ['model identity'],
            }],
          }),
        },
      },
    }
    const ctx = context(value)

    const result = await validateModelPortrait(
      ctx,
      { id: 'llm:volcengine/doubao-seed-1-6', liveProbe: true },
      new AbortController().signal,
    )

    expect(ctx.llm.stream).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'volcengine',
      model: 'doubao-seed-1-6',
      maxTokens: 8,
    }))
    expect(result).toMatchObject({
      kind: 'llm',
      lastProbe: { reachable: true, latencyMs: expect.any(Number) },
      validation: { checks: expect.arrayContaining([expect.objectContaining({ id: 'runtime.live-probe', status: 'pass' })]) },
    })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      TASK_MODEL_SETTINGS_NAMESPACE,
      [expect.objectContaining({
        path: ['portraits', 'llm:volcengine/doubao-seed-1-6'],
        value: expect.objectContaining({
          portrait: expect.objectContaining({
            performance: expect.objectContaining({ lastProbe: expect.objectContaining({ reachable: true }) }),
            evidence: expect.arrayContaining([expect.objectContaining({ id: 'runtime-probe:latest', kind: 'runtime-probe' })]),
          }),
        }),
      })],
      7,
    )
  })
})
