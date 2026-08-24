import {
  DOUBAO_REALTIME_BASE_URL,
  DOUBAO_SPEECH_PROVIDER,
} from './doubao-speech-catalog.ts'
import {
  VOLCENGINE_ARK_API,
  VOLCENGINE_ARK_API_KEY,
  VOLCENGINE_ARK_BASE_URL,
} from './providers/volcengine.ts'

export const VOLCENGINE_EDITOR = {
  kind: 'provider',
  apiKeyRef: VOLCENGINE_ARK_API_KEY,
  defaults: {
    displayName: '火山方舟',
    apiKeyEnv: VOLCENGINE_ARK_API_KEY,
    baseURL: VOLCENGINE_ARK_BASE_URL,
    api: VOLCENGINE_ARK_API,
    models: [],
  },
  credentialRequired: true,
  modelsRequired: true,
} as const

export const DOUBAO_EDITOR = {
  kind: 'provider',
  apiKeyRef: 'DOUBAO_API_KEY',
  defaults: {
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
      product: 'doubao-speech',
      speechResources: 'documented-resource-ids',
    },
  },
  credentialRequired: true,
  modelsRequired: true,
} as const

export function doubaoProviderDirectoryEntry() {
  return {
    provider: DOUBAO_SPEECH_PROVIDER,
    displayName: '豆包语音',
    settingsNs: 'multi-model-provider',
    settingsPath: ['providerProfiles', DOUBAO_SPEECH_PROVIDER],
    editor: DOUBAO_EDITOR,
    declared: false,
  } as const
}

export function volcengineProviderDirectoryEntry() {
  return {
    provider: 'volcengine',
    displayName: '火山方舟',
    settingsNs: 'llm-pi-ai',
    settingsPath: ['providers', 'volcengine'],
    editor: VOLCENGINE_EDITOR,
    declared: false,
  } as const
}
