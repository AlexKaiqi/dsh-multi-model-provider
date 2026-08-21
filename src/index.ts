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
import { ModelCatalog } from './catalog.ts'
import {
  DOUBAO_SPEECH_PROVIDER,
} from './doubao-speech-catalog.ts'
import { discoverDoubaoRealtimeVoices } from './doubao-discovery.ts'
import { registerTaskModelSettings } from './registry.ts'
import { TaskModelRuntime } from './runtime.ts'
import { RealtimeModelRuntime } from './realtime.ts'
import { modelManagerTools } from './tools.ts'
import { registerModelProbeRoute } from './probe-route.ts'
import { registerPortraitJobRoutes } from './portrait-jobs.ts'

export * from './model/guidance.ts'
export * from './model/tool-surfaces.ts'
export * from './model/help.ts'
export * from './operations.ts'
export * from './providers/index.ts'
export * from './registry.ts'
export * from './runtime.ts'
export * from './realtime.ts'
export * from './catalog.ts'
export * from './portrait-core.ts'
export * from './portraits.ts'
export * from './observations/index.ts'
export * from './portraits/index.ts'
export * from './portraits/job-contract.ts'
export * from './portrait-jobs.ts'
export * from './invocation.ts'
export * from './types.ts'
export { modelManagerTools } from './tools.ts'

export const name = 'multi-model-provider'
export const inject = ['llm', 'settings', 'credentials', 'agentDefaultModel', 'tools', 'systemPrompt']

export function apply(ctx: Context): void {
  const existingProviders = new Set(ctx.llm.listConfigurableProviders().map(entry => entry.provider))
  let arkDirectory: (() => void) | undefined
  let arkRegistrationPending = false
  const ensureArkDirectory = (): void => {
    if (arkDirectory !== undefined || arkRegistrationPending) return
    if (ctx.llm.listConfigurableProviders().some(entry => entry.provider === 'volcengine')) return
    arkRegistrationPending = true
    queueMicrotask(() => {
      try {
        if (arkDirectory !== undefined) return
        if (ctx.llm.listConfigurableProviders().some(entry => entry.provider === 'volcengine')) return
        arkDirectory = ctx.llm.registerConfigurableProviders([{
          provider: 'volcengine',
          displayName: '火山方舟',
          settingsNs: 'llm-pi-ai',
          settingsPath: ['providers', 'volcengine'],
          declared: false,
        }])
      } finally {
        arkRegistrationPending = false
      }
    })
  }
  if (!existingProviders.has('volcengine')) {
    arkDirectory = ctx.llm.registerConfigurableProviders([{
      provider: 'volcengine',
      displayName: '火山方舟',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'volcengine'],
      declared: false,
    }])
  }
  ctx.on('llm/adapters-updated', ensureArkDirectory)
  ensureArkDirectory()
  if (!existingProviders.has(DOUBAO_SPEECH_PROVIDER)) {
    ctx.llm.registerConfigurableProviders([{
      provider: DOUBAO_SPEECH_PROVIDER,
      displayName: '豆包语音',
      settingsNs: 'multi-model-provider',
      settingsPath: ['connections', DOUBAO_SPEECH_PROVIDER],
      declared: false,
    }])
  }
  ctx.llm.registerModelDiscovery('multi-model-provider', async (request) => {
    if (request.provider !== DOUBAO_SPEECH_PROVIDER) return []
    return discoverDoubaoRealtimeVoices(request)
  })
  new TaskModelRuntime(ctx)
  new RealtimeModelRuntime(ctx)
  new ModelCatalog(ctx)
  registerTaskModelSettings(ctx)
  registerModelProbeRoute(ctx)
  registerPortraitJobRoutes(ctx)
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
