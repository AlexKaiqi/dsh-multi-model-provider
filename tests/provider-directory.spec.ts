import { describe, expect, it } from 'vitest'
import { decorateConfigurableProviderView } from '../src/index.ts'

describe('configurable provider presentation', () => {
  it('presents the configured llm-pi-ai Volcengine route as the plugin-owned Ark provider', () => {
    expect(decorateConfigurableProviderView({
      provider: 'volcengine',
      displayName: 'volcengine',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'volcengine'],
      active: true,
      declared: true,
    })).toEqual({
      provider: 'volcengine',
      displayName: '火山方舟',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'volcengine'],
      active: true,
      declared: false,
      editor: {
        kind: 'provider',
        apiKeyRef: 'ARK_API_KEY',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        api: 'openai-responses',
        modelsRequired: true,
      },
    })
  })

  it('leaves unrelated provider views to their owners', () => {
    expect(decorateConfigurableProviderView({
      provider: 'openai',
      displayName: 'OpenAI',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'openai'],
      active: true,
    })).toBeUndefined()
  })
})
