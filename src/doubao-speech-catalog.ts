import type { RegisteredTaskModel } from './types.ts'

/** Stable provider id for the Doubao speech product and its task routes. */
export const DOUBAO_SPEECH_PROVIDER = 'doubao-speech'

type DoubaoSpeechCatalogEntry = {
  readonly id: string
  readonly summary: string
  readonly registration: Omit<RegisteredTaskModel, 'portrait'>
}

/**
 * Legacy batch-speech routes retained only so existing settings remain valid
 * until the Realtime provider is saved or removed. They are deliberately not
 * shown by the Models provider editor: their Access Token contract is a
 * different product surface from Realtime Duplex.
 */
export const DOUBAO_SPEECH_LEGACY_CATALOG: readonly DoubaoSpeechCatalogEntry[] = [
  {
    id: 'doubao/volc.bigasr.sauc.duration',
    summary: 'Doubao/Volcengine large-model speech transcription resource.',
    registration: {
      enabled: false,
      connection: DOUBAO_SPEECH_PROVIDER,
      model: 'volc.bigasr.sauc.duration',
      displayName: '豆包大模型录音文件识别',
      task: 'transcription',
      runtimeAdapter: 'doubao-speech',
      credentialNames: ['speechAppId', 'speechToken'],
      input: ['audio', 'file'],
      output: ['text'],
      execution: 'streaming',
      capabilities: ['speech.transcribe.file', 'speech.transcribe.stream'],
      operations: ['transcribe-file', 'transcribe-stream'],
      roles: ['speech-to-text'],
      profile: { resourceIdRole: 'asr' },
    },
  },
  {
    id: 'doubao/seed-tts-1.0',
    summary: 'Doubao/Volcengine short-text speech synthesis resource.',
    registration: {
      enabled: false,
      connection: DOUBAO_SPEECH_PROVIDER,
      model: 'seed-tts-1.0',
      displayName: '豆包 Seed TTS 1.0',
      task: 'speech-synthesis',
      runtimeAdapter: 'doubao-speech',
      credentialNames: ['speechAppId', 'speechToken'],
      input: ['text'],
      output: ['audio'],
      execution: 'streaming',
      capabilities: ['speech.synthesize.short'],
      operations: ['synthesize'],
      roles: ['text-to-speech'],
      profile: { resourceIdRole: 'tts' },
    },
  },
]

/** Realtime-only model directory shown by the Doubao Speech provider. */
export const DOUBAO_SPEECH_CATALOG: readonly DoubaoSpeechCatalogEntry[] = [
  {
    id: 'doubao/realtime-duplex-3.0',
    summary: 'Volcengine Realtime Speech Model 3.0 full-duplex speech dialogue with native function calling.',
    registration: {
      enabled: false,
      connection: DOUBAO_SPEECH_PROVIDER,
      model: '1.2.6.1',
      displayName: '豆包 Realtime Duplex 3.0（Seeduplex）',
      task: 'realtime-speech',
      runtimeAdapter: 'doubao-realtime-duplex',
      credentialNames: ['apiKey'],
      input: ['text', 'audio'],
      output: ['text', 'audio'],
      execution: 'realtime',
      capabilities: ['speech.realtime_session'],
      operations: ['realtime-session'],
      roles: ['voice-deliberation'],
      profile: {
        protocol: 'doubao-realtime-duplex',
        endpoint: 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue',
        inputSampleRate: 16000,
        outputSampleRate: 24000,
        nativeFunctionCalling: true,
      },
    },
  },
]
