import type { Context } from '@deepseek-ai/cordis'
import { llmTargetId } from '../model-target-id.ts'
import { ModelManagerError } from '../operations.ts'
import type { PrepareModelPortraitsInput } from '../types.ts'
import { portraitRegistry } from './storage.ts'

export async function prepareModelPortraits(ctx: Context, input: PrepareModelPortraitsInput, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const config = portraitRegistry(ctx)
  const requested = input.ids === undefined ? undefined : new Set(input.ids.map(id => id.trim()).filter(Boolean))
  const candidates: Record<string, unknown>[] = []
  for (const [id, registration] of Object.entries(config.models)) {
    if (requested !== undefined && !requested.has(id)) continue
    if (requested === undefined && input.includeDisabled !== true && registration.enabled === false) continue
    candidates.push({
      id,
      kind: 'task',
      provider: config.connections[registration.connection]?.provider,
      model: registration.model,
      displayName: registration.displayName,
      declared: { task: registration.task, input: registration.input, output: registration.output, execution: registration.execution, capabilities: registration.capabilities ?? [] },
      portraitState: registration.portrait?.validation.state ?? 'missing',
      needsInitialPortrait: registration.portrait === undefined || registration.portrait.validation.state !== 'valid',
    })
  }
  const warnings: string[] = []
  for (const provider of ctx.llm.listProviders()) {
    try {
      for (const model of await ctx.llm.listModels(provider.id)) {
        const id = llmTargetId(provider.id, model.id)
        if (requested !== undefined && !requested.has(id)) continue
        const portrait = config.portraits?.[id]?.portrait
        candidates.push({
          id,
          kind: 'llm',
          provider: provider.id,
          model: model.id,
          displayName: model.name,
          declared: { input: model.inputModalities ?? [], output: ['text'] },
          portraitState: portrait?.validation.state ?? 'missing',
          needsInitialPortrait: portrait === undefined || portrait.validation.state !== 'valid',
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
      'Use authoritative current provider documentation for identity, modalities, limits, capabilities, and prices; do not guess missing facts.',
      'Keep provider claims, external benchmarks, runtime probes, and observed usage as distinct evidence kinds with observation dates.',
      'Build a complete portrait for each candidate and call upsert_model_portrait.',
      'Immediately call validate_model_portrait with liveProbe=false; only perform a paid/provider-traffic probe with explicit user approval.',
      'Use summarize_model_usage to incorporate native Harness LLM observations and task-model invocation observations; never copy request or response content into the portrait.',
    ],
    warnings,
    signalAborted: signal?.aborted === true,
  }
}
