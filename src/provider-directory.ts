import {
  DOUBAO_REALTIME_BASE_URL,
  DOUBAO_SPEECH_PROVIDER,
} from './doubao-speech-catalog.ts'
import {
  VOLCENGINE_ARK_API,
  VOLCENGINE_ARK_API_KEY,
  VOLCENGINE_ARK_BASE_URL,
} from './providers/volcengine.ts'

export const VOLCENGINE_DEFAULT_PROFILE = {
  displayName: '火山方舟',
  apiKeyEnv: VOLCENGINE_ARK_API_KEY,
  baseURL: VOLCENGINE_ARK_BASE_URL,
  api: VOLCENGINE_ARK_API,
  models: [],
} as const

export const DOUBAO_DEFAULT_PROFILE = {
  provider: DOUBAO_SPEECH_PROVIDER,
  displayName: '豆包语音',
  apiKeyEnv: 'DOUBAO_API_KEY',
  credentialRef: 'DOUBAO_API_KEY',
  credentialRefs: {
    apiKey: 'DOUBAO_API_KEY',
    speechAppId: 'DOUBAO_APPID',
    speechToken: 'DOUBAO_TOKEN',
    realtimeApiKey: 'DOUBAO_API_KEY',
  },
  baseURL: DOUBAO_REALTIME_BASE_URL,
  models: [],
  profile: {
    kind: 'realtime-speech',
    adapter: 'dsh-realtime-voice',
    protocol: 'doubao-realtime-duplex',
    protocolModel: '1.2.6.1',
    modelOption: 'voice',
    product: 'doubao-speech',
    speechResources: 'documented-resource-ids',
  },
} as const

export function doubaoProviderDirectoryEntry() {
  return {
    provider: DOUBAO_SPEECH_PROVIDER,
    displayName: '豆包语音',
    settingsNs: 'multi-model-provider',
    settingsPath: ['providerProfiles', DOUBAO_SPEECH_PROVIDER],
    declared: false,
  } as const
}

export function volcengineProviderDirectoryEntry() {
  return {
    provider: 'volcengine',
    displayName: '火山方舟',
    settingsNs: 'llm-pi-ai',
    settingsPath: ['providers', 'volcengine'],
    declared: false,
  } as const
}
