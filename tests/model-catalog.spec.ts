import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { describe, expect, it, vi } from 'vitest'
import { selectAgentModel, snapshotModelCatalog } from '../src/catalog.ts'
import { TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'
import type { ModelPortrait, RegisteredTaskModel, TaskModelRegistryConfig } from '../src/types.ts'

const SECRET = 'secret-that-must-not-leak'

function portrait(summary: string, lastProbe: ModelPortrait['performance']['lastProbe']): ModelPortrait {
  return {
    schemaVersion: 1,
    summary,
    specialties: ['Mandarin'],
    limitations: [],
    bestFor: [],
    avoidFor: [],
    pricing: { rates: [] },
    performance: { speedClass: 'fast', lastProbe },
    qualityScores: {},
    evidence: [],
    validation: { state: 'partial', checks: [] },
  }
}

const tts: RegisteredTaskModel = {
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
  portrait: portrait('Low-latency Mandarin TTS.', {
    observedAt: '2026-08-20T00:00:00.000Z',
    reachable: true,
    latencyMs: 180,
  }),
}

const registry: TaskModelRegistryConfig = {
  connections: {
    doubao: {
      provider: 'doubao',
      credentialRefs: { appId: 'DOUBAO_APPID', token: 'DOUBAO_TOKEN' },
    },
    openai: {
      provider: 'openai',
      credentialRef: 'OPENAI_API_KEY',
    },
  },
  models: {
    'doubao/tts': tts,
    'doubao/realtime': {
      connection: 'doubao',
      model: 'realtime-duplex-3.0',
      task: 'realtime-speech',
      runtimeAdapter: 'doubao-realtime-duplex',
      input: ['text', 'audio'],
      output: ['text', 'audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: ['voice-deliberation'],
      profile: {},
      portrait: portrait('Realtime duplex.', {
        observedAt: '2026-08-20T00:00:00.000Z',
        reachable: true,
        latencyMs: 90,
      }),
    },
    'openai/gpt-image-2': {
      connection: 'openai',
      model: 'gpt-image-2',
      task: 'image-generation',
      runtimeAdapter: 'openai-images',
      input: ['text', 'image'],
      output: ['image'],
      execution: 'request-response',
      capabilities: ['image.generate'],
      operations: ['generate'],
      roles: ['image-generator'],
      profile: {},
      portrait: portrait('Image generation.', {
        observedAt: '2026-08-20T00:00:00.000Z',
        reachable: true,
        latencyMs: 900,
      }),
    },
  },
  defaults: { 'speech-synthesis': 'doubao/tts' },
  portraits: {
    'llm:volcengine/doubao-seed-1-6': {
      kind: 'llm',
      provider: 'volcengine',
      model: 'doubao-seed-1-6',
      portrait: portrait('Ark language model.', {
        observedAt: '2026-08-20T00:00:00.000Z',
        reachable: true,
        latencyMs: 420,
      }),
    },
  },
}

function context(
  value: TaskModelRegistryConfig = registry,
  hasAdapter: (id: string | undefined) => boolean = () => true,
): Context {
  return {
    settings: {
      describe: vi.fn(() => [{
        ns: TASK_MODEL_SETTINGS_NAMESPACE,
        schema: TASK_MODEL_REGISTRY_SCHEMA.toJSON(),
        value,
        revision: 7,
        applies: 'live',
      }]),
    },
    credentials: {
      describe: vi.fn(async () => ({ configured: true, writable: true, source: 'file' })),
      resolve: vi.fn(async () => ({ value: SECRET, source: 'file' })),
    },
    taskModelRuntime: {
      hasAdapter: vi.fn((id?: string) => hasAdapter(id)),
    },
    agentDefaultModel: {
      saveSelection: vi.fn(async () => undefined),
    },
    llm: {
      listProviders: vi.fn(() => [{ id: 'volcengine', name: 'Volcengine Ark' }]),
      listConfigurableProviders: vi.fn(() => []),
      listModels: vi.fn(async () => [{ provider: 'volcengine', id: 'doubao-seed-1-6' }]),
      resolveModelInfo: vi.fn(async (provider: string, model: string) => ({
        provider,
        id: model,
        name: model,
        inputModalities: ['text'],
        context: { contextWindow: 128000 },
        defaultMaxTokens: 8192,
        reasoning: { efforts: [] },
      })),
    },
  } as unknown as Context
}

describe('model catalog for peer plugins', () => {
  it('returns every registered model with portraits and lastProbe, without secrets', async () => {
    const snapshot = await snapshotModelCatalog(context())
    expect(JSON.stringify(snapshot)).not.toContain(SECRET)
    expect(snapshot.defaults).toEqual({ 'speech-synthesis': 'doubao/tts' })
    expect(snapshot.taskModels.map(model => model.id)).toEqual([
      'doubao/tts',
      'doubao/realtime',
      'openai/gpt-image-2',
    ])
    expect(snapshot.taskModels).toEqual([
      expect.objectContaining({
        id: 'doubao/tts',
        task: 'speech-synthesis',
        capabilities: ['speech.synthesize.short'],
        availability: expect.objectContaining({ callable: true }),
        portrait: expect.objectContaining({
          summary: 'Low-latency Mandarin TTS.',
          performance: expect.objectContaining({
            lastProbe: expect.objectContaining({ latencyMs: 180, reachable: true }),
          }),
        }),
      }),
      expect.objectContaining({
        id: 'doubao/realtime',
        task: 'realtime-speech',
        capabilities: ['speech.realtime_session'],
      }),
      expect.objectContaining({
        id: 'openai/gpt-image-2',
        task: 'image-generation',
        provider: 'openai',
      }),
    ])
    expect(snapshot.languagePortraits).toEqual([
      expect.objectContaining({
        id: 'llm:volcengine/doubao-seed-1-6',
        kind: 'llm',
        portrait: expect.objectContaining({
          performance: expect.objectContaining({
            lastProbe: expect.objectContaining({ latencyMs: 420 }),
          }),
        }),
      }),
    ])
    expect(snapshot.languageModels).toEqual([
      expect.objectContaining({
        id: 'llm:volcengine/doubao-seed-1-6',
        kind: 'llm',
        provider: 'volcengine',
        model: 'doubao-seed-1-6',
        status: 'live',
        portrait: expect.objectContaining({
          performance: expect.objectContaining({
            lastProbe: expect.objectContaining({ latencyMs: 420 }),
          }),
        }),
      }),
    ])
    expect(snapshot.unresolvedLanguagePortraitIds).toEqual([])
    expect(snapshot.note).toMatch(/snapshot\(\)/)
    expect(snapshot.note).toMatch(/selectAgentModel/)
  })

  it('keeps a missing adapter as registered-only instead of dropping the model', async () => {
    const snapshot = await snapshotModelCatalog(context(registry, id => id !== 'openai-images'))
    const image = snapshot.taskModels.find(model => model.id === 'openai/gpt-image-2')
    expect(image).toEqual(expect.objectContaining({
      id: 'openai/gpt-image-2',
      availability: expect.objectContaining({ callable: false }),
    }))
  })

  it('records LLM portrait ids that the language runtime cannot resolve', async () => {
    const ctx = context()
    ctx.llm.resolveModelInfo = vi.fn(async () => {
      throw new Error('model missing')
    })
    const snapshot = await snapshotModelCatalog(ctx)
    expect(snapshot.languagePortraits).toEqual([])
    expect(snapshot.unresolvedLanguagePortraitIds).toEqual(['llm:volcengine/doubao-seed-1-6'])
    expect(snapshot.languageModels).toEqual([
      expect.objectContaining({
        id: 'llm:volcengine/doubao-seed-1-6',
        status: 'live',
      }),
    ])
    expect(snapshot.languageModels[0]).not.toHaveProperty('portrait')
  })
})

describe('selectAgentModel', () => {
  it('saves a live catalog language model as the Agent model', async () => {
    const saveSelection = vi.fn(async () => undefined)
    const ctx = context()
    ctx.agentDefaultModel.saveSelection = saveSelection
    ctx.llm.resolveModelInfo = vi.fn(async () => ({
      provider: 'volcengine',
      id: 'doubao-seed-1-6',
      name: 'Doubao Seed 1.6',
      context: { contextWindow: 128000 },
      reasoning: { efforts: [{ id: ReasoningEffortId('high'), name: 'High' }] },
    }))
    const result = await selectAgentModel(ctx, {
      provider: 'volcengine',
      model: 'doubao-seed-1-6',
      reasoningEffort: 'high',
    })
    expect(JSON.stringify(result)).not.toContain(SECRET)
    expect(saveSelection).toHaveBeenCalledWith({
      provider: 'volcengine',
      model: 'doubao-seed-1-6',
      reasoningEffort: 'high',
    })
    expect(result).toMatchObject({
      selection: { provider: 'volcengine', model: 'doubao-seed-1-6', reasoningEffort: 'high' },
      catalog: { id: 'llm:volcengine/doubao-seed-1-6', status: 'live' },
      appliesTo: 'new-agents',
      currentSessionChanged: false,
    })
  })

  it('rejects a model that is not in the language catalog', async () => {
    await expect(selectAgentModel(context(), {
      provider: 'openai',
      model: 'gpt-test',
    })).rejects.toMatchObject({ code: 'UNKNOWN_AGENT_MODEL' })
  })

  it('rejects a task model as the Agent model', async () => {
    await expect(selectAgentModel(context(), {
      provider: 'doubao',
      model: 'tts',
    })).rejects.toMatchObject({ code: 'NOT_AN_AGENT_MODEL' })
  })

  it('rejects an effort the catalog model does not advertise', async () => {
    await expect(selectAgentModel(context(), {
      provider: 'volcengine',
      model: 'doubao-seed-1-6',
      reasoningEffort: 'high',
    })).rejects.toMatchObject({ code: 'UNSUPPORTED_REASONING_EFFORT' })
  })
})
