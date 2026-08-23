import type { RegisteredTaskModel } from './types.ts'

/** Stable provider id for the Doubao speech product and its task routes. */
export const DOUBAO_SPEECH_PROVIDER = 'doubao-speech'
export const DOUBAO_REALTIME_BASE_URL = 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue'

export type DoubaoRealtimeVoice = {
  readonly voice: string
  readonly name: string
  readonly variant: 's2s-o' | 'sc-2.0'
}

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

/**
 * Public voices documented for the Realtime S2S-O and SC 2.0 products.
 *
 * The Realtime wire protocol itself has no ListModels endpoint and fixes
 * `session.model` to 1.2.6.1. Voice is the actual selectable upstream
 * capability, so the generic provider picker presents these profiles and the
 * runtime maps each one back to the fixed protocol model plus its voice id.
 */
export const DOUBAO_REALTIME_VOICES: readonly DoubaoRealtimeVoice[] = [
  { variant: 's2s-o', name: 'vivi', voice: 'zh_female_vv_jupiter_bigtts' },
  { variant: 's2s-o', name: '小何', voice: 'zh_female_xiaohe_jupiter_bigtts' },
  { variant: 's2s-o', name: '云舟', voice: 'zh_male_yunzhou_jupiter_bigtts' },
  { variant: 's2s-o', name: '小天', voice: 'zh_male_xiaotian_jupiter_bigtts' },
  { variant: 'sc-2.0', name: '傲娇女友', voice: 'saturn_zh_female_aojiaonvyou_tob' },
  { variant: 'sc-2.0', name: '病娇姐姐', voice: 'saturn_zh_female_bingjiaojiejie_tob' },
  { variant: 'sc-2.0', name: '成熟姐姐', voice: 'saturn_zh_female_chengshujiejie_tob' },
  { variant: 'sc-2.0', name: '可爱女生', voice: 'saturn_zh_female_keainvsheng_tob' },
  { variant: 'sc-2.0', name: '暖心学姐', voice: 'saturn_zh_female_nuanxinxuejie_tob' },
  { variant: 'sc-2.0', name: '贴心女友', voice: 'saturn_zh_female_tiexinnvyou_tob' },
  { variant: 'sc-2.0', name: '温柔文雅', voice: 'saturn_zh_female_wenrouwenya_tob' },
  { variant: 'sc-2.0', name: '妩媚御姐', voice: 'saturn_zh_female_wumeiyujie_tob' },
  { variant: 'sc-2.0', name: '性感御姐', voice: 'saturn_zh_female_xingganyujie_tob' },
  { variant: 'sc-2.0', name: '傲气凌人', voice: 'saturn_zh_male_aiqilingren_tob' },
  { variant: 'sc-2.0', name: '傲娇公子', voice: 'saturn_zh_male_aojiaogongzi_tob' },
  { variant: 'sc-2.0', name: '傲娇精英', voice: 'saturn_zh_male_aojiaojingying_tob' },
  { variant: 'sc-2.0', name: '傲慢少爷', voice: 'saturn_zh_male_aomanshaoye_tob' },
  { variant: 'sc-2.0', name: '霸道少爷', voice: 'saturn_zh_male_badaoshaoye_tob' },
  { variant: 'sc-2.0', name: '病娇白莲', voice: 'saturn_zh_male_bingjiaobailian_tob' },
  { variant: 'sc-2.0', name: '不羁青年', voice: 'saturn_zh_male_bujiqingnian_tob' },
  { variant: 'sc-2.0', name: '成熟总裁', voice: 'saturn_zh_male_chengshuzongcai_tob' },
  { variant: 'sc-2.0', name: '磁性男嗓', voice: 'saturn_zh_male_cixingnansang_tob' },
  { variant: 'sc-2.0', name: '醋精男友', voice: 'saturn_zh_male_cujingnanyou_tob' },
  { variant: 'sc-2.0', name: '风发少年', voice: 'saturn_zh_male_fengfashaonian_tob' },
  { variant: 'sc-2.0', name: '腹黑公子', voice: 'saturn_zh_male_fuheigongzi_tob' },
] as const

const variantName = (variant: DoubaoRealtimeVoice['variant']): string =>
  variant === 's2s-o' ? 'S2S-O' : 'SC 2.0'

/** Realtime voice-backed profiles shown by the Doubao Speech provider. */
export const DOUBAO_SPEECH_CATALOG: readonly DoubaoSpeechCatalogEntry[] = DOUBAO_REALTIME_VOICES.map(entry => ({
  id: `doubao/realtime/${entry.voice}`,
  summary: `Volcengine Realtime Duplex 3.0 ${variantName(entry.variant)} profile using the ${entry.name} voice.`,
  registration: {
    enabled: false,
    connection: DOUBAO_SPEECH_PROVIDER,
    model: '1.2.6.1',
    displayName: `豆包 ${variantName(entry.variant)} · ${entry.name}`,
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
      protocolModel: '1.2.6.1',
      variant: entry.variant,
      voice: entry.voice,
      inputSampleRate: 16000,
      outputSampleRate: 24000,
      nativeFunctionCalling: true,
    },
  },
}))
