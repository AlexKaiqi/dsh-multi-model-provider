export const NS = 'multiModelProvider'

export const EN = {
  arkSetup: 'Configure Volcengine Ark',
  arkTitle: 'Volcengine Ark · Pay-as-you-go',
  arkHint: 'The official endpoint is filled in. Fetch the account catalog, select models, and save them for the session model selector.',
  arkDefaultUrl: 'Restore official endpoint',
  arkKeyStored: 'Key saved; leave blank to keep it',
  arkKeyRequired: 'Ark API key',
  arkFetchModels: 'Fetch available models',
  arkChooseModels: 'Select the models to enable. Discovery does not save them automatically.',
  arkEmptyModels: 'The endpoint returned an empty catalog. Check account access or enter the exact model/endpoint ID below.',
  arkModelIds: 'Model IDs · one per line',
  arkManualHint: 'If listing is unavailable, copy the exact model ID or ep-* endpoint ID from the Ark console. At least one model is required to save this route.',
  arkSave: 'Save Ark configuration',
  arkSaved: 'Ark configuration saved. The models are available in the session model selector.',
  requestFailed: 'Request failed',
  settingsReadUnavailable: 'No settings read channel is available in this client build.',
  providerVolcengine: 'Volcengine Ark',
  providerDoubaoSpeech: 'Doubao Speech',
  portraitsEmpty: 'Register or select at least one model in this profile before portraits appear here.',
  portraitSelectTitle: 'Select model',
  refreshModelRegistry: 'Refresh registered models',
  registeredModelCount: '{count} registered models',
  modelRegistryFailure: '{provider} model registry failed: {message}',
  portraitTabCollect: 'Collect',
  portraitTabView: 'View',
  portraitStartCollection: 'Collect in current Session',
  portraitStartingCollection: 'Starting…',
  portraitSkillHint: 'Collection runs as the collect-model-portraits skill in the current Session. It does not create a background Agent or temporary Workspace.',
  portraitNeedsSession: 'Open or create a Session before collecting a portrait.',
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
  arkSetup: '配置火山方舟',
  arkTitle: '火山方舟 · 按量计费',
  arkHint: '已填入官方默认地址。获取当前账号的模型目录，选择模型并保存后，即可在会话中选用。',
  arkDefaultUrl: '恢复官方默认地址',
  arkKeyStored: '密钥已保存，留空保留',
  arkKeyRequired: '填写方舟 API Key',
  arkFetchModels: '获取可用模型',
  arkChooseModels: '勾选需要启用的模型；获取目录不会自动保存。',
  arkEmptyModels: '接口返回了空目录。请检查账号访问权限，或在下方填写准确的模型／接入点 ID。',
  arkModelIds: '模型 ID · 每行一个',
  arkManualHint: '若无法获取目录，可从方舟控制台复制准确的模型 ID 或 ep-* 接入点 ID。至少填写一个模型才能保存这条路由。',
  arkSave: '保存方舟配置',
  arkSaved: '方舟配置已保存，可在会话的模型选择器中选用。',
  requestFailed: '请求失败',
  settingsReadUnavailable: '当前客户端没有可用的设置读取通道。',
  providerVolcengine: '火山方舟',
  providerDoubaoSpeech: '豆包语音',
  portraitsEmpty: '当前 profile 的统一模型注册表中还没有可展示的模型。',
  portraitSelectTitle: '选择模型',
  refreshModelRegistry: '刷新统一模型注册表',
  registeredModelCount: '已注册 {count} 个模型',
  modelRegistryFailure: '{provider} 模型注册表读取失败：{message}',
  portraitTabCollect: '采集',
  portraitTabView: '查看',
  portraitStartCollection: '在当前会话采集',
  portraitStartingCollection: '正在启动…',
  portraitSkillHint: '采集由当前会话中的 collect-model-portraits skill 执行，不再创建后台 Agent 或临时工作区。',
  portraitNeedsSession: '请先打开或创建一个会话，再采集画像。',
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
