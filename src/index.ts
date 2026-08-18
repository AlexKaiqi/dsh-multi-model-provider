/**
 * Agent-assisted model provider management for DeepSeek Harness.
 *
 * The official llm-pi-ai settings namespace remains authoritative for
 * language models. This plugin owns a separate task-model catalog for routes
 * that cannot participate in the LLM request contract.
 */
import type { Context } from '@deepseek-ai/cordis'
import { MODEL_MANAGER_GUIDANCE } from './guidance.ts'
import { registerTaskModelSettings } from './registry.ts'
import { modelManagerTools } from './tools.ts'

export * from './guidance.ts'
export * from './operations.ts'
export * from './registry.ts'
export * from './types.ts'
export { modelManagerTools } from './tools.ts'

export const name = 'multi-model-provider'
export const inject = ['llm', 'settings', 'credentials', 'agentDefaultModel', 'tools', 'systemPrompt']

export function apply(ctx: Context): void {
  registerTaskModelSettings(ctx)
  for (const tool of modelManagerTools(ctx)) ctx.tools.register(tool)
  ctx.systemPrompt.section({
    name: 'tool:multi-model-provider',
    order: 170,
    text: MODEL_MANAGER_GUIDANCE,
  })
}
