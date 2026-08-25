export const NS = 'multiModelProvider'

export const EN = {
  requestFailed: 'Request failed',
  providerVolcengine: 'Volcengine Ark',
  providerDoubaoSpeech: 'Doubao Speech',
  portraitsEmpty: 'Register or select at least one model in this profile before portraits appear here.',
  portraitSelectTitle: 'Select model',
  refreshModelRegistry: 'Refresh registered models',
  registeredModelCount: '{count} registered models',
  modelRegistryFailure: '{provider} model registry failed: {message}',
  portraitTabCollect: 'Collect',
  portraitTabView: 'View',
  portraitStartCollection: 'Start collection',
  portraitOpenSession: 'Open Session',
  portraitJobsUnavailable: 'Portrait collection requires the dsh-temporary-workspace profile bundle. Install and enable it, then restart this profile.',
  'portraitJob.queued': 'queued',
  'portraitJob.running': 'running',
  'portraitJob.completed': 'completed',
  'portraitJob.failed': 'failed',
  portraitDescriptionMissing: 'No researched description has been saved yet. The Agent will fill it from cited sources.',
  pricingUnknown: 'No sourced pricing has been saved yet.',
  'portraitState.valid': 'valid',
  'portraitState.partial': 'partial',
  'portraitState.invalid': 'invalid',
  'portraitState.unvalidated': 'unvalidated',
  'portraitState.missing': 'missing',
  inputLabel: 'Input: {value}',
  outputLabel: 'Output: {value}',
  unknown: 'unknown',
  pricing: 'Pricing',
  evidence: 'Evidence',
  noEvidence: 'No evidence yet. The Agent adds cited sources while building the portrait.',
  validation: 'Validation',
  notValidated: 'Not validated yet',
  retry: 'Retry',
  tabPortraits: 'Model portraits',
  loadingPortraits: 'Loading model portraits…',
  availability: 'Availability',
  reachable: 'Reachable',
  unreachable: 'Unreachable',
  notProbed: 'Not probed yet',
  timeToFirstToken: 'Time to first token',
  totalLatency: 'Total latency',
  probeObservedAt: 'Observed {time} · one tiny request; it only describes that moment',
}

export const ZH = {
  ...EN,
  requestFailed: '请求失败',
  providerVolcengine: '火山方舟',
  providerDoubaoSpeech: '豆包语音',
  portraitsEmpty: '当前 profile 的统一模型注册表中还没有可展示的模型。',
  portraitSelectTitle: '选择模型',
  refreshModelRegistry: '刷新统一模型注册表',
  registeredModelCount: '已注册 {count} 个模型',
  modelRegistryFailure: '{provider} 模型注册表读取失败：{message}',
  portraitTabCollect: '采集',
  portraitTabView: '查看',
  portraitStartCollection: '开始采集',
  portraitOpenSession: '打开会话',
  portraitJobsUnavailable: '画像采集需要 dsh-temporary-workspace profile bundle。请安装并启用后重启当前 profile。',
  'portraitJob.queued': '排队中',
  'portraitJob.running': '进行中',
  'portraitJob.completed': '已完成',
  'portraitJob.failed': '失败',
  portraitDescriptionMissing: '尚未保存经过调研的说明；Agent 会根据带出处的资料补齐。',
  pricingUnknown: '尚未保存有来源支持的价格。',
  'portraitState.valid': '有效',
  'portraitState.partial': '部分有效',
  'portraitState.invalid': '无效',
  'portraitState.unvalidated': '未校验',
  'portraitState.missing': '缺失',
  inputLabel: '输入：{value}',
  outputLabel: '输出：{value}',
  unknown: '未知',
  pricing: '价格',
  evidence: '证据',
  noEvidence: '暂无证据；Agent 建立画像时会补入带出处的资料。',
  validation: '校验',
  notValidated: '尚未校验',
  retry: '重试',
  tabPortraits: '模型画像',
  loadingPortraits: '正在加载模型画像…',
  availability: '可用性',
  reachable: '可访问',
  unreachable: '不可访问',
  notProbed: '尚未实测',
  timeToFirstToken: '首 Token',
  totalLatency: '总延迟',
  probeObservedAt: '观测时间：{time} · 单次极小请求，仅代表当时链路状态',
}

const withEnglish = (overrides) => ({ ...EN, ...overrides })

export const DICTIONARIES = {
  en: EN,
  zh: ZH,
  'zh-TW': withEnglish({ tabPortraits: '模型畫像', loadingPortraits: '正在載入模型畫像…' }),
  ja: withEnglish({ tabPortraits: 'モデルプロファイル', loadingPortraits: 'モデルプロファイルを読み込み中…' }),
  ko: withEnglish({ tabPortraits: '모델 프로필', loadingPortraits: '모델 프로필 불러오는 중…' }),
  es: withEnglish({ tabPortraits: 'Perfiles de modelos', loadingPortraits: 'Cargando perfiles…' }),
  fr: withEnglish({ tabPortraits: 'Profils de modèles', loadingPortraits: 'Chargement des profils…' }),
  de: withEnglish({ tabPortraits: 'Modellprofile', loadingPortraits: 'Modellprofile werden geladen…' }),
  'pt-BR': withEnglish({ tabPortraits: 'Perfis de modelos', loadingPortraits: 'Carregando perfis…' }),
  ru: withEnglish({ tabPortraits: 'Профили моделей', loadingPortraits: 'Загрузка профилей…' }),
  ar: withEnglish({ tabPortraits: 'ملفات النماذج', loadingPortraits: 'جارٍ تحميل الملفات…' }),
  hi: withEnglish({ tabPortraits: 'मॉडल प्रोफ़ाइल', loadingPortraits: 'प्रोफ़ाइल लोड हो रही हैं…' }),
}

let translate = (key, vars) => {
  let text = EN[key] ?? key
  if (vars) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

/** Bind this JSX surface to the shared host locale service. */
export function installTranslator(next) {
  const previous = translate
  translate = next
  return () => { translate = previous }
}

export function t(key, vars) {
  return translate(key, vars)
}
