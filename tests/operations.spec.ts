import type { Context } from '@deepseek-ai/cordis'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import { describe, expect, it, vi } from 'vitest'
import { MODEL_MANAGER_GUIDANCE } from '../src/model/guidance.ts'
import {
  configureModelRoute,
  listModelRoutes,
  ModelManagerError,
  PI_AI_SETTINGS_NAMESPACE,
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

  it.each([
    { provider: 'openai' },
    { provider: 'openai', models: [] },
  ])('keeps an existing provider unchanged for an empty effective update: $provider', async (input) => {
    const mutate = vi.fn(async () => undefined)
    const ctx = context({
      settings: {
        describe: vi.fn(() => [{
          ns: PI_AI_SETTINGS_NAMESPACE,
          schema: {},
          value: {
            providers: {
              openai: {
                apiKeyEnv: 'OPENAI_API_KEY',
                baseURL: 'https://api.openai.example/v1',
                models: [{ id: 'gpt-existing' }],
              },
            },
          },
          revision: 7,
          applies: 'live',
        }]),
        mutate,
      },
    })

    await expect(configureModelRoute(ctx, input)).resolves.toMatchObject({
      provider: 'openai',
      saved: true,
      changed: false,
    })
    expect(mutate).not.toHaveBeenCalled()
  })

  it('creates a missing provider for a provider-only request', async () => {
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

    await expect(configureModelRoute(ctx, { provider: 'gateway' })).resolves.toMatchObject({ changed: true })
    expect(mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      [{ op: 'set', path: ['providers', 'gateway'], value: {} }],
      7,
    )
  })

  it('rejects a non-URL endpoint before settings are changed', async () => {
    const ctx = context()
    await expect(configureModelRoute(ctx, {
      provider: 'gateway',
      baseURL: 'not a URL',
    })).rejects.toMatchObject({ code: 'INVALID_MODEL_CONFIGURATION' })
    expect(ctx.settings.mutate).not.toHaveBeenCalled()
  })

  it('does not turn discovered output capacity into a per-request limit', async () => {
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
      provider: 'gateway',
      models: [{ id: 'large-model', contextWindow: 272_000, maxTokens: 128_000 }],
    })

    expect(mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      [{
        op: 'set',
        path: ['providers', 'gateway', 'models'],
        value: [{ id: 'large-model', contextWindow: 272_000 }],
      }],
      7,
    )
    expect(result).toMatchObject({
      warnings: [{
        code: 'MODEL_OUTPUT_CAPACITY_NOT_PERSISTED',
        models: ['large-model'],
      }],
    })
  })

  it('persists an explicitly selected per-request output limit', async () => {
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

    await configureModelRoute(ctx, {
      provider: 'gateway',
      models: [{ id: 'large-model', requestMaxTokens: 4096 }],
    })

    expect(mutate).toHaveBeenCalledWith(
      PI_AI_SETTINGS_NAMESPACE,
      [{
        op: 'set',
        path: ['providers', 'gateway', 'models'],
        value: [{ id: 'large-model', maxTokens: 4096 }],
      }],
      7,
    )
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

describe('model-facing surface', () => {
  it('teaches secure credential handling and exposes no raw apiKey argument', () => {
    const tools = modelManagerTools(context())
    const configure = tools.find(tool => tool.name === 'configure_model_route')
    expect(MODEL_MANAGER_GUIDANCE).toContain('Never ask the user to paste an API key into chat')
    expect(configure?.parameters.properties).toHaveProperty('apiKeyEnv')
    expect(configure?.parameters.properties).not.toHaveProperty('apiKey')
    const modelProperties = (configure?.parameters.properties.models as {
      items: { properties: Record<string, unknown> }
    }).items.properties
    expect(modelProperties).toHaveProperty('requestMaxTokens')
    expect(modelProperties).not.toHaveProperty('maxTokens')

    for (const name of ['register_task_model', 'upsert_model_portrait']) {
      const tool = tools.find(entry => entry.name === name)
      const portrait = (tool?.parameters.properties.portrait as {
        properties: Record<string, unknown>
      }).properties
      expect(portrait, `${name} must accept the canonical Markdown description`).toHaveProperty('description')
    }
  })
})
