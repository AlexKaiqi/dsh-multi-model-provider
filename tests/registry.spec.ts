import { Context, type Fiber } from '@deepseek-ai/cordis'
import SettingsProvider, { type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it, vi } from 'vitest'
import { MODEL_MANAGER_GUIDANCE } from '../src/model/guidance.ts'
import {
  BUILTIN_TASK_MODEL_REGISTRY,
  discoverTaskModels,
  listTaskModels,
  registerTaskModel,
  registerTaskModelSettings,
  selectTaskModels,
  TASK_MODEL_REGISTRY_SCHEMA,
  TASK_MODEL_SETTINGS_NAMESPACE,
  validateTaskModelRegistry,
} from '../src/registry.ts'
import type { TaskModelRegistryConfig } from '../src/types.ts'
import { modelManagerTools } from '../src/tools.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  private readonly document: Record<string, unknown> = {}

  protected async load(): Promise<Record<string, unknown>> {
    return structuredClone(this.document)
  }

  protected async persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.document[String(ns)] = structuredClone(section)
  }
}

function context(
  value: TaskModelRegistryConfig = BUILTIN_TASK_MODEL_REGISTRY,
  user?: Record<string, unknown>,
): Context {
  return {
    settings: {
      describe: vi.fn(() => [{
        ns: TASK_MODEL_SETTINGS_NAMESPACE,
        schema: TASK_MODEL_REGISTRY_SCHEMA.toJSON(),
        value,
        ...(user === undefined ? {} : { user }),
        revision: 3,
        applies: 'live',
      }]),
      mutate: vi.fn(async () => undefined),
    },
    credentials: {
      describe: vi.fn(async () => ({ configured: false, writable: true })),
      resolve: vi.fn(async () => ({ value: 'secret-that-must-not-leak', source: 'file' })),
    },
    llm: {
      listProviders: vi.fn(() => []),
      listConfigurableProviders: vi.fn(() => []),
    },
    agentDefaultModel: {
      saveSelection: vi.fn(async () => undefined),
    },
  } as unknown as Context
}

