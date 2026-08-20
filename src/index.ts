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
import {
  DOUBAO_SPEECH_CATALOG,
  DOUBAO_SPEECH_LEGACY_CATALOG,
  DOUBAO_SPEECH_PROVIDER,
} from './doubao-speech-catalog.ts'
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
  const existingProviders = new Set(ctx.llm.listConfigurableProviders().map(entry => entry.provider))
  if (!existingProviders.has('volcengine')) {
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
      declared: false,
    }])
  }
  if (!existingProviders.has(DOUBAO_SPEECH_PROVIDER)) {
    ctx.llm.registerConfigurableProviders([{
      provider: DOUBAO_SPEECH_PROVIDER,
      displayName: '豆包语音',
      settingsNs: 'multi-model-provider',
      settingsPath: ['connections', DOUBAO_SPEECH_PROVIDER],
      ...{
        // This is a speech route, not a pi-ai LLM route, but its connection
        // still uses the standard API-key, endpoint, and model-list editor.
        settingsEditor: 'provider',
        profileDefaults: {
          provider: DOUBAO_SPEECH_PROVIDER,
          displayName: '豆包语音',
          apiKeyEnv: 'DOUBAO_API_KEY',
          credentialRef: 'DOUBAO_API_KEY',
          credentialRefs: { apiKey: 'DOUBAO_API_KEY', realtimeApiKey: 'DOUBAO_API_KEY' },
          baseURL: 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue',
          // Realtime fixes session.model to 1.2.6.1; the selectable provider
          // profiles are its documented O/SC voices and are discovered below.
          models: [],
          profile: { product: 'doubao-realtime-speech' },
        },
        cleanupPaths: [...DOUBAO_SPEECH_LEGACY_CATALOG, ...DOUBAO_SPEECH_CATALOG]
          .map(entry => ['models', entry.id]),
        // The first reference is the current provider credential. The others
        // are cleanup-only aliases from the superseded multi-credential form.
        credentialRefs: ['DOUBAO_API_KEY', 'DOUBAO_APPID', 'DOUBAO_TOKEN', 'DOUBAO_REALTIME_API_KEY'],
        userConfigured: true,
      },
      declared: false,
    }])
  }
  ctx.llm.registerModelDiscovery('multi-model-provider', async (request) => {
    if (request.provider !== DOUBAO_SPEECH_PROVIDER) return []
    return DOUBAO_SPEECH_CATALOG.map(entry => ({
      id: String(entry.registration.profile?.voice ?? entry.id),
      ...(entry.registration.displayName === undefined ? {} : { name: entry.registration.displayName }),
    }))
  })
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
