/**
 * Agent-assisted model provider management for DeepSeek Harness.
 *
 * The official llm-pi-ai settings namespace remains authoritative for
 * language models. This plugin owns a separate task-model catalog for routes
 * that cannot participate in the LLM request contract.
 */
import type { Context } from '@deepseek-ai/cordis'
import { MODEL_MANAGER_GUIDANCE } from './model/guidance.ts'
import { HELP } from './model/help.ts'
import { registerTaskModelSettings } from './registry.ts'
import { TaskModelRuntime } from './runtime.ts'
import { modelManagerTools } from './tools.ts'

export * from './model/guidance.ts'
export * from './model/tool-surfaces.ts'
export * from './model/help.ts'
export * from './operations.ts'
export * from './registry.ts'
export * from './runtime.ts'
export * from './portrait-core.ts'
export * from './portraits.ts'
export * from './observations/index.ts'
export * from './portraits/index.ts'
export * from './invocation.ts'
export * from './types.ts'
export { modelManagerTools } from './tools.ts'

export const name = 'multi-model-provider'
export const inject = ['llm', 'settings', 'credentials', 'agentDefaultModel', 'tools', 'systemPrompt']

export function apply(ctx: Context): void {
  new TaskModelRuntime(ctx)
  registerTaskModelSettings(ctx)
  for (const tool of modelManagerTools(ctx)) ctx.tools.register(tool)
  ctx.systemPrompt.section({
    name: 'tool:multi-model-provider',
    order: 170,
    // Guidance states the discipline; HELP states the surface. Both are
    // assembled here so the model can learn which tool serves which
    // registration path without calling one to find out.
    text: `${MODEL_MANAGER_GUIDANCE}\n\n${HELP}`,
  })
}