describe('task-model registry', () => {
  it('registers a schema-driven Settings section with the built-in catalog as its base layer', async () => {
    const ctx = new Context()
    const fibers: Fiber[] = []
    try {
      fibers.push(await ctx.plugin(MemorySettings))
      fibers.push(await ctx.plugin({
        name: 'test-task-model-registry',
        inject: ['settings'],
        apply: registerTaskModelSettings,
      }))

      const descriptor = ctx.settings.describe({ redactSecrets: true })
        .find(item => item.ns === TASK_MODEL_SETTINGS_NAMESPACE)
      expect(descriptor).toMatchObject({
        ns: TASK_MODEL_SETTINGS_NAMESPACE,
        applies: 'live',
        base: {
          models: {
            'openai/gpt-image-2': { task: 'image-generation' },
          },
        },
        value: {
          connections: {
            openai: { credentialRef: 'OPENAI_API_KEY' },
            'doubao-speech': {
              credentialRefs: {
                speechAppId: 'DOUBAO_APPID',
                speechToken: 'DOUBAO_TOKEN',
                realtimeApiKey: 'DOUBAO_REALTIME_API_KEY',
              },
            },
          },
          models: { 'openai/gpt-image-2': { runtimeAdapter: 'openai-images' } },
        },
      })
      expect(descriptor?.schema).toBeDefined()
    } finally {
      for (const fiber of fibers.reverse()) await fiber.dispose()
    }
  })

  it('ships GPT Image 2 as registered catalog metadata without claiming runtime callability', async () => {
    const result = await listTaskModels(context(), { task: 'image-generation' })

    expect(result).toMatchObject({
      count: 1,
      models: [{
        id: 'openai/gpt-image-2',
        provider: 'openai',
        model: 'gpt-image-2',
        task: 'image-generation',
        registration: 'built-in',
        availability: {
          status: 'registered-only',
          callable: false,
          requiredAdapter: 'openai-images',
        },
        connectionProfile: {
          credential: { ref: 'OPENAI_API_KEY', configured: false, writable: true },
        },
      }],
    })
    expect(JSON.stringify(result)).not.toContain('sk-secret')
  })

  it('ships conservative Doubao ASR, TTS, and Realtime registrations with Lore-compatible capabilities', async () => {
    const result = await listTaskModels(context(), { provider: 'doubao-speech' })
    expect(result.count).toBe(3)
    expect(result.models).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'doubao/volc.bigasr.sauc.duration',
        capabilities: ['speech.transcribe.file', 'speech.transcribe.stream'],
        availability: expect.objectContaining({ status: 'registered-only', callable: false, requiredAdapter: 'doubao-speech' }),
      }),
      expect.objectContaining({
        id: 'doubao/seed-tts-1.0',
        capabilities: ['speech.synthesize.short'],
      }),
      expect.objectContaining({
        id: 'doubao/realtime-duplex-3.0',
        model: '1.2.6.0',
        capabilities: ['speech.realtime_session'],
        availability: expect.objectContaining({ status: 'registered-only', callable: false, requiredAdapter: 'doubao-realtime-duplex' }),
      }),
    ]))
  })

  it('does not pretend the Ark language-model catalog is a Doubao speech catalog', async () => {
    await expect(discoverTaskModels(context(), { connection: 'doubao-speech' }))
      .rejects.toMatchObject({ code: 'TASK_MODEL_CATALOG_UNAVAILABLE' })
  })

  it('accepts an empty available-model selection as explicitly all disabled', async () => {
    const ctx = context()
    const result = await selectTaskModels(ctx, { connection: 'doubao-speech', ids: [] })
    expect(result).toMatchObject({
      connection: 'doubao-speech',
      selected: [],
      allDisabled: true,
      disabled: expect.arrayContaining([
        'doubao/volc.bigasr.sauc.duration',
        'doubao/seed-tts-1.0',
      ]),
    })
    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      TASK_MODEL_SETTINGS_NAMESPACE,
      expect.arrayContaining([
        { op: 'set', path: ['models', 'doubao/volc.bigasr.sauc.duration', 'enabled'], value: false },
        { op: 'set', path: ['models', 'doubao/seed-tts-1.0', 'enabled'], value: false },
      ]),
      3,
    )
  })

  it('reports a route callable only when its adapter and every credential are ready', async () => {
    const ctx = context()
    vi.mocked(ctx.credentials.describe).mockResolvedValue({ configured: true, writable: true, source: 'file' })
    ;(ctx as Context & { taskModelRuntime: { hasAdapter(): boolean } }).taskModelRuntime = { hasAdapter: () => true }
    const result = await listTaskModels(ctx, { id: 'openai/gpt-image-2' })
    expect(result).toMatchObject({
      models: [{
        availability: {
          status: 'callable',
          callable: true,
          requiredAdapter: 'openai-images',
        },
      }],
    })
  })

  it('writes connection and task-model fields using task defaults and credential references only', async () => {
    const ctx = context()
    const result = await registerTaskModel(ctx, {
      id: 'openai/tts-1',
      connection: 'openai',
      credentialRef: 'OPENAI_API_KEY',
      model: 'tts-1',
      displayName: 'OpenAI TTS 1',
      task: 'speech-synthesis',
      runtimeAdapter: 'openai-audio',
    })

    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      TASK_MODEL_SETTINGS_NAMESPACE,
      expect.arrayContaining([
        { op: 'set', path: ['connections', 'openai', 'provider'], value: 'openai' },
        { op: 'set', path: ['connections', 'openai', 'credentialRef'], value: 'OPENAI_API_KEY' },
        { op: 'set', path: ['models', 'openai/tts-1', 'input'], value: ['text'] },
        { op: 'set', path: ['models', 'openai/tts-1', 'output'], value: ['audio'] },
        { op: 'set', path: ['models', 'openai/tts-1', 'execution'], value: 'streaming' },
      ]),
      3,
    )
    expect(result).toMatchObject({
      id: 'openai/tts-1',
      registered: true,
      callable: false,
      requiredAdapter: 'openai-audio',
      credential: { ref: 'OPENAI_API_KEY', configured: false },
    })
  })

  it('registers a Lore-compatible Doubao multimodal route with named credentials and capabilities', async () => {
    const ctx = context()
    const result = await registerTaskModel(ctx, {
      id: 'doubao/big-asr',
      connection: 'doubao-speech',
      credentialRefs: {
        speechAppId: 'DOUBAO_APPID',
        speechToken: 'DOUBAO_TOKEN',
        realtimeApiKey: 'DOUBAO_REALTIME_API_KEY',
      },
      connectionProfile: {
        region: 'cn-north-1',
        defaultVoice: 'zh_female_cancan_mars_bigtts',
      },
      model: 'volc.bigasr.sauc.duration',
      displayName: '豆包大模型录音文件识别',
      task: 'transcription',
      runtimeAdapter: 'doubao-speech',
      credentialNames: ['speechAppId', 'speechToken'],
      input: ['audio', 'file'],
      execution: 'streaming',
      capabilities: ['speech.transcribe.file', 'speech.transcribe.stream'],
      operations: ['transcribe-file', 'transcribe-stream'],
      roles: ['speech-to-text'],
      profile: {
        evidence: 'manual',
      },
    })

    expect(ctx.settings.mutate).toHaveBeenCalledWith(
      TASK_MODEL_SETTINGS_NAMESPACE,
      expect.arrayContaining([
        {
          op: 'set',
          path: ['connections', 'doubao-speech', 'credentialRefs'],
          value: { speechAppId: 'DOUBAO_APPID', speechToken: 'DOUBAO_TOKEN', realtimeApiKey: 'DOUBAO_REALTIME_API_KEY' },
        },
        {
          op: 'set',
          path: ['connections', 'doubao-speech', 'profile'],
          value: { region: 'cn-north-1', defaultVoice: 'zh_female_cancan_mars_bigtts' },
        },
        {
          op: 'set',
          path: ['models', 'doubao/big-asr', 'capabilities'],
          value: ['speech.transcribe.file', 'speech.transcribe.stream'],
        },
        { op: 'set', path: ['models', 'doubao/big-asr', 'input'], value: ['audio', 'file'] },
      ]),
      3,
    )
    expect(result).toMatchObject({
      id: 'doubao/big-asr',
      registered: true,
      callable: false,
      credentials: {
        speechAppId: { ref: 'DOUBAO_APPID', configured: false },
        speechToken: { ref: 'DOUBAO_TOKEN', configured: false },
      },
    })
    expect(JSON.stringify(result)).not.toContain('zh_female_cancan_mars_bigtts')
  })

  it('lists named credential status and capability metadata without exposing secret values', async () => {
    const value: TaskModelRegistryConfig = {
      connections: {
        doubao: {
          provider: 'doubao',
          credentialRefs: { appId: 'DOUBAO_APPID', token: 'DOUBAO_TOKEN' },
          profile: { catalogDiscovery: 'manual-resource-id' },
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
          profile: { defaultVoice: 'configured-on-connection' },
        },
      },
      defaults: {},
    }
    const result = await listTaskModels(context(value, { models: { 'doubao/tts': {} } }), {
      provider: 'doubao',
      includeProfile: true,
    })

    expect(result).toMatchObject({
      count: 1,
      models: [{
        id: 'doubao/tts',
        capabilities: ['speech.synthesize.short'],
        connectionProfile: {
          credentials: {
            appId: { ref: 'DOUBAO_APPID', configured: false },
            token: { ref: 'DOUBAO_TOKEN', configured: false },
          },
          metadata: { catalogDiscovery: 'manual-resource-id' },
        },
        profile: { defaultVoice: 'configured-on-connection' },
      }],
    })
  })

  it('rejects invalid connection data before mutating settings', async () => {
    const ctx = context()
    await expect(registerTaskModel(ctx, {
      id: 'custom/video',
      connection: 'custom',
      provider: 'custom',
      credentialRef: 'not a credential ref',
      baseURL: 'file:///tmp/provider',
      model: 'video',
      task: 'video-generation',
    })).rejects.toMatchObject({ code: 'INVALID_TASK_MODEL_CONFIGURATION' })
    expect(ctx.settings.mutate).not.toHaveBeenCalled()
  })

  it('rejects a literal or non-string value in named credential references', async () => {
    const ctx = context()
    await expect(registerTaskModel(ctx, {
      id: 'doubao/tts',
      connection: 'doubao',
      credentialRefs: { token: 'literal-token' },
      model: 'seed-tts-1.0',
      task: 'speech-synthesis',
    })).rejects.toMatchObject({ code: 'INVALID_TASK_MODEL_CONFIGURATION' })
    expect(ctx.settings.mutate).not.toHaveBeenCalled()
  })

  it('rejects defaults that point at a model serving a different task', () => {
    expect(() => validateTaskModelRegistry({
      connections: {
        openai: { provider: 'openai' },
      },
      models: {
        image: {
          connection: 'openai',
          model: 'image',
          task: 'image-generation',
          input: ['text'],
          output: ['image'],
          execution: 'request-response',
          operations: ['generate'],
          roles: [],
          profile: {},
        },
      },
      defaults: { transcription: 'image' },
    })).toThrow("defaults.transcription references a 'image-generation' model")
  })

  it('validates task portraits written directly by the Settings UI', () => {
    const value = structuredClone(BUILTIN_TASK_MODEL_REGISTRY)
    ;(value.models['doubao/seed-tts-1.0'] as { portrait: unknown }).portrait = {
      summary: '   ',
      specialties: [],
      limitations: [],
      bestFor: [],
      avoidFor: [],
      pricing: { rates: [] },
      performance: {},
      qualityScores: {},
      evidence: [],
    }
    expect(() => validateTaskModelRegistry(value)).toThrow('summary must not be blank')
  })
})

describe('task-model agent surface', () => {
  it('exposes registration and inspection without any raw API-key argument', () => {
    const tools = modelManagerTools(context())
    const register = tools.find(tool => tool.name === 'register_task_model')
    expect(tools.map(tool => tool.name)).toEqual(expect.arrayContaining([
      'list_task_models',
      'register_task_model',
    ]))
    expect(register?.parameters.properties).toHaveProperty('credentialRef')
    expect(register?.parameters.properties).toHaveProperty('credentialRefs')
    expect(register?.parameters.properties).toHaveProperty('capabilities')
    expect(register?.parameters.properties).not.toHaveProperty('apiKey')
    expect(MODEL_MANAGER_GUIDANCE).toContain('never describe registered-only routes as callable')
  })
})
