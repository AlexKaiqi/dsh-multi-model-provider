import type { Context } from '@deepseek-ai/cordis'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it, vi } from 'vitest'
import { MODEL_MANAGER_GUIDANCE } from '../src/guidance.ts'
import {
  configureModelRoute,
  listModelRoutes,
  ModelManagerError,
  PI_AI_SETTINGS_NAMESPACE,
  selectDefaultModel,
} from '../src/operations.ts'
import { modelManagerTools } from '../src/tools.ts'

function context(overrides: Record<string, unknown> = {}): Context {
  return {
    settings: {
      describe: vi.fn(() => [{
        ns: PI_AI_SETTINGS_NAMESPACE,
        schema: {},
        value: { providers: {} },
        revision: 7,
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
    ...overrides,
  } as unknown as Context
}

describe('configureModelRoute', () => {
  it('writes a provider profile with a credential reference and no secret value', async () => {
    const mutate = vi.fn(async () => undefined)
    const ctx = context({
      settings: {
        describe: vi.fn(() => [{
          ns: PI_AI_SETTINGS_NAMESPACE,
          schema: {},
          value: { providers: {} },
          revision: 7,
          applies: 'live',
        }]),
        mutate,
      },
    })

    const result = await configureModelRoute(ctx, {
      provider: 'openai',
      apiKeyEnv: 'OPENAI_API_KEY',
    })

    expect(mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      [{
        op: 'set',
        path: ['providers', 'openai', 'apiKeyEnv'],
        value: 'OPENAI_API_KEY',
      }],
      7,
    )
    expect(result).toMatchObject({
      provider: 'openai',
      saved: true,
      requiresCredential: true,
      credential: { ref: 'OPENAI_API_KEY', configured: false, writable: true },
    })
    expect(JSON.stringify(result)).not.toContain('sk-secret')
  })

  it('rejects a non-URL endpoint before settings are changed', async () => {
    const ctx = context()
    await expect(configureModelRoute(ctx, {
      provider: 'gateway',
      baseURL: 'not a URL',
    })).rejects.toMatchObject({ code: 'INVALID_MODEL_CONFIGURATION' })
    expect(ctx.settings.mutate).not.toHaveBeenCalled()
  })

  it('fails clearly when llm-pi-ai is not mounted', async () => {
    const ctx = context({
      settings: {
        describe: vi.fn(() => []),
        mutate: vi.fn(),
      },
    })
    await expect(configureModelRoute(ctx, { provider: 'openai' }))
      .rejects.toEqual(expect.objectContaining<ModelManagerError>({ code: 'MODEL_SETTINGS_UNAVAILABLE' }))
  })
})

describe('listModelRoutes', () => {
  it('merges live adapter metadata, directory metadata, model catalog, and safe credential state', async () => {
    const ctx = context({
      settings: {
        describe: vi.fn(() => [{
          ns: settingsNamespace('llm-pi-ai'),
          schema: {},
          value: { providers: { openai: { apiKeyEnv: 'OPENAI_API_KEY' } } },
          revision: 2,
          applies: 'live',
        }]),
      },
      credentials: {
        describe: vi.fn(async () => ({ configured: true, writable: true, source: 'file' })),
      },
      llm: {
        listProviders: vi.fn(() => [{ id: 'openai', name: 'OpenAI' }]),
        listConfigurableProviders: vi.fn(() => [
          {
            provider: 'openai',
            displayName: 'OpenAI',
            settingsNs: 'llm-pi-ai',
            settingsPath: ['providers', 'openai'],
            declared: false,
          },
          {
            provider: 'custom',
            displayName: 'Custom',
            settingsNs: 'llm-pi-ai',
            settingsPath: ['providers', 'custom'],
            declared: true,
          },
        ]),
        listModels: vi.fn(async () => [{
          provider: 'openai',
          id: 'gpt-test',
          name: 'GPT Test',
          inputModalities: ['text'],
        }]),
      },
    })

    await expect(listModelRoutes(ctx)).resolves.toMatchObject({
      liveCount: 1,
      dormantCount: 1,
      providers: [{
        provider: 'openai',
        displayName: 'OpenAI',
        status: 'live',
        declared: false,
        credential: { ref: 'OPENAI_API_KEY', configured: true, source: 'file' },
        models: [{ id: 'gpt-test' }],
      }],
    })
  })

  it('requires an exact known route when provider is requested', async () => {
    await expect(listModelRoutes(context(), { provider: 'missing' }))
      .rejects.toMatchObject({ code: 'UNKNOWN_MODEL_PROVIDER' })
  })
})

describe('selectDefaultModel', () => {
  it('resolves the exact model and saves a validated selection for future agents', async () => {
    const saveSelection = vi.fn(async () => undefined)
    const ctx = context({
      llm: {
        resolveModelInfo: vi.fn(async () => ({
          provider: 'openai',
          id: 'gpt-test',
          name: 'GPT Test',
          context: { contextWindow: 200_000 },
          reasoning: {
            efforts: [{ id: ReasoningEffortId('high'), name: 'High' }],
          },
        })),
      },
      agentDefaultModel: { saveSelection },
    })

    const result = await selectDefaultModel(ctx, {
      provider: 'openai',
      model: 'gpt-test',
      reasoningEffort: 'high',
    })

    expect(saveSelection).toHaveBeenCalledWith({
      provider: 'openai',
      model: 'gpt-test',
      reasoningEffort: 'high',
    })
    expect(result).toMatchObject({
      selection: { provider: 'openai', model: 'gpt-test', reasoningEffort: 'high' },
      appliesTo: 'new-agents',
      currentSessionChanged: false,
    })
  })

  it('rejects an effort the model does not advertise', async () => {
    const ctx = context({
      llm: {
        resolveModelInfo: vi.fn(async () => ({
          provider: 'openai', id: 'gpt-test', name: 'GPT Test',
        })),
      },
    })
    await expect(selectDefaultModel(ctx, {
      provider: 'openai', model: 'gpt-test', reasoningEffort: 'high',
    })).rejects.toMatchObject({ code: 'UNSUPPORTED_REASONING_EFFORT' })
  })
})

describe('model-facing surface', () => {
  it('teaches secure credential handling and exposes no raw apiKey argument', () => {
    const tools = modelManagerTools(context())
    const configure = tools.find(tool => tool.name === 'configure_model_route')
    expect(MODEL_MANAGER_GUIDANCE).toContain('Never ask the user to paste an API key into chat')
    expect(configure?.parameters.properties).toHaveProperty('apiKeyEnv')
    expect(configure?.parameters.properties).not.toHaveProperty('apiKey')
  })
})
