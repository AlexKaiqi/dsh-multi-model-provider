import { describe, expect, it } from 'vitest'
import {
  DOUBAO_DEFAULT_PROFILE,
  VOLCENGINE_DEFAULT_PROFILE,
  doubaoProviderDirectoryEntry,
  volcengineProviderDirectoryEntry,
} from '../src/provider-directory.ts'

describe('configurable provider presentation', () => {
  it('declares Volcengine using only the host-supported directory contract', () => {
    expect(volcengineProviderDirectoryEntry()).toEqual({
      provider: 'volcengine',
      displayName: '火山方舟',
      settingsNs: 'llm-pi-ai',
      settingsPath: ['providers', 'volcengine'],
      declared: false,
    })
    expect(VOLCENGINE_DEFAULT_PROFILE).toMatchObject({
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
      api: 'openai-completions',
      models: [],
    })
  })

  it('keeps the Doubao catalog dormant until its provider profile is added', () => {
    expect(doubaoProviderDirectoryEntry()).toMatchObject({
      provider: 'doubao-speech',
      settingsPath: ['providerProfiles', 'doubao-speech'],
    })
    expect(DOUBAO_DEFAULT_PROFILE).toMatchObject({
      provider: 'doubao-speech',
      baseURL: 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue',
      models: [],
      profile: {
        kind: 'realtime-speech',
        adapter: 'dsh-realtime-voice',
        protocolModel: '1.2.6.1',
        modelOption: 'voice',
      },
    })
  })
})
