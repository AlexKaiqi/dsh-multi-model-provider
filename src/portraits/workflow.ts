import type { Context } from '@deepseek-ai/cordis'
import { llmTargetId } from '../model-target-id.ts'
import { ModelManagerError } from '../operations.ts'
import type { ModelPortrait, PrepareModelPortraitsInput } from '../types.ts'
import { builtinLlmPortrait } from './builtin.ts'
import { builtinTaskPortrait } from './builtin-task.ts'
import { portraitGaps, researchPlanFor } from './research.ts'
import { portraitRegistry } from './storage.ts'

/**
 * Start the portrait workflow: seed known facts, list gaps, and give a research plan.
 *
 * The Agent should open suggestedSources, then call ingest_portrait_research.
 * lastProbe is never filled from documentation.
 *
 * Args:
 *   ctx: Host context with settings, credentials, and llm.
 *   input: Optional exact ids. Omit to find enabled models whose portraits are not valid.
 *   signal: Optional abort signal used while listing language-model catalogs.
 *
 * Returns:
 *   Candidates with seed, gaps, and a research plan. Never includes secrets.
 */
export async function prepareModelPortraits(ctx: Context, input: PrepareModelPortraitsInput, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const config = portraitRegistry(ctx)
  const requested = input.ids === undefined ? undefined : new Set(input.ids.map(id => id.trim()).filter(Boolean))
  const candidates: Record<string, unknown>[] = []
  for (const [id, registration] of Object.entries(config.models)) {
    if (requested !== undefined && !requested.has(id)) continue
    if (requested === undefined && input.includeDisabled !== true && registration.enabled === false) continue
    const provider = config.connections[registration.connection]?.provider ?? registration.connection
    const storedPortrait = registration.portrait
    const bundledPortrait = builtinTaskPortrait(provider, registration.model, registration.task)
    const portrait = storedPortrait ?? bundledPortrait
    const gaps = portraitGaps(portrait)
    candidates.push({
      id,
      kind: 'task',
      provider,
      model: registration.model,
      displayName: registration.displayName,
      declared: { task: registration.task, input: registration.input, output: registration.output, execution: registration.execution, capabilities: registration.capabilities ?? [] },
      portraitState: portrait?.validation.state ?? 'missing',
      ...(portrait === undefined ? {} : { portraitSource: storedPortrait === undefined ? 'bundled' : 'stored' }),
      needsInitialPortrait: portrait === undefined || portrait.validation.state !== 'valid',
      seed: taskSeed(provider, registration.model, registration, portrait),
      gaps,
      researchPlan: researchPlanFor(provider, gaps),
    })
  }
  const warnings: string[] = []
  for (const provider of ctx.llm.listProviders()) {
    try {
      for (const model of await ctx.llm.listModels(provider.id)) {
        const id = llmTargetId(provider.id, model.id)
        if (requested !== undefined && !requested.has(id)) continue
        const storedPortrait = config.portraits?.[id]?.portrait
        const bundledPortrait = builtinLlmPortrait(provider.id, model.id)
        const portrait = storedPortrait ?? bundledPortrait
        const gaps = portraitGaps(portrait)
        let contextWindow: number | undefined
        let defaultMaxTokens: number | undefined
        try {
          const info = await ctx.llm.resolveModelInfo(provider.id, model.id, signal)
          contextWindow = info.context?.contextWindow
          defaultMaxTokens = info.defaultMaxTokens
        } catch {
          warnings.push(`${id}: model info unavailable`)
        }
        candidates.push({
          id,
          kind: 'llm',
          provider: provider.id,
          model: model.id,
          displayName: model.name,
          declared: {
            input: model.inputModalities ?? [],
            output: ['text'],
            ...(contextWindow === undefined ? {} : { contextWindow }),
            ...(defaultMaxTokens === undefined ? {} : { defaultMaxTokens }),
          },
          portraitState: portrait?.validation.state ?? 'missing',
          ...(portrait === undefined ? {} : { portraitSource: storedPortrait === undefined ? 'bundled' : 'stored' }),
          needsInitialPortrait: portrait === undefined || portrait.validation.state !== 'valid',
          seed: {
            kind: 'llm',
            provider: provider.id,
            model: model.id,
            input: model.inputModalities ?? [],
            output: ['text'],
            ...(contextWindow === undefined ? {} : { contextWindow }),
            ...(defaultMaxTokens === undefined ? {} : { defaultMaxTokens }),
            ...(portrait?.performance.lastProbe === undefined ? {} : { lastProbe: portrait.performance.lastProbe }),
          },
          gaps,
          researchPlan: researchPlanFor(provider.id, gaps),
        })
      }
    } catch (error) {
      warnings.push(`${provider.id}: ${error instanceof Error ? error.message : 'model catalog unavailable'}`)
    }
  }
  if (requested !== undefined) {
    const found = new Set(candidates.map(candidate => candidate.id))
    const unknown = [...requested].filter(id => !found.has(id))
    if (unknown.length > 0) throw new ModelManagerError(`unknown portrait targets: ${unknown.join(', ')}`, 'UNKNOWN_MODEL_PORTRAIT_TARGET')
  }
  return {
    activation: 'When the user says “整理初始画像”, “建立模型画像”, or equivalent, infer the intended models from the immediately preceding registration/discovery context and execute this workflow without asking the user to enumerate portrait fields or tool names.',
    candidates: requested === undefined ? candidates.filter(candidate => candidate.needsInitialPortrait === true) : candidates,
    ontology: {
      identity: ['canonical target id', 'provider', 'provider model id', 'display name'],
      interface: ['input modalities and formats', 'output modalities and formats', 'context/output limits', 'execution mode', 'capabilities and operations'],
      commercial: ['effective-dated rates', 'billing unit', 'currency', 'tiers and caveats'],
      routing: ['one sectioned Markdown description', 'normalized qualityScores'],
      performance: ['explicit reachability probe', 'time to first token', 'total latency', 'throughput and measurement context'],
      provenance: ['source URL/reference', 'source kind', 'observedAt', 'supported claims and limitations'],
      validation: ['registration and modalities', 'evidence links', 'credential/adapter availability where applicable', 'state and checks'],
      observations: ['call counts', 'success/failure', 'latency percentiles', 'token usage', 'estimated cost'],
    },
    workflow: [
      'Use seed facts as-is; do not rewrite registered input, output, capabilities, or lastProbe.',
      'Open researchPlan.suggestedSources and extract only facts the pages currently state.',
      'Call ingest_portrait_research with http(s) evidence URLs. Price rates must reference those evidence ids.',
      'Do not write lastProbe from documentation; use the Settings speed test or an approved live probe.',
      'Immediately call validate_model_portrait with liveProbe=false; only perform a paid/provider-traffic probe with explicit user approval.',
      'Use summarize_model_usage to incorporate native Harness LLM observations and task-model invocation observations; never copy request or response content into the portrait.',
    ],
    warnings,
    signalAborted: signal?.aborted === true,
  }
}

/**
 * Copy registration facts the Agent must not invent during research.
 *
 * Args:
 *   provider: Connection provider id.
 *   model: Provider model id.
 *   registration: Stored task-model registration.
 *   portrait: Stored portrait, if any.
 *
 * Returns:
 *   Seed facts plus lastProbe when a live test already exists.
 */
function taskSeed(
  provider: string,
  model: string,
  registration: {
    readonly task: string
    readonly input: readonly string[]
    readonly output: readonly string[]
    readonly execution: string
    readonly capabilities?: readonly string[]
    readonly operations: readonly string[]
  },
  portrait: ModelPortrait | undefined,
): Record<string, unknown> {
  return {
    kind: 'task',
    provider,
    model,
    task: registration.task,
    input: [...registration.input],
    output: [...registration.output],
    execution: registration.execution,
    capabilities: [...(registration.capabilities ?? [])],
    operations: [...registration.operations],
    ...(portrait?.performance.lastProbe === undefined ? {} : { lastProbe: portrait.performance.lastProbe }),
  }
}
