import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { ingestPortraitResearch, portraitGaps, prepareModelPortraits } from '../src/portraits.ts'
import {
  ANTHROPIC_MODELS_DOCS,
  ANTHROPIC_PRICING_DOCS,
  DEEPSEEK_MODELS_DOCS,
  DEEPSEEK_PRICING_DOCS,
  DOUBAO_SPEECH_DOCS,
  GOOGLE_MODELS_DOCS,
  GOOGLE_PRICING_DOCS,
  GOOGLE_VIDEO_DOCS,
  KIMI_MODELS_DOCS,
  KIMI_PRICING_DOCS,
  MINIMAX_H3_DOCS,
  MINIMAX_H3_OPEN_SOURCE_DOCS,
  MINIMAX_IMAGE_DOCS,
  MINIMAX_LOCAL_DEPLOY_DOCS,
  MINIMAX_MODELS_DOCS,
  MINIMAX_MULTIMODAL_DOCS,
  MINIMAX_PRICING_DOCS,
  MISTRAL_MODELS_DOCS,
  MISTRAL_PRICING_DOCS,
  OPENAI_IMAGE_DOCS,
  OPENAI_MODELS_DOCS,
  OPENAI_PRICING_DOCS,
  OPENAI_VIDEO_DOCS,
  officialResearchSources,
  QWEN_MODELS_DOCS,
  QWEN_OPEN_WEIGHTS_DOCS,
  QWEN_PRICING_DOCS,
  VOLCENGINE_ARK_DOCS,
  XAI_MODELS_DOCS,
  XAI_PRICING_DOCS,
  ZAI_MODELS_DOCS,
  ZAI_PRICING_DOCS,
} from '../src/portraits/research-sources.ts'
import { TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'
import type { ModelPortrait, TaskModelRegistryConfig } from '../src/types.ts'

const SECRET = 'secret-that-must-not-leak'

const lastProbe = {
  observedAt: '2026-08-20T00:00:00.000Z',
  reachable: true,
  latencyMs: 180,
}

function portraitWithProbe(): ModelPortrait {
  return {
    schemaVersion: 1,
    summary: 'Low-latency Mandarin TTS.',
    specialties: [],
    limitations: [],
    bestFor: [],
    avoidFor: [],
    pricing: { rates: [] },
    performance: { lastProbe },
    qualityScores: {},
    evidence: [],
    validation: { state: 'partial', checks: [] },
  }
}

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
      portrait: portraitWithProbe(),
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
      resolve: vi.fn(async () => ({ value: SECRET, source: 'file' })),
    },
    llm: {
      listProviders: vi.fn(() => [{ id: 'volcengine', name: 'Volcengine Ark' }]),
      listModels: vi.fn(async () => [{
        provider: 'volcengine',
        id: 'doubao-seed-1-6',
        name: 'Doubao Seed 1.6',
        inputModalities: ['text', 'image'],
      }]),
      resolveModelInfo: vi.fn(async (provider: string, model: string) => ({
        provider,
        id: model,
        name: 'Doubao Seed 1.6',
        inputModalities: ['text', 'image'],
        context: { contextWindow: 256000 },
        defaultMaxTokens: 32000,
      })),
    },
  } as unknown as Context
}

const docsEvidence = {
  id: 'volc-tts-doc',
  kind: 'provider-doc' as const,
  source: `${DOUBAO_SPEECH_DOCS}/example`,
  observedAt: '2026-08-20T12:00:00.000Z',
  claims: ['price', 'Mandarin TTS'],
}

