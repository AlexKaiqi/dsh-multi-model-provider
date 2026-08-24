import { describe, expect, it } from 'vitest'
import { doubaoProviderDirectoryEntry, volcengineProviderDirectoryEntry } from '../src/provider-directory.ts'

describe('configurable provider presentation', () => {
  it('declares Volcengine with the generic Ark editor', () => {
    expect(volcengineProviderDirectoryEntry()).toEqual({
      provider: 'volcengine',
      displayName: '火山方舟',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'volcengine'],
      declared: false,
      editor: {
        kind: 'provider',
        apiKeyRef: 'ARK_API_KEY',
        defaults: {
          displayName: '火山方舟',
          apiKeyEnv: 'ARK_API_KEY',
          baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
          api: 'openai-responses',
          models: [],
        },
        credentialRequired: true,
        modelsRequired: true,
      },
    })
  })

  it('keeps the Doubao catalog dormant until its provider profile is added', () => {
    expect(doubaoProviderDirectoryEntry()).toMatchObject({
      provider: 'doubao-speech',
      settingsPath: ['providerProfiles', 'doubao-speech'],
      editor: {
        apiKeyRef: 'DOUBAO_API_KEY',
        defaults: {
          provider: 'doubao-speech',
          baseURL: 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue',
          models: [],
        },
        credentialRequired: true,
        modelsRequired: true,
      },
    })
  })
})
