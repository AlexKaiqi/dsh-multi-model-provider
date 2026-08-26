/**
 * L0 contract tests for the model-visible surface.
 *
 * These assert on the exports in `src/model/` directly, plus one assembly check
 * that the registered tools really carry those exports — otherwise "one source of
 * change" would be a convention rather than a fact.
 */
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { MODEL_MANAGER_GUIDANCE } from '../src/model/guidance.ts'
import { HELP, TOOL_NAMES, VERSION } from '../src/model/help.ts'
import {
  CONFIGURE_MODEL_ROUTE_SURFACE,
  DISCOVER_TASK_MODELS_SURFACE,
  FETCH_PORTRAIT_SOURCE_SURFACE,
  GET_MODEL_PORTRAIT_SURFACE,
  INGEST_PORTRAIT_RESEARCH_SURFACE,
  INVOKE_TASK_MODEL_SURFACE,
  INSPECT_VOLCENGINE_PROVIDER_SURFACE,
  LIST_MODEL_ROUTES_SURFACE,
  LIST_TASK_MODELS_SURFACE,
  MODEL_MANAGER_TOOL_SURFACES,
  PREPARE_MODEL_PORTRAITS_SURFACE,
  REGISTER_TASK_MODEL_SURFACE,
  SELECT_TASK_MODELS_SURFACE,
  SELECT_DEFAULT_MODEL_SURFACE,
  SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE,
  SUMMARIZE_MODEL_USAGE_SURFACE,
  UPSERT_MODEL_PORTRAIT_SURFACE,
  VALIDATE_MODEL_PORTRAIT_SURFACE,
} from '../src/model/tool-surfaces.ts'
import { modelManagerTools } from '../src/tools.ts'

/** Markers the checker's PRM-002 heuristic looks for, asserted precisely here. */
const POSITIVE = /\buse it\b/i
const NEGATIVE = /\bdo not use\b/i

