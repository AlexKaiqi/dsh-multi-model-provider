import type { Context } from '@deepseek-ai/cordis'
import type { LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import { parseLlmTargetId } from '../model-target-id.ts'
import { ModelManagerError } from '../operations.ts'
import { resolveTaskModelRoute } from '../registry.ts'
import type { ModelPortrait } from '../types.ts'
import { builtinLlmPortrait } from './builtin.ts'
import { builtinTaskPortrait } from './builtin-task.ts'
import { portraitRegistry } from './storage.ts'

export interface TaskPortraitTarget {
  readonly kind: 'task'
  readonly id: string
  readonly portrait: ModelPortrait | undefined
  readonly portraitSource: 'stored' | 'bundled' | undefined
  readonly storagePath: readonly string[]
  readonly declared: Record<string, unknown>
  readonly route: ReturnType<typeof resolveTaskModelRoute>
}

export interface LlmPortraitTarget {
  readonly kind: 'llm'
  readonly id: string
  readonly provider: string
  readonly model: string
  readonly portrait: ModelPortrait | undefined
  readonly portraitSource: 'stored' | 'bundled' | undefined
  readonly storagePath: readonly string[]
  readonly declared: Record<string, unknown>
  readonly info: LlmResolvedModelInfo
}

export type PortraitTarget = TaskPortraitTarget | LlmPortraitTarget

export async function resolvePortraitTarget(ctx: Context, id: string, signal?: AbortSignal): Promise<PortraitTarget> {
  const targetId = id.trim()
  if (targetId === '') throw new ModelManagerError('id must not be blank', 'INVALID_MODEL_PORTRAIT_ID')
  const config = portraitRegistry(ctx)
  if (config.models[targetId] !== undefined) {
    const route = resolveTaskModelRoute(ctx, targetId)
    const bundled = builtinTaskPortrait(
      route.connection.provider,
      route.registration.model,
      route.registration.task,
    )
    return {
      kind: 'task',
      id: route.id,
      portrait: route.registration.portrait ?? bundled,
      portraitSource: route.registration.portrait !== undefined ? 'stored' : bundled !== undefined ? 'bundled' : undefined,
      storagePath: ['models', route.id, 'portrait'],
      declared: {
        task: route.registration.task,
        input: route.registration.input,
        output: route.registration.output,
        execution: route.registration.execution,
        capabilities: route.registration.capabilities ?? [],
        operations: route.registration.operations,
        runtimeAdapter: route.registration.runtimeAdapter,
        enabled: route.registration.enabled !== false,
      },
      route,
    }
  }
  const parsed = parseLlmTargetId(targetId)
  if (parsed === undefined) {
    throw new ModelManagerError(`unknown model portrait target '${targetId}'; use a task route id or llm:<provider>/<model>`, 'UNKNOWN_MODEL_PORTRAIT_TARGET')
  }
  const info = await ctx.llm.resolveModelInfo(parsed.provider, parsed.model, signal)
  const binding = config.portraits?.[targetId]
  if (binding !== undefined && (binding.provider !== parsed.provider || binding.model !== parsed.model)) {
    throw new ModelManagerError(`portrait binding '${targetId}' does not match its provider/model identity`, 'INVALID_MODEL_PORTRAIT_BINDING')
  }
  const bundled = builtinLlmPortrait(parsed.provider, parsed.model)
  return {
    kind: 'llm',
    id: targetId,
    provider: parsed.provider,
    model: parsed.model,
    portrait: binding?.portrait ?? bundled,
    portraitSource: binding !== undefined ? 'stored' : bundled !== undefined ? 'bundled' : undefined,
    storagePath: ['portraits', targetId],
    declared: {
      kind: 'llm',
      input: info.inputModalities ?? [],
      output: ['text'],
      contextWindow: info.context?.contextWindow,
      maxTokens: info.defaultMaxTokens,
      reasoningEfforts: info.reasoning?.efforts.map(effort => effort.id) ?? [],
    },
    info,
  }
}
