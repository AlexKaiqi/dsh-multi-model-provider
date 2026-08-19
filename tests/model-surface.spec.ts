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
  GET_MODEL_PORTRAIT_SURFACE,
  INVOKE_TASK_MODEL_SURFACE,
  LIST_MODEL_ROUTES_SURFACE,
  LIST_TASK_MODELS_SURFACE,
  MODEL_MANAGER_TOOL_SURFACES,
  PREPARE_MODEL_PORTRAITS_SURFACE,
  REGISTER_TASK_MODEL_SURFACE,
  SELECT_TASK_MODELS_SURFACE,
  SELECT_DEFAULT_MODEL_SURFACE,
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
      LIST_TASK_MODELS_SURFACE,
      DISCOVER_TASK_MODELS_SURFACE,
      SELECT_TASK_MODELS_SURFACE,
      REGISTER_TASK_MODEL_SURFACE,
      PREPARE_MODEL_PORTRAITS_SURFACE,
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
      'list_task_models',
      'discover_task_models',
      'select_task_models',
      'register_task_model',
      'prepare_model_portraits',
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