describe('portrait research testsuite', () => {
  it('seeds prepare from registration and preserves lastProbe', async () => {
    const result = await prepareModelPortraits(context(), { ids: ['doubao/tts'] })
    expect(JSON.stringify(result)).not.toContain(SECRET)
    expect(result.candidates).toEqual([
      expect.objectContaining({
        id: 'doubao/tts',
        seed: expect.objectContaining({
          kind: 'task',
          provider: 'doubao',
          input: ['text'],
          output: ['audio'],
          capabilities: ['speech.synthesize.short'],
          lastProbe,
        }),
      }),
    ])
  })

  it('lists researchable gaps and a lastProbe note without turning probe into a research question', async () => {
    expect(portraitGaps(portraitWithProbe())).toEqual([
      'pricing',
      'specialties',
      'limitations',
      'evidence',
    ])
    const result = await prepareModelPortraits(context(), { ids: ['doubao/tts'] })
    const candidate = (result.candidates as Array<Record<string, unknown>>)[0]!
    expect(candidate.gaps).toEqual(['pricing', 'specialties', 'limitations', 'evidence'])
    expect(candidate.researchPlan).toEqual(expect.objectContaining({
      suggestedSources: [DOUBAO_SPEECH_DOCS],
      questions: expect.arrayContaining([
        expect.objectContaining({ field: 'pricing' }),
      ]),
    }))
    expect((candidate.researchPlan as { questions: Array<{ field: string }> }).questions.map(item => item.field))
      .not.toContain('lastProbe')
  })

  it('seeds LLM context from resolveModelInfo and points at Ark docs', async () => {
    const result = await prepareModelPortraits(context(), { ids: ['llm:volcengine/doubao-seed-1-6'] })
    expect(result.candidates).toEqual([
      expect.objectContaining({
        id: 'llm:volcengine/doubao-seed-1-6',
        seed: expect.objectContaining({
          kind: 'llm',
          contextWindow: 256000,
          defaultMaxTokens: 32000,
          input: ['text', 'image'],
        }),
        researchPlan: expect.objectContaining({
          suggestedSources: [VOLCENGINE_ARK_DOCS],
          lastProbe: expect.stringContaining('Settings speed test'),
        }),
        gaps: expect.arrayContaining(['lastProbe', 'pricing']),
      }),
    ])
  })

  it('uses a bundled common-model portrait as the initial qualitative profile while leaving live probing open', async () => {
    const ctx = context()
    ctx.llm.listProviders = vi.fn(() => [{ id: 'openai', name: 'OpenAI' }])
    ctx.llm.listModels = vi.fn(async () => [{
      provider: 'openai', id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', inputModalities: ['text', 'image'],
    }])
    const result = await prepareModelPortraits(ctx, { ids: ['llm:openai/gpt-5.6-terra'] })
    expect(result.candidates).toEqual([
      expect.objectContaining({
        id: 'llm:openai/gpt-5.6-terra',
        portraitSource: 'bundled',
        portraitState: 'valid',
        needsInitialPortrait: false,
        gaps: ['lastProbe'],
      }),
    ])
  })

  it('bundles official documentation entry points by provider', () => {
    expect(officialResearchSources('volcengine')).toEqual([VOLCENGINE_ARK_DOCS])
    expect(officialResearchSources('doubao-speech')).toEqual([DOUBAO_SPEECH_DOCS])
    expect(officialResearchSources('anthropic')).toEqual([ANTHROPIC_MODELS_DOCS, ANTHROPIC_PRICING_DOCS])
    expect(officialResearchSources('openai')).toEqual([OPENAI_MODELS_DOCS, OPENAI_PRICING_DOCS, OPENAI_IMAGE_DOCS, OPENAI_VIDEO_DOCS])
    expect(officialResearchSources('google')).toEqual([GOOGLE_MODELS_DOCS, GOOGLE_PRICING_DOCS, GOOGLE_VIDEO_DOCS])
    expect(officialResearchSources('deepseek')).toEqual([DEEPSEEK_MODELS_DOCS, DEEPSEEK_PRICING_DOCS])
    expect(officialResearchSources('moonshotai')).toEqual([KIMI_MODELS_DOCS, KIMI_PRICING_DOCS])
    expect(officialResearchSources('zai')).toEqual([ZAI_MODELS_DOCS, ZAI_PRICING_DOCS])
    expect(officialResearchSources('xai')).toEqual([XAI_MODELS_DOCS, XAI_PRICING_DOCS])
    expect(officialResearchSources('qwen-token-plan')).toEqual([QWEN_MODELS_DOCS, QWEN_PRICING_DOCS, QWEN_OPEN_WEIGHTS_DOCS])
    expect(officialResearchSources('minimax')).toEqual([
      MINIMAX_MODELS_DOCS,
      MINIMAX_H3_DOCS,
      MINIMAX_H3_OPEN_SOURCE_DOCS,
      MINIMAX_MULTIMODAL_DOCS,
      MINIMAX_IMAGE_DOCS,
      MINIMAX_PRICING_DOCS,
      MINIMAX_LOCAL_DEPLOY_DOCS,
    ])
    expect(officialResearchSources('mistral')).toEqual([MISTRAL_MODELS_DOCS, MISTRAL_PRICING_DOCS])
    expect(officialResearchSources('unknown-provider')).toEqual([])
  })

  it('ingests researched specialties and prices that cite an http(s) source', async () => {
    const ctx = context()
    const result = await ingestPortraitResearch(ctx, {
      id: 'doubao/tts',
      findings: {
        specialties: ['Mandarin TTS'],
        limitations: ['resource id must be enabled'],
        pricing: {
          rates: [{
            operation: 'synthesize',
            unit: '1m-characters',
            amount: 100,
            currency: 'cny',
            evidenceId: 'volc-tts-doc',
          }],
        },
        evidence: [docsEvidence],
      },
    })
    expect(JSON.stringify(result)).not.toContain(SECRET)
    expect(result).toMatchObject({
      mergedFrom: 'research',
      preservedLastProbe: true,
      portrait: {
        specialties: ['Mandarin TTS'],
        pricing: { rates: [{ currency: 'CNY', evidenceId: 'volc-tts-doc' }] },
        performance: { lastProbe },
      },
    })
  })

  it('rejects research with no evidence records', async () => {
    await expect(ingestPortraitResearch(context(), {
      id: 'doubao/tts',
      findings: { specialties: ['Mandarin TTS'], evidence: [] },
    })).rejects.toMatchObject({ code: 'RESEARCH_EVIDENCE_REQUIRED' })
  })

  it('rejects a price rate that does not cite researched evidence', async () => {
    await expect(ingestPortraitResearch(context(), {
      id: 'doubao/tts',
      findings: {
        pricing: {
          rates: [{ operation: 'synthesize', unit: '1m-characters', amount: 100, currency: 'cny' }],
        },
        evidence: [docsEvidence],
      },
    })).rejects.toMatchObject({ code: 'RESEARCH_PRICE_EVIDENCE_REQUIRED' })
  })

  it('rejects lastProbe copied from documentation', async () => {
    await expect(ingestPortraitResearch(context(), {
      id: 'doubao/tts',
      findings: {
        performance: { lastProbe },
        evidence: [docsEvidence],
      },
    })).rejects.toMatchObject({ code: 'RESEARCH_CANNOT_WRITE_PROBE' })
  })

  it('rejects a non-http evidence source', async () => {
    await expect(ingestPortraitResearch(context(), {
      id: 'doubao/tts',
      findings: {
        evidence: [{
          id: 'note-1',
          kind: 'provider-doc',
          source: 'volcengine-docs',
          observedAt: '2026-08-20T12:00:00.000Z',
          claims: ['price'],
        }],
      },
    })).rejects.toMatchObject({ code: 'RESEARCH_EVIDENCE_SOURCE_INVALID' })
  })

  it('rejects runtime-probe evidence on the research ingest path', async () => {
    await expect(ingestPortraitResearch(context(), {
      id: 'doubao/tts',
      findings: {
        evidence: [{
          id: 'probe-1',
          kind: 'runtime-probe',
          source: 'https://example.invalid/probe',
          observedAt: '2026-08-20T12:00:00.000Z',
          claims: ['reachable'],
        }],
      },
    })).rejects.toMatchObject({ code: 'RESEARCH_EVIDENCE_KIND_INVALID' })
  })
})