describe('tool surfaces', () => {
  it('covers all model-management tools exactly once', () => {
    // Named individually so the declared exports are each really referenced.
    expect(MODEL_MANAGER_TOOL_SURFACES).toEqual([
      LIST_MODEL_ROUTES_SURFACE,
      CONFIGURE_MODEL_ROUTE_SURFACE,
      INSPECT_VOLCENGINE_PROVIDER_SURFACE,
      SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE,
      LIST_TASK_MODELS_SURFACE,
      DISCOVER_TASK_MODELS_SURFACE,
      SELECT_TASK_MODELS_SURFACE,
      REGISTER_TASK_MODEL_SURFACE,
      PREPARE_MODEL_PORTRAITS_SURFACE,
      FETCH_PORTRAIT_SOURCE_SURFACE,
      INGEST_PORTRAIT_RESEARCH_SURFACE,
      GET_MODEL_PORTRAIT_SURFACE,
      UPSERT_MODEL_PORTRAIT_SURFACE,
      VALIDATE_MODEL_PORTRAIT_SURFACE,
      INVOKE_TASK_MODEL_SURFACE,
      SUMMARIZE_MODEL_USAGE_SURFACE,
      SELECT_DEFAULT_MODEL_SURFACE,
    ])
    const names = MODEL_MANAGER_TOOL_SURFACES.map(surface => surface.name)
    expect(names).toEqual([
      'list_model_routes',
      'configure_model_route',
      'inspect_volcengine_provider',
      'select_volcengine_language_models',
      'list_task_models',
      'discover_task_models',
      'select_task_models',
      'register_task_model',
      'prepare_model_portraits',
      'fetch_portrait_source',
      'ingest_portrait_research',
      'get_model_portrait',
      'upsert_model_portrait',
      'validate_model_portrait',
      'invoke_task_model',
      'summarize_model_usage',
      'select_default_model',
    ])
    expect(new Set(names).size).toBe(names.length)
  })

  it('states both when to use and when not to use each tool', () => {
    for (const surface of MODEL_MANAGER_TOOL_SURFACES) {
      expect(surface.description, `${surface.name} needs a positive activation condition`).toMatch(POSITIVE)
      expect(surface.description, `${surface.name} needs a negative activation condition`).toMatch(NEGATIVE)
    }
  })

  it('points every tool at a surface that reveals current state', () => {
    for (const surface of MODEL_MANAGER_TOOL_SURFACES) {
      // The pointer must be a real tool, not prose, so the model can act on it.
      expect(TOOL_NAMES).toContain(surface.helpPointer)
      // A listing tool is its own discovery surface; anything that mutates or
      // selects must name the listing tool in its description.
      if (surface.name !== surface.helpPointer) {
        expect(surface.description).toContain(surface.helpPointer)
      }
    }
  })

  it('separates the language and task-model paths in both directions', () => {
    // Cross-references are what stop a task model being registered as a route.
    expect(CONFIGURE_MODEL_ROUTE_SURFACE.description).toMatch(/non-language/i)
    expect(REGISTER_TASK_MODEL_SURFACE.description).toContain('configure_model_route')
    expect(REGISTER_TASK_MODEL_SURFACE.description).toMatch(/language\/chat/i)
  })

  it('refuses API key values on every registration tool', () => {
    for (const surface of [CONFIGURE_MODEL_ROUTE_SURFACE, REGISTER_TASK_MODEL_SURFACE]) {
      expect(surface.description).toMatch(/never (?:accepts )?an API key value/i)
    }
  })

  it('warns that a registration is not yet callable', () => {
    expect(REGISTER_TASK_MODEL_SURFACE.description).toMatch(/never describe .* as callable/i)
  })

  it('never advertises generic invocation for realtime routes', () => {
    expect(INVOKE_TASK_MODEL_SURFACE.description).toMatch(/do not use it for realtime-speech routes/i)
    expect(INVOKE_TASK_MODEL_SURFACE.description).toContain('realtimeModelRuntime')
    const activation = INVOKE_TASK_MODEL_SURFACE.description.match(/Use it for ([^.]+)\./)?.[1] ?? ''
    expect(activation).not.toMatch(/realtime/i)
    expect(MODEL_MANAGER_GUIDANCE).toMatch(/never invoke realtime-speech routes with invoke_task_model/i)
    expect(HELP).toMatch(/explicitly excludes realtime-speech routes/i)
  })

  it('keeps every parameter description non-empty', () => {
    for (const surface of MODEL_MANAGER_TOOL_SURFACES) {
      for (const [key, text] of Object.entries(surface.parameters)) {
        expect(typeof text, `${surface.name}.${key}`).toBe('string')
        expect((text as string).length, `${surface.name}.${key}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('MODEL_MANAGER_GUIDANCE', () => {
  it('names both registration paths and their tools', () => {
    for (const name of TOOL_NAMES) expect(MODEL_MANAGER_GUIDANCE).toContain(name)
  })

  it('states the credential discipline', () => {
    expect(MODEL_MANAGER_GUIDANCE).toMatch(/never ask the user to paste an API key/i)
    expect(MODEL_MANAGER_GUIDANCE).toMatch(/credential references/i)
  })

  it('states that registration is not callability', () => {
    expect(MODEL_MANAGER_GUIDANCE).toMatch(/never describe registered-only routes as callable/i)
  })
})

describe('help surface', () => {
  it('keeps VERSION equal to the package version', async () => {
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as { version: string }
    expect(VERSION).toBe(pkg.version)
  })

  it('ships the Web Settings contribution as a client bundle', async () => {
    const pkg = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    ) as {
      exports: Record<string, string>
      files: string[]
      dsh: { client?: { platform?: string; inject?: string[] } }
    }
    expect(pkg.exports['./client']).toBe('./lib/client.js')
    expect(pkg.files).toContain('lib/client.js')
    expect(pkg.files).toContain('LICENSE')
    expect(pkg.dsh.client).toMatchObject({
      platform: 'web',
      inject: expect.arrayContaining([
        '@deepseek-ai/dsh-client-ui-settings',
        '@deepseek-ai/dsh-api-remotes',
      ]),
    })
  })

  it('leaves the shipped Models page as the only model-management surface', async () => {
    const [client, host, directory] = await Promise.all([
      readFile(new URL('../src/client/index.jsx', import.meta.url), 'utf8'),
      readFile(new URL('../src/index.ts', import.meta.url), 'utf8'),
      readFile(new URL('../src/provider-directory.ts', import.meta.url), 'utf8'),
    ])
    expect(client).not.toContain("id: 'models'")
    expect(client).not.toContain('priority: -10')
    expect(client).not.toContain('HostModelsSection')
    expect(client).not.toContain('UnifiedModelsSettings')
    expect(client).not.toContain('ModelProviderSettings')
    expect(client).not.toContain('ArkProviderCard')
    expect(client).not.toContain('DoubaoProviderCard')
    expect(client).not.toContain("id: 'model-providers'")
    expect(client).not.toContain("id: 'volcengine-providers'")
    expect(client).not.toContain("label: () => t('tabProvider')")
    expect(client).not.toContain("settings.models.model.details")
    expect(directory).toContain("provider: 'volcengine'")
    expect(directory).toContain('provider: DOUBAO_SPEECH_PROVIDER')
    expect(directory).toContain("settingsNs: 'llm-pi-ai'")
    expect(directory).toContain("settingsNs: 'multi-model-provider'")
    expect(directory).not.toContain('editor:')
    expect(directory).toContain('VOLCENGINE_DEFAULT_PROFILE')
    expect(directory).toContain('DOUBAO_DEFAULT_PROFILE')
    expect(directory).toContain("settingsPath: ['providerProfiles', DOUBAO_SPEECH_PROVIDER]")
    expect(host).not.toContain('registerConfigurableProviders')
    expect(host).not.toContain('doubaoProviderDirectoryEntry')
    expect(host).toContain("ctx.credentials.resolve(credentialRef('DOUBAO_API_KEY'))")
  })

  it('keeps portrait Settings to select, launch the skill in the current Session, and view', async () => {
    const client = await readFile(new URL('../src/client/index.jsx', import.meta.url), 'utf8')
    expect(client).toContain("id: 'model-portraits'")
    expect(client).toContain("label: () => t('tabPortraits')")
    expect(client).not.toContain("id: 'model-portrait'")
    expect(client).toContain('`/collect-model-portraits ${target.id}`')
    expect(client).toContain("binding.session.prompt([{")
    expect(client).toContain('close()')
    expect(client).toContain('sessions.open(sessionId)')
    expect(client).not.toContain('/portrait-jobs')
    expect(client).not.toContain('temporaryWorkspaces')
    expect(client).toContain("if (target.provider === 'volcengine') return t('providerVolcengine')")
    expect(client).toContain("if (target.provider === 'doubao-speech') return t('providerDoubaoSpeech')")
    expect(client).toContain('role="tablist"')
    expect(client.match(/role="tab"/g)).toHaveLength(2)
    expect(client).toContain("setPortraitTab('collect')")
    expect(client).toContain("setPortraitTab('view')")
    expect(client).not.toContain("t('portraitsHint')")
    expect(client).not.toContain("t('portraitsAgentOwned')")
    expect(client).not.toContain("t('portraitSelectHint')")
    expect(client).not.toContain("t('portraitSelectedModel')")
    expect(client).not.toContain('setShowPortrait')
    expect(client).not.toContain('setKindFilter')
    expect(client).not.toContain('setProviderFilter')
    expect(client).not.toContain('setStateFilter')
    expect(client).not.toContain('setAvailabilityFilter')
    expect(client).not.toContain('conversation.input.right')
    expect(client).not.toContain('inputActions')
    expect(client).toContain("const MODEL_CATALOG_PATH = '/dsh-multi-model-provider/catalog'")
    expect(client).toContain('snapshotPortraitTargets(config.modelCatalog)')
    expect(client).toContain("t('refreshModelRegistry')")
    expect(client).not.toContain('snapshotPortraitTargets(config.multi, config.llm)')
    expect(client).not.toContain('<textarea')
    const portraitSurface = client.slice(client.indexOf('function PortraitViewer'), client.indexOf('function PortraitSettings'))
    expect(portraitSurface).not.toContain('api.settings.mutate')
    expect(client).not.toContain('requestPortraitProbe')
  })

  it('lists every tool the plugin registers', () => {
    for (const name of TOOL_NAMES) expect(HELP).toContain(name)
  })

  it('repeats the two invariants a caller must not get wrong', () => {
    expect(HELP).toMatch(/never accept an API key value/i)
    expect(HELP).toMatch(/registration is not callability/i)
  })
})

describe('assembly', () => {
  it('registers tools carrying exactly the declared surfaces', async () => {
    // The load-bearing check: if tools.ts re-inlined a description, the model
    // surface would have two sources of change and this would fail.
    const ctx = new Context()
    try {
      const tools = modelManagerTools(ctx)
      expect(tools).toHaveLength(MODEL_MANAGER_TOOL_SURFACES.length)
      for (const [index, surface] of MODEL_MANAGER_TOOL_SURFACES.entries()) {
        const tool = tools[index]!
        expect(tool.name).toBe(surface.name)
        expect(tool.description).toBe(surface.description)
      }
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('carries the declared parameter descriptions into the registered schema', () => {
    const ctx = new Context()
    const tools = modelManagerTools(ctx)
    for (const [index, surface] of MODEL_MANAGER_TOOL_SURFACES.entries()) {
      // defineTool normalizes parameters into a JSON Schema, so descriptions
      // land under `properties`.
      const schema = tools[index]!.parameters as { properties?: Record<string, { description?: string }> }
      for (const [key, text] of Object.entries(surface.parameters)) {
        expect(schema.properties?.[key]?.description, `${surface.name}.${key}`).toBe(text)
      }
    }
  })
})
