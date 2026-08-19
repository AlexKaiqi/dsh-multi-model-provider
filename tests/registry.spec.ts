import { Context, type Fiber } from '@deepseek-ai/cordis'
import SettingsProvider, { type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it, vi } from 'vitest'
import { MODEL_MANAGER_GUIDANCE } from '../src/model/guidance.ts'
import {
  BUILTIN_TASK_MODEL_REGISTRY,
  listTaskModels,
  registerTaskModel,
  registerTaskModelSettings,
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
          connections: { openai: { credentialRef: 'OPENAI_API_KEY' } },
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
    expect(register?.parameters.properties).not.toHaveProperty('apiKey')
    expect(MODEL_MANAGER_GUIDANCE).toContain('never describe registered-only routes as callable')
  })
})
