/**
 * Register models, assist with portraits, and select the Agent model.
 *
 * Peer plugins inject `modelCatalog` and call `snapshot()` to read every
 * registered model. `selectAgentModel()` saves the Agent (primary) language
 * model from that catalog. Language models stay in llm-pi-ai; this plugin
 * owns non-language task-model registration, portraits, and speed probes.
 */
import type { Context } from '@deepseek-ai/cordis'
import { MODEL_MANAGER_GUIDANCE } from './model/guidance.ts'
import { HELP } from './model/help.ts'
import { VOLCENGINE_ARK_BASE_URL } from './providers/volcengine.ts'
import { ModelCatalog } from './catalog.ts'
import { registerTaskModelSettings } from './registry.ts'
import { TaskModelRuntime } from './runtime.ts'
import { modelManagerTools } from './tools.ts'
import { registerModelProbeRoute } from './probe-route.ts'

export * from './model/guidance.ts'
export * from './model/tool-surfaces.ts'
export * from './model/help.ts'
export * from './operations.ts'
export * from './providers/index.ts'
export * from './registry.ts'
export * from './runtime.ts'
export * from './catalog.ts'
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
  const volcengineDirectoryEntry = ctx.llm.listConfigurableProviders()
    .find(entry => entry.provider === 'volcengine')
  if (volcengineDirectoryEntry === undefined) {
    ctx.llm.registerConfigurableProviders([{
      provider: 'volcengine',
      displayName: '火山方舟',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'volcengine'],
      // Kept behind a spread so the plugin still typechecks against the
      // previous rc peer contract; current hosts preserve and publish this
      // generic directory hint.
      ...{ profileDefaults: {
          displayName: '火山方舟',
          apiKeyEnv: 'ARK_API_KEY',
          api: 'openai-responses',
          baseURL: VOLCENGINE_ARK_BASE_URL,
        } },
      // pi-ai has no bundled Volcengine catalog, so this route owns its
      // endpoint, protocol, and selected models even though it is presented
      // as an ordinary language-model provider in the Models settings page.
      declared: true,
    }])
  }
  new TaskModelRuntime(ctx)
  new ModelCatalog(ctx)
  registerTaskModelSettings(ctx)
  registerModelProbeRoute(ctx)
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
