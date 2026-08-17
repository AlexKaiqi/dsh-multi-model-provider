/**
 * Agent-assisted model provider management for DeepSeek Harness.
 *
 * The official llm-pi-ai settings namespace remains the only provider/model
 * registry. This plugin contributes narrow model-facing operations over that
 * registry and never accepts or stores credential values.
 */
import type { Context } from '@deepseek-ai/cordis'
import { MODEL_MANAGER_GUIDANCE } from './guidance.ts'
import { modelManagerTools } from './tools.ts'

export * from './guidance.ts'
export * from './operations.ts'
export * from './types.ts'
export { modelManagerTools } from './tools.ts'

export const name = 'multi-model-provider'
export const inject = ['llm', 'settings', 'credentials', 'agentDefaultModel', 'tools', 'systemPrompt']

export function apply(ctx: Context): void {
  for (const tool of modelManagerTools(ctx)) ctx.tools.register(tool)
  ctx.systemPrompt.section({
    name: 'tool:multi-model-provider',
    order: 170,
    text: MODEL_MANAGER_GUIDANCE,
  })
}
