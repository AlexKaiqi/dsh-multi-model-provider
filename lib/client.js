window.__ModuleLoader__.load({
	id: "dsh-multi-model-provider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/i18n.js
		const NS = "multiModelProvider";
		const EN = {
			honestyBanner: "This plugin registers models and portraits. Image, speech, and realtime invoke need a separate runtime adapter. Doubao Realtime tests need dsh-realtime-voice.",
			configured: "Configured · {source}",
			secureStore: "secure store",
			notConfigured: "Not configured",
			keepExisting: "Leave blank to keep the stored value",
			writeOnlyPlaceholder: "Written only to the local credential store",
			needArkKeyToDiscover: "Enter an Ark API key first. Discovery uses it once and never echoes it.",
			discoveredModels: "Found {count} models. Select some, then save.",
			autoDiscoveredModels: "Automatically loaded {count} models from Ark.",
			llmSettingsMissing: "llm-pi-ai settings are not loaded",
			needArkKeyToEnable: "Configure an API key before enabling Ark models",
			arkEndpointInvalid: "The Ark API base URL must be an https:// URL.",
			arkEnabled: "Enabled {count} Ark language models.",
			arkDisabled: "Saved Ark with no selected language models.",
			arkTitle: "Ark · language / vision-language models",
			arkHint: "Provider ID: volcengine. Models are written to the host llm-pi-ai registry.",
			arkProviderHint: "Official OpenAI-compatible endpoint. When a stored key is available, opening this page automatically loads the account model catalog from /models.",
			arkApiKey: "Ark API Key",
			queryCatalog: "Query available models",
			clearAll: "Clear all",
			protocol: "Protocol: {api}",
			manualModelPlaceholder: "Add a model / ep-* endpoint id manually",
			add: "Add",
			searchModels: "Search models",
			searchModelsPlaceholder: "Search by model id or display name",
			showingModels: "Showing {shown} / {total} models",
			contextWindow: "context {value}",
			maxTokens: "output {value}",
			noMatchingModels: "No matching models.",
			noArkSelection: "No models selected. Query the catalog, add an id, or leave everything unselected.",
			saveArkWithCount: "Save Ark config ({count})",
			saveArkNone: "Save: select none",
			removeArk: "Remove Ark",
			removeArkConfirm: "Remove the Ark provider profile and its page-managed local API key?",
			arkRemoved: "Ark was removed. Reopen this page to configure it again.",
			loadingArk: "Loading Ark configuration…",
			requestFailed: "Request failed",
			speechSavedRealtimeOk: "Registered {count} Doubao speech models. Realtime probe passed ({ms} ms).",
			speechSaved: "Registered {count} Doubao speech models.",
			speechDisabled: "Disabled every Doubao speech model.",
			speechSavedRealtimeSkipped: "Registered {count} Doubao speech models. Realtime probe skipped: {reason}",
			needDoubaoAppId: "Selected models need a Doubao App ID",
			needSpeechToken: "ASR / TTS models need a speech access token",
			needRealtimeApiKey: "Realtime Duplex models need a Realtime API Key",
			needRealtimeCreds: "Save App ID and Realtime API Key first",
			realtimeOk: "Realtime probe passed ({ms} ms).",
			doubaoSpeech: "Doubao Speech",
			doubaoHint: "Separate provider ID: doubao-speech. Models come from the built-in speech catalog, not Ark /models.",
			doubaoProviderTitle: "Doubao Speech provider",
			doubaoProviderHint: "Configure the Realtime provider here. Secrets stay in the secure credential store and never enter settings.yaml.",
			doubaoApiKey: "Doubao API Key",
			doubaoVoices: "Realtime voices",
			doubaoVoicesHint: "{count} documented voice profiles are available. Select only the voices that should be callable.",
			doubaoEndpointInvalid: "The Doubao Realtime endpoint must be a wss:// URL.",
			needDoubaoApiKey: "Select at least one voice and configure DOUBAO_API_KEY first.",
			removeDoubao: "Remove provider",
			removeDoubaoConfirm: "Remove the Doubao Speech connection, selected voices, and page-managed local credentials?",
			doubaoRemoved: "Doubao Speech was removed. Its disabled built-in catalog remains available for reconfiguration.",
			doubaoAppId: "Doubao App ID",
			speechToken: "Speech token",
			realtimeApiKey: "Realtime API Key",
			searchTaskModels: "Search task models",
			searchTaskPlaceholder: "Search by model, capability, or input/output",
			credentialReady: "Credentials ready",
			credentialMissing: "Credentials missing",
			noMatchingTasks: "No matching task models.",
			saveSpeechWithCount: "Save and register ({count})",
			saveSpeechNone: "Save: disable all",
			testRealtime: "Test Realtime connection",
			realtimeSaveHint: "Saving an enabled Realtime Duplex route probes the connection. Registration still succeeds if dsh-realtime-voice is not installed.",
			talkToTextMissing: "dsh-realtime-voice is not installed. This plugin only registers the Doubao Realtime route; install that plugin to run a live connection test.",
			talkToTextUnreachable: "Could not reach the Doubao Realtime probe. Install dsh-realtime-voice, or check that Web is serving that plugin.",
			realtimeProbeFailed: "Doubao Realtime probe failed (HTTP {status})",
			taskModelTag: "Task models",
			doubaoReady: "Doubao Speech credentials configured",
			doubaoNotReady: "Doubao Speech is not ready",
			credentialsConfigured: "Credentials configured",
			notReady: "Not ready",
			enabledModelCount: "{count} models enabled",
			noModelsEnabled: "No models enabled",
			collapse: "Collapse",
			edit: "Edit",
			volcengineTitle: "Volcengine",
			volcengineHint: "Ark language models, Doubao speech, and Realtime share provider volcengine; credentials and wire protocols stay per capability.",
			volcengineSettings: "Volcengine",
			volcengineSettingsTitle: "Volcengine providers",
			volcengineSettingsHint: "Ark and Doubao belong to Volcengine, but use separate credentials, endpoints, model catalogs, and runtime protocols.",
			loadingSpeech: "Loading Volcengine speech capabilities…",
			settingsMissing: "multi-model-provider settings are not loaded",
			portraitSaved: "Portrait saved and structurally validated.",
			portraitsTitle: "Model portraits",
			portraitsEmpty: "Register or select at least one model before portraits appear here.",
			portraitsHint: "Read-only Agent output used by automatic routing. Research claims retain sources; live measurements retain observation times.",
			portraitsAgentOwned: "This plugin defines the portrait contract and acceptance checks. A background Agent researches inside an anonymous temporary workspace; Settings only starts jobs and displays validated results.",
			portraitResearchAll: "Generate / refresh needed portraits",
			portraitResearchCurrent: "Refresh this portrait",
			portraitProbeCurrent: "Authorize live test for this model",
			portraitSelectTitle: "1. Select a model",
			portraitSelectHint: "Search or filter the registered catalog, then choose the exact portrait target.",
			portraitSelectedModel: "Selected model",
			portraitSelectRequired: "Choose a model from the filtered results first.",
			portraitKindFilter: "Type",
			portraitProviderFilter: "Provider",
			portraitStateFilter: "Portrait state",
			portraitAvailabilityFilter: "Availability",
			filterAll: "All",
			filterLlm: "Language models",
			filterTask: "Task models",
			filterEnabled: "Enabled",
			filterDisabled: "Disabled",
			clearFilters: "Clear filters",
			portraitProbeConfirm: "Authorize a live test of {id}? This creates provider traffic and may incur a small charge.",
			portraitJobResearch: "research",
			portraitJobProbe: "live test",
			"portraitJob.queued": "queued",
			"portraitJob.running": "running",
			"portraitJob.completed": "completed",
			"portraitJob.failed": "failed",
			portraitInlineHint: "Read-only Agent result. Research and updates run as private background jobs; no Settings form or conversation input is required.",
			portraitDescriptionMissing: "No researched description has been saved yet. The Agent will fill it from cited sources.",
			pricingUnknown: "No sourced pricing has been saved yet.",
			"portraitState.valid": "valid",
			"portraitState.partial": "partial",
			"portraitState.invalid": "invalid",
			"portraitState.unvalidated": "unvalidated",
			"portraitState.missing": "missing",
			inputLabel: "Input: {value}",
			outputLabel: "Output: {value}",
			unknown: "unknown",
			summary: "Summary",
			specialties: "Strengths (one per line)",
			limitations: "Limits (one per line)",
			bestFor: "Good for",
			avoidFor: "Avoid for",
			speedClass: "Speed class",
			latencyMin: "Typical latency min (ms)",
			latencyMax: "Typical latency max (ms)",
			pricing: "Pricing",
			operation: "Operation",
			unit: "Billing unit",
			amount: "Amount",
			currency: "Currency",
			remove: "Remove",
			addPrice: "Add a price row",
			evidence: "Evidence",
			noEvidence: "No evidence yet. The Agent adds cited sources while building the portrait.",
			validation: "Validation",
			notValidated: "Not validated yet",
			savePortrait: "Save and validate portrait",
			loadingConfig: "Loading model configuration…",
			retry: "Retry",
			tabProvider: "Volcengine / Ark / Doubao",
			tabPortraits: "Model portraits",
			loadingPortraits: "Loading model portraits…",
			loadingModelNotes: "Loading model notes…",
			notesSaved: "Model notes saved.",
			modelUnreachable: "Model unreachable (HTTP {status})",
			probeSaved: "Live probe finished and saved.",
			probeFailedSaved: "Probe failed; the failure was saved.",
			notesTitle: "Model notes and runtime metrics",
			notesHint: "Qualitative notes live in one sectioned Markdown document. Availability and speed come from a live probe, not hand entry. Prices stay structured by billing unit.",
			notesMarkdown: "Model notes (Markdown)",
			availability: "Availability",
			reachable: "Reachable",
			unreachable: "Unreachable",
			notProbed: "Not probed yet",
			timeToFirstToken: "Time to first token",
			totalLatency: "Total latency",
			probeObservedAt: "Observed {time} · one tiny request; it only describes that moment",
			saveNotes: "Save notes and prices",
			testSpeed: "Test availability and speed",
			probeCostHint: "The speed test sends one request capped at eight tokens and may incur a small provider charge.",
			realtimePortraitProbeHint: "The Realtime test opens one minimal Doubao session and may incur a small provider charge.",
			taskPortraitProbeHint: "This task-model portrait can be edited here. Run an approved Agent portrait validation when its runtime adapter needs a live probe."
		};
		const ZH = {
			honestyBanner: "本插件负责登记模型和画像。图片 / 语音 / Realtime 的真正调用需要另装 runtime adapter。豆包 Realtime 连接测试需要 dsh-realtime-voice。",
			configured: "已配置 · {source}",
			secureStore: "安全存储",
			notConfigured: "未配置",
			keepExisting: "留空则保持现有值",
			writeOnlyPlaceholder: "仅写入本机安全凭据存储",
			needArkKeyToDiscover: "请先输入方舟 API Key；查询只会临时使用它，不会回显。",
			discoveredModels: "查询到 {count} 个模型；请勾选后保存。",
			autoDiscoveredModels: "已从方舟自动拉取 {count} 个模型。",
			llmSettingsMissing: "llm-pi-ai 设置未加载",
			needArkKeyToEnable: "启用方舟模型前需要配置 API Key",
			arkEndpointInvalid: "方舟 API Base URL 必须使用 https:// 地址。",
			arkEnabled: "已启用 {count} 个方舟模型。",
			arkDisabled: "方舟已保存，当前未选择语言模型。",
			arkTitle: "方舟 · 语言 / 视觉语言模型",
			arkHint: "标准 Provider ID：volcengine。模型写入 DSH 的 llm-pi-ai 注册表。",
			arkProviderHint: "使用官方 OpenAI 兼容端点；已有密钥时，点击进入本页会自动通过 /models 拉取账号可用模型。",
			arkApiKey: "方舟 API Key",
			queryCatalog: "查询可用模型",
			clearAll: "全部取消",
			protocol: "协议：{api}",
			manualModelPlaceholder: "手动添加模型 / ep-* Endpoint ID",
			add: "添加",
			searchModels: "检索模型",
			searchModelsPlaceholder: "按模型 ID 或显示名称检索",
			showingModels: "显示 {shown} / {total} 个模型",
			contextWindow: "上下文 {value}",
			maxTokens: "输出 {value}",
			noMatchingModels: "没有匹配的模型。",
			noArkSelection: "尚未选择模型。可以查询目录、手动填模型 ID，或保持全不选。",
			saveArkWithCount: "保存方舟配置（{count}）",
			saveArkNone: "保存：全部不选",
			removeArk: "删除方舟",
			removeArkConfirm: "确定删除方舟 Provider 配置和本页管理的本地 API Key 吗？",
			arkRemoved: "已删除方舟；以后可重新进入本页配置。",
			loadingArk: "正在加载方舟配置…",
			requestFailed: "请求失败",
			speechSavedRealtimeOk: "已注册 {count} 个豆包语音模型；Realtime 连接测试通过（{ms} ms）。",
			speechSaved: "已注册 {count} 个豆包语音模型。",
			speechDisabled: "已停用全部豆包语音模型。",
			speechSavedRealtimeSkipped: "已注册 {count} 个豆包语音模型。Realtime 测试未执行：{reason}",
			needDoubaoAppId: "已选模型需要豆包 App ID",
			needSpeechToken: "ASR / TTS 模型需要语音 Access Token",
			needRealtimeApiKey: "Realtime Duplex 模型需要 Realtime API Key",
			needRealtimeCreds: "请先保存 App ID 和 Realtime API Key",
			realtimeOk: "Realtime 连接测试通过（{ms} ms）。",
			doubaoSpeech: "豆包语音",
			doubaoHint: "独立 Provider ID：doubao-speech。模型来自内置语音能力目录，不使用方舟 /models 接口。",
			doubaoProviderTitle: "豆包语音 Provider",
			doubaoProviderHint: "在页面中管理 Realtime Provider。密钥只写入安全凭据库，不会进入 settings.yaml。",
			doubaoApiKey: "豆包 API Key",
			doubaoVoices: "Realtime 音色",
			doubaoVoicesHint: "共 {count} 个官方音色 Profile；只勾选需要开放调用的音色。",
			doubaoEndpointInvalid: "豆包 Realtime 地址必须是 wss:// URL。",
			needDoubaoApiKey: "请先选择至少一个音色并配置 DOUBAO_API_KEY。",
			removeDoubao: "删除 Provider",
			removeDoubaoConfirm: "确定删除豆包语音连接、已选音色和页面管理的本地凭据吗？",
			doubaoRemoved: "已删除豆包语音。内置目录已恢复为停用状态，可随时重新配置。",
			doubaoAppId: "豆包 App ID",
			speechToken: "语音 Token",
			realtimeApiKey: "Realtime API Key",
			searchTaskModels: "检索任务模型",
			searchTaskPlaceholder: "按模型、能力或输入输出类型检索",
			credentialReady: "凭据就绪",
			credentialMissing: "缺少凭据",
			noMatchingTasks: "没有匹配的任务模型。",
			saveSpeechWithCount: "保存并注册（{count}）",
			saveSpeechNone: "保存：全部停用",
			testRealtime: "测试 Realtime 连接",
			realtimeSaveHint: "保存已启用的 Realtime Duplex 时会尝试连接测试。未安装 dsh-realtime-voice 时登记仍然成功。",
			talkToTextMissing: "未安装 dsh-realtime-voice。本插件只登记豆包 Realtime 路由；要做实况连接测试请安装该插件。",
			talkToTextUnreachable: "无法访问豆包 Realtime 探测接口。请安装 dsh-realtime-voice，或确认 Web 已加载该插件。",
			realtimeProbeFailed: "豆包 Realtime 测试失败（HTTP {status}）",
			taskModelTag: "任务模型",
			doubaoReady: "豆包语音凭据已配置",
			doubaoNotReady: "豆包语音尚未就绪",
			credentialsConfigured: "凭据已配置",
			notReady: "尚未就绪",
			enabledModelCount: "已启用 {count} 个模型",
			noModelsEnabled: "尚未启用模型",
			collapse: "收起",
			edit: "编辑",
			volcengineTitle: "火山引擎",
			volcengineHint: "方舟语言模型、豆包语音和 Realtime 统一归属 Provider：volcengine；仅凭据与运行协议按能力区分。",
			volcengineSettings: "火山引擎",
			volcengineSettingsTitle: "火山引擎 Provider",
			volcengineSettingsHint: "方舟与豆包同属火山引擎，但凭据、端点、模型目录和运行协议彼此独立。",
			loadingSpeech: "正在加载火山语音能力…",
			settingsMissing: "multi-model-provider 设置未加载",
			portraitSaved: "画像已保存并完成结构校验。",
			portraitsTitle: "模型画像",
			portraitsEmpty: "先注册或选择至少一个模型，画像目标才会出现在这里。",
			portraitsHint: "这里仅展示供自动路由使用的 Agent 画像结果；调研结论保留出处，实测数据保留观测时间。",
			portraitsAgentOwned: "插件负责定义画像契约和验收规则；后台 Agent 在匿名临时工作目录中调研。设置页只负责启动任务和展示通过校验的结果。",
			portraitResearchAll: "生成 / 刷新待完善画像",
			portraitResearchCurrent: "刷新当前画像",
			portraitProbeCurrent: "授权实测当前模型",
			portraitSelectTitle: "1. 选择模型",
			portraitSelectHint: "先检索或筛选模型目录，再明确选择要查看或调研的画像目标。",
			portraitSelectedModel: "当前选中模型",
			portraitSelectRequired: "请先从筛选结果中选择模型。",
			portraitKindFilter: "类型",
			portraitProviderFilter: "Provider",
			portraitStateFilter: "画像状态",
			portraitAvailabilityFilter: "启用状态",
			filterAll: "全部",
			filterLlm: "语言模型",
			filterTask: "任务模型",
			filterEnabled: "仅启用",
			filterDisabled: "仅停用",
			clearFilters: "清除筛选",
			portraitProbeConfirm: "确认授权实测 {id} 吗？这会产生 Provider 流量，并可能产生少量费用。",
			portraitJobResearch: "调研",
			portraitJobProbe: "实测",
			"portraitJob.queued": "排队中",
			"portraitJob.running": "进行中",
			"portraitJob.completed": "已完成",
			"portraitJob.failed": "失败",
			portraitInlineHint: "这里只读展示 Agent 产出的结果；调研与更新由私有后台任务完成，不需要设置页手填，也不占用用户对话。",
			portraitDescriptionMissing: "尚未保存经过调研的说明；Agent 会根据带出处的资料补齐。",
			pricingUnknown: "尚未保存有来源支持的价格。",
			"portraitState.valid": "有效",
			"portraitState.partial": "部分有效",
			"portraitState.invalid": "无效",
			"portraitState.unvalidated": "未校验",
			"portraitState.missing": "缺失",
			inputLabel: "输入：{value}",
			outputLabel: "输出：{value}",
			unknown: "未知",
			summary: "摘要",
			specialties: "擅长（每行一项）",
			limitations: "局限（每行一项）",
			bestFor: "适合",
			avoidFor: "避免用于",
			speedClass: "速度分级",
			latencyMin: "典型延迟最小值（ms）",
			latencyMax: "典型延迟最大值（ms）",
			pricing: "价格",
			operation: "操作",
			unit: "计费单位",
			amount: "金额",
			currency: "币种",
			remove: "删除",
			addPrice: "添加价格项",
			evidence: "证据",
			noEvidence: "暂无证据；Agent 建立画像时会补入带出处的资料。",
			validation: "校验",
			notValidated: "尚未校验",
			savePortrait: "保存并校验画像",
			loadingConfig: "正在加载模型配置…",
			retry: "重试",
			tabProvider: "火山 / 方舟 / 豆包",
			tabPortraits: "模型画像",
			loadingPortraits: "正在加载模型画像…",
			loadingModelNotes: "正在加载模型说明…",
			notesSaved: "模型说明已保存。",
			modelUnreachable: "模型不可访问（HTTP {status}）",
			probeSaved: "实测完成，结果已保存。",
			probeFailedSaved: "探测失败，失败结果已保存。",
			notesTitle: "模型说明与运行指标",
			notesHint: "文字信息集中为一份分章节 Markdown；可用性和速度来自实测，不再手填。价格仍按计费单位结构化保存。",
			notesMarkdown: "模型说明（Markdown）",
			availability: "可用性",
			reachable: "可访问",
			unreachable: "不可访问",
			notProbed: "尚未实测",
			timeToFirstToken: "首 Token",
			totalLatency: "总延迟",
			probeObservedAt: "观测时间：{time} · 单次极小请求，仅代表当时链路状态",
			saveNotes: "保存说明与价格",
			testSpeed: "测试可用性与速度",
			probeCostHint: "速度测试会向该模型发送一次最多 8 token 的极小请求，可能产生少量费用。",
			realtimePortraitProbeHint: "Realtime 测试会建立一次最短豆包会话，可能产生少量费用。",
			taskPortraitProbeHint: "可在这里编辑该任务模型画像；需要运行时实测时，请由 Agent 在明确授权后执行画像校验。"
		};
		const withEnglish = (overrides) => ({
			...EN,
			...overrides
		});
		const DICTIONARIES = {
			en: EN,
			zh: ZH,
			"zh-TW": withEnglish({
				volcengineSettings: "火山引擎",
				volcengineSettingsTitle: "火山引擎 Provider",
				tabProvider: "火山 / 方舟 / 豆包",
				tabPortraits: "模型畫像",
				arkTitle: "方舟 · 語言 / 視覺語言模型",
				queryCatalog: "查詢可用模型",
				clearAll: "全部取消",
				add: "新增",
				searchModels: "搜尋模型",
				noMatchingModels: "沒有相符的模型。",
				saveArkWithCount: "儲存方舟設定（{count}）",
				saveArkNone: "儲存：全部不選",
				removeArk: "移除方舟",
				loadingArk: "正在載入方舟設定…",
				doubaoSpeech: "豆包語音",
				searchTaskModels: "搜尋任務模型",
				credentialReady: "憑據就緒",
				credentialMissing: "缺少憑據",
				saveSpeechWithCount: "儲存並註冊（{count}）",
				saveSpeechNone: "儲存：全部停用",
				testRealtime: "測試 Realtime 連線",
				portraitsTitle: "模型畫像",
				loadingPortraits: "正在載入模型畫像…",
				filterAll: "全部",
				filterEnabled: "已啟用",
				filterDisabled: "已停用",
				loadingConfig: "正在載入模型設定…",
				retry: "重試"
			}),
			ja: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Volcengine プロバイダー",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "モデルプロファイル",
				arkTitle: "Ark · 言語 / 視覚言語モデル",
				queryCatalog: "利用可能なモデルを取得",
				clearAll: "すべて解除",
				add: "追加",
				searchModels: "モデルを検索",
				noMatchingModels: "一致するモデルがありません。",
				saveArkWithCount: "Ark 設定を保存（{count}）",
				saveArkNone: "保存：選択なし",
				removeArk: "Ark を削除",
				loadingArk: "Ark 設定を読み込み中…",
				doubaoSpeech: "Doubao 音声",
				searchTaskModels: "タスクモデルを検索",
				credentialReady: "認証情報あり",
				credentialMissing: "認証情報なし",
				saveSpeechWithCount: "保存して登録（{count}）",
				saveSpeechNone: "保存：すべて無効",
				testRealtime: "Realtime 接続をテスト",
				portraitsTitle: "モデルプロファイル",
				loadingPortraits: "モデルプロファイルを読み込み中…",
				filterAll: "すべて",
				filterEnabled: "有効",
				filterDisabled: "無効",
				loadingConfig: "モデル設定を読み込み中…",
				retry: "再試行"
			}),
			ko: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Volcengine 공급자",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "모델 프로필",
				arkTitle: "Ark · 언어 / 비전 언어 모델",
				queryCatalog: "사용 가능한 모델 조회",
				clearAll: "모두 해제",
				add: "추가",
				searchModels: "모델 검색",
				noMatchingModels: "일치하는 모델이 없습니다.",
				saveArkWithCount: "Ark 설정 저장({count})",
				saveArkNone: "저장: 선택 없음",
				removeArk: "Ark 제거",
				loadingArk: "Ark 설정 불러오는 중…",
				doubaoSpeech: "Doubao 음성",
				searchTaskModels: "작업 모델 검색",
				credentialReady: "자격 증명 준비됨",
				credentialMissing: "자격 증명 없음",
				saveSpeechWithCount: "저장 및 등록({count})",
				saveSpeechNone: "저장: 모두 비활성화",
				testRealtime: "Realtime 연결 테스트",
				portraitsTitle: "모델 프로필",
				loadingPortraits: "모델 프로필 불러오는 중…",
				filterAll: "전체",
				filterEnabled: "활성화",
				filterDisabled: "비활성화",
				loadingConfig: "모델 설정 불러오는 중…",
				retry: "다시 시도"
			}),
			es: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Proveedores de Volcengine",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "Perfiles de modelos",
				arkTitle: "Ark · modelos de lenguaje y visión",
				queryCatalog: "Consultar modelos disponibles",
				clearAll: "Borrar selección",
				add: "Añadir",
				searchModels: "Buscar modelos",
				noMatchingModels: "No hay modelos coincidentes.",
				saveArkWithCount: "Guardar configuración de Ark ({count})",
				saveArkNone: "Guardar sin selección",
				removeArk: "Eliminar Ark",
				loadingArk: "Cargando configuración de Ark…",
				doubaoSpeech: "Voz de Doubao",
				searchTaskModels: "Buscar modelos de tareas",
				credentialReady: "Credenciales listas",
				credentialMissing: "Faltan credenciales",
				saveSpeechWithCount: "Guardar y registrar ({count})",
				saveSpeechNone: "Guardar y desactivar todo",
				testRealtime: "Probar conexión Realtime",
				portraitsTitle: "Perfiles de modelos",
				loadingPortraits: "Cargando perfiles…",
				filterAll: "Todos",
				filterEnabled: "Activados",
				filterDisabled: "Desactivados",
				loadingConfig: "Cargando configuración de modelos…",
				retry: "Reintentar"
			}),
			fr: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Fournisseurs Volcengine",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "Profils de modèles",
				arkTitle: "Ark · modèles de langage et de vision",
				queryCatalog: "Rechercher les modèles disponibles",
				clearAll: "Tout désélectionner",
				add: "Ajouter",
				searchModels: "Rechercher des modèles",
				noMatchingModels: "Aucun modèle correspondant.",
				saveArkWithCount: "Enregistrer Ark ({count})",
				saveArkNone: "Enregistrer sans sélection",
				removeArk: "Supprimer Ark",
				loadingArk: "Chargement de la configuration Ark…",
				doubaoSpeech: "Voix Doubao",
				searchTaskModels: "Rechercher des modèles de tâche",
				credentialReady: "Identifiants prêts",
				credentialMissing: "Identifiants manquants",
				saveSpeechWithCount: "Enregistrer et inscrire ({count})",
				saveSpeechNone: "Enregistrer et tout désactiver",
				testRealtime: "Tester la connexion Realtime",
				portraitsTitle: "Profils de modèles",
				loadingPortraits: "Chargement des profils…",
				filterAll: "Tous",
				filterEnabled: "Activés",
				filterDisabled: "Désactivés",
				loadingConfig: "Chargement de la configuration…",
				retry: "Réessayer"
			}),
			de: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Volcengine-Anbieter",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "Modellprofile",
				arkTitle: "Ark · Sprach- und Bildsprachmodelle",
				queryCatalog: "Verfügbare Modelle abrufen",
				clearAll: "Auswahl löschen",
				add: "Hinzufügen",
				searchModels: "Modelle suchen",
				noMatchingModels: "Keine passenden Modelle.",
				saveArkWithCount: "Ark-Konfiguration speichern ({count})",
				saveArkNone: "Ohne Auswahl speichern",
				removeArk: "Ark entfernen",
				loadingArk: "Ark-Konfiguration wird geladen…",
				doubaoSpeech: "Doubao Sprache",
				searchTaskModels: "Aufgabenmodelle suchen",
				credentialReady: "Zugangsdaten bereit",
				credentialMissing: "Zugangsdaten fehlen",
				saveSpeechWithCount: "Speichern und registrieren ({count})",
				saveSpeechNone: "Speichern und alle deaktivieren",
				testRealtime: "Realtime-Verbindung testen",
				portraitsTitle: "Modellprofile",
				loadingPortraits: "Modellprofile werden geladen…",
				filterAll: "Alle",
				filterEnabled: "Aktiviert",
				filterDisabled: "Deaktiviert",
				loadingConfig: "Modellkonfiguration wird geladen…",
				retry: "Erneut versuchen"
			}),
			"pt-BR": withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Provedores Volcengine",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "Perfis de modelos",
				arkTitle: "Ark · modelos de linguagem e visão",
				queryCatalog: "Consultar modelos disponíveis",
				clearAll: "Limpar seleção",
				add: "Adicionar",
				searchModels: "Pesquisar modelos",
				noMatchingModels: "Nenhum modelo correspondente.",
				saveArkWithCount: "Salvar configuração do Ark ({count})",
				saveArkNone: "Salvar sem seleção",
				removeArk: "Remover Ark",
				loadingArk: "Carregando configuração do Ark…",
				doubaoSpeech: "Voz Doubao",
				searchTaskModels: "Pesquisar modelos de tarefa",
				credentialReady: "Credenciais prontas",
				credentialMissing: "Faltam credenciais",
				saveSpeechWithCount: "Salvar e registrar ({count})",
				saveSpeechNone: "Salvar e desativar tudo",
				testRealtime: "Testar conexão Realtime",
				portraitsTitle: "Perfis de modelos",
				loadingPortraits: "Carregando perfis…",
				filterAll: "Todos",
				filterEnabled: "Ativados",
				filterDisabled: "Desativados",
				loadingConfig: "Carregando configuração de modelos…",
				retry: "Tentar novamente"
			}),
			ru: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Провайдеры Volcengine",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "Профили моделей",
				arkTitle: "Ark · языковые и визуально-языковые модели",
				queryCatalog: "Получить доступные модели",
				clearAll: "Снять выбор",
				add: "Добавить",
				searchModels: "Поиск моделей",
				noMatchingModels: "Подходящих моделей нет.",
				saveArkWithCount: "Сохранить Ark ({count})",
				saveArkNone: "Сохранить без выбора",
				removeArk: "Удалить Ark",
				loadingArk: "Загрузка настроек Ark…",
				doubaoSpeech: "Речь Doubao",
				searchTaskModels: "Поиск моделей задач",
				credentialReady: "Учётные данные готовы",
				credentialMissing: "Нет учётных данных",
				saveSpeechWithCount: "Сохранить и зарегистрировать ({count})",
				saveSpeechNone: "Сохранить и отключить все",
				testRealtime: "Проверить Realtime-соединение",
				portraitsTitle: "Профили моделей",
				loadingPortraits: "Загрузка профилей…",
				filterAll: "Все",
				filterEnabled: "Включены",
				filterDisabled: "Отключены",
				loadingConfig: "Загрузка конфигурации моделей…",
				retry: "Повторить"
			}),
			ar: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "موفرو Volcengine",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "ملفات النماذج",
				arkTitle: "Ark · نماذج اللغة والرؤية",
				queryCatalog: "جلب النماذج المتاحة",
				clearAll: "مسح التحديد",
				add: "إضافة",
				searchModels: "بحث عن النماذج",
				noMatchingModels: "لا توجد نماذج مطابقة.",
				saveArkWithCount: "حفظ إعداد Ark ({count})",
				saveArkNone: "حفظ بلا تحديد",
				removeArk: "إزالة Ark",
				loadingArk: "جارٍ تحميل إعداد Ark…",
				doubaoSpeech: "صوت Doubao",
				searchTaskModels: "بحث عن نماذج المهام",
				credentialReady: "بيانات الاعتماد جاهزة",
				credentialMissing: "بيانات الاعتماد ناقصة",
				saveSpeechWithCount: "حفظ وتسجيل ({count})",
				saveSpeechNone: "حفظ وتعطيل الكل",
				testRealtime: "اختبار اتصال Realtime",
				portraitsTitle: "ملفات النماذج",
				loadingPortraits: "جارٍ تحميل الملفات…",
				filterAll: "الكل",
				filterEnabled: "مفعّلة",
				filterDisabled: "معطّلة",
				loadingConfig: "جارٍ تحميل إعداد النماذج…",
				retry: "إعادة المحاولة"
			}),
			hi: withEnglish({
				volcengineSettings: "Volcengine",
				volcengineSettingsTitle: "Volcengine प्रदाता",
				tabProvider: "Volcengine / Ark / Doubao",
				tabPortraits: "मॉडल प्रोफ़ाइल",
				arkTitle: "Ark · भाषा और विज़न मॉडल",
				queryCatalog: "उपलब्ध मॉडल पाएँ",
				clearAll: "चयन हटाएँ",
				add: "जोड़ें",
				searchModels: "मॉडल खोजें",
				noMatchingModels: "कोई मिलता मॉडल नहीं।",
				saveArkWithCount: "Ark सेटिंग सहेजें ({count})",
				saveArkNone: "बिना चयन सहेजें",
				removeArk: "Ark हटाएँ",
				loadingArk: "Ark सेटिंग लोड हो रही है…",
				doubaoSpeech: "Doubao वॉइस",
				searchTaskModels: "टास्क मॉडल खोजें",
				credentialReady: "क्रेडेंशियल तैयार",
				credentialMissing: "क्रेडेंशियल नहीं",
				saveSpeechWithCount: "सहेजें और पंजीकृत करें ({count})",
				saveSpeechNone: "सहेजें और सभी बंद करें",
				testRealtime: "Realtime कनेक्शन जाँचें",
				portraitsTitle: "मॉडल प्रोफ़ाइल",
				loadingPortraits: "प्रोफ़ाइल लोड हो रही हैं…",
				filterAll: "सभी",
				filterEnabled: "चालू",
				filterDisabled: "बंद",
				loadingConfig: "मॉडल सेटिंग लोड हो रही है…",
				retry: "फिर प्रयास करें"
			})
		};
		let translate = (key, vars) => {
			let text = EN[key] ?? key;
			if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		};
		/** Bind this legacy JSX surface to the shared host locale service. */
		function installTranslator(next) {
			const previous = translate;
			translate = next;
			return () => {
				translate = previous;
			};
		}
		/**
		* Translate a Settings chrome string, substituting `{name}` placeholders.
		*
		* Args:
		*   key: Stable message id from the EN/ZH tables.
		*   vars: Optional placeholder values, for example `{ count: 3 }`.
		*
		* Returns:
		*   Localized text. Unknown keys fall back to English, then to the key itself.
		*/
		function t(key, vars) {
			return translate(key, vars);
		}
		//#endregion
		//#region src/client/portrait-targets.js
		function object$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function modelRecord(value) {
			return typeof value === "string" ? { id: value } : object$1(value);
		}
		/** Build the shared portrait target list from the two Settings namespaces. */
		function snapshotPortraitTargets(multi, llm) {
			const root = object$1(multi?.value);
			const connections = object$1(root.connections);
			const task = Object.entries(object$1(root.models)).map(([id, raw]) => {
				const model = object$1(raw);
				return {
					id,
					kind: "task",
					provider: object$1(connections[model.connection]).provider ?? model.connection ?? "",
					model: model.model ?? "",
					name: model.displayName ?? model.model ?? id,
					input: Array.isArray(model.input) ? model.input : [],
					output: Array.isArray(model.output) ? model.output : [],
					task: model.task,
					enabled: model.enabled !== false,
					portrait: object$1(model.portrait)
				};
			});
			const providers = object$1(object$1(llm?.value).providers);
			const bindings = object$1(root.portraits);
			return [...Object.entries(providers).flatMap(([provider, raw]) => {
				const profile = object$1(raw);
				return (Array.isArray(profile.models) ? profile.models : []).flatMap((rawModel) => {
					const model = modelRecord(rawModel);
					if (typeof model.id !== "string" || !model.id.trim()) return [];
					const id = `llm:${provider}/${model.id}`;
					return [{
						id,
						kind: "llm",
						provider,
						model: model.id,
						name: model.name ?? model.id,
						input: Array.isArray(model.input) && model.input.length ? model.input : ["text"],
						output: ["text"],
						enabled: true,
						portrait: object$1(object$1(bindings[id]).portrait)
					}];
				});
			}), ...task];
		}
		function portraitTargetState(target) {
			const portrait = object$1(target?.portrait);
			return object$1(portrait.validation).state ?? (Object.keys(portrait).length ? "unvalidated" : "missing");
		}
		/** Filter the portrait selector without changing the underlying model registry. */
		function filterPortraitTargets(targets, filters = {}) {
			const query = String(filters.query ?? "").trim().toLocaleLowerCase();
			const kind = filters.kind ?? "all";
			const provider = filters.provider ?? "all";
			const state = filters.state ?? "all";
			const availability = filters.availability ?? "all";
			return targets.filter((item) => {
				if (kind !== "all" && item.kind !== kind) return false;
				if (provider !== "all" && item.provider !== provider) return false;
				if (state !== "all" && portraitTargetState(item) !== state) return false;
				if (availability === "enabled" && item.enabled === false) return false;
				if (availability === "disabled" && item.enabled !== false) return false;
				return !query || [
					item.name,
					item.id,
					item.provider,
					item.model,
					item.task
				].filter((value) => typeof value === "string").some((value) => value.toLocaleLowerCase().includes(query));
			});
		}
		//#endregion
		//#region src/client/index.jsx
		const MULTI_NS = "multi-model-provider";
		const LLM_NS = "llm-pi-ai";
		const CSS = `
.mmp-page{display:flex;max-width:720px;flex-direction:column;gap:16px;padding-bottom:32px;color:var(--dsw-alias-label-primary)}
.mmp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;gap:14px;padding:14px 16px}
.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}.mmp-button:disabled{opacity:.45;cursor:default}
.mmp-title{font-size:16px;font-weight:600}.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.mmp-field>label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.mmp-input{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-status{font-size:12px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-module-platform)}.mmp-status[data-state=valid]{color:var(--dsw-alias-state-success-primary,#16803c)}.mmp-status[data-state=invalid]{color:var(--dsw-alias-state-error-primary,#c33)}.mmp-status[data-state=partial]{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}
.mmp-list{display:flex;max-height:360px;flex-direction:column;gap:2px;overflow:auto}.mmp-row{display:flex;gap:10px;align-items:flex-start;padding:9px 2px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mmp-row-main{flex:1;min-width:0}.mmp-id{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.mmp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mmp-tag{font-size:11px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-module-platform)}
.mmp-provider-extension{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
.mmp-portrait-page{max-width:1080px}.mmp-portrait-layout{display:flex;flex-direction:column;gap:14px}.mmp-selector{display:flex;min-width:0;flex-direction:column;gap:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;padding:12px}.mmp-filter-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.mmp-selector-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));max-height:320px;gap:4px;overflow:auto}.mmp-selector-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.mmp-target{width:100%;border:1px solid transparent;border-radius:9px;padding:10px;text-align:left;background:transparent;color:inherit;font:inherit;cursor:pointer}.mmp-target:hover{background:var(--dsw-alias-bg-module-platform)}.mmp-target[data-active=true]{border-color:var(--dsw-alias-border-l1,var(--dsw-alias-label-secondary));background:var(--dsw-alias-bg-module-platform)}
.mmp-portrait-view{display:flex;flex-direction:column;gap:14px}.mmp-checks{display:flex;flex-direction:column;gap:5px}.mmp-check{font-size:12px}.mmp-check[data-status=warn]{color:var(--dsw-alias-state-warning-primary,#9a6700)}.mmp-check[data-status=fail]{color:var(--dsw-alias-state-error-primary,#c33)}
.mmp-markdown{max-height:360px;overflow:auto;margin:0;border-radius:9px;padding:12px;background:var(--dsw-alias-bg-module-platform);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.mmp-rate{display:grid;grid-template-columns:minmax(90px,1.2fr) minmax(90px,1fr) auto auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px}.mmp-rate:last-child{border-bottom:0}
.mmp-agent-note{border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform);font-size:12px;line-height:18px}
.mmp-action-block{display:flex;flex-direction:column;gap:10px;border-radius:10px;padding:12px;background:var(--dsw-alias-bg-module-platform)}.mmp-selected-model{display:flex;flex-direction:column;gap:3px;min-width:0}.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mmp-job{display:flex;flex-direction:column;gap:6px;border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform)}
@media(max-width:760px){.mmp-grid,.mmp-grid3,.mmp-filter-grid,.mmp-selector-list{grid-template-columns:1fr}.mmp-rate{grid-template-columns:1fr 1fr}}
`;
		function object(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function responseValue(response) {
			if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? t("requestFailed"));
			return response.result.value;
		}
		function useConfig(api) {
			const [state, setState] = (0, react.useState)({
				status: "loading",
				llm: void 0,
				multi: void 0
			});
			const load = async () => {
				setState((current) => ({
					...current,
					status: "loading",
					error: void 0
				}));
				try {
					const settings = await api.settings.describe({}).then(responseValue);
					const byNs = new Map(settings.namespaces.map((item) => [item.ns, item]));
					setState({
						status: "ready",
						llm: byNs.get(LLM_NS),
						multi: byNs.get(MULTI_NS)
					});
				} catch (error) {
					setState((current) => ({
						...current,
						status: "error",
						error: error instanceof Error ? error.message : String(error)
					}));
				}
			};
			(0, react.useEffect)(() => {
				load();
			}, [api]);
			return [state, load];
		}
		function descriptionOf(portrait) {
			if (typeof portrait.description === "string" && portrait.description.trim()) return portrait.description;
			if (typeof portrait.summary === "string" && portrait.summary.trim()) return portrait.summary;
			return "";
		}
		function stateOf(portrait) {
			return object(portrait.validation).state ?? (Object.keys(portrait).length ? "unvalidated" : "missing");
		}
		function usePortraitJob(onCompleted) {
			const [job, setJob] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const completed = (0, react.useRef)("");
			const load = async () => {
				const response = await fetch("/dsh-multi-model-provider/portrait-jobs", { credentials: "same-origin" });
				if (!response.ok) throw new Error(`portrait job status HTTP ${response.status}`);
				const value = await response.json();
				setJob(value.job);
				if (value.job?.finishedAt && value.job.id !== completed.current) {
					completed.current = value.job.id;
					onCompleted();
				}
				return value.job;
			};
			(0, react.useEffect)(() => {
				load().catch(() => void 0);
			}, []);
			(0, react.useEffect)(() => {
				if (!job || !["queued", "running"].includes(job.status)) return void 0;
				const timer = setInterval(() => {
					load().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
				}, 1500);
				return () => clearInterval(timer);
			}, [job?.id, job?.status]);
			const start = async (action, ids) => {
				setError(void 0);
				const response = await fetch("/dsh-multi-model-provider/portrait-jobs", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-dsh-portrait-job": "1"
					},
					credentials: "same-origin",
					body: JSON.stringify({
						action,
						...ids === void 0 ? {} : { ids },
						...action === "probe" ? { approved: true } : {}
					})
				});
				const value = await response.json().catch(() => ({}));
				if (!response.ok) throw new Error(value.error ?? `portrait job HTTP ${response.status}`);
				setJob(value.job);
			};
			return {
				job,
				error,
				start: (action, ids) => start(action, ids).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
			};
		}
		function MetricSummary({ portrait }) {
			const lastProbe = object(object(portrait.performance).lastProbe);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-grid3",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("availability")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: lastProbe.observedAt ? lastProbe.reachable ? t("reachable") : t("unreachable") : t("notProbed") })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("timeToFirstToken")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: Number.isFinite(lastProbe.timeToFirstTokenMs) ? `${lastProbe.timeToFirstTokenMs} ms` : "—" })] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("totalLatency")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: Number.isFinite(lastProbe.latencyMs) ? `${lastProbe.latencyMs} ms` : "—" })] })
				]
			}), lastProbe.observedAt && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-muted",
				children: t("probeObservedAt", { time: new Date(lastProbe.observedAt).toLocaleString() })
			})] });
		}
		function PriceSummary({ portrait }) {
			const pricing = object(portrait.pricing);
			const rates = Array.isArray(pricing.rates) ? pricing.rates : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-subtitle",
					children: t("pricing")
				}),
				rates.length ? rates.map((rate, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mmp-rate",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: rate.operation ?? "—" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: rate.unit ?? "—" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
							rate.amount ?? "—",
							" ",
							rate.currency ?? ""
						] }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: rate.effectiveFrom ?? "" })
					]
				}, `${rate.operation ?? ""}:${rate.unit ?? ""}:${index}`)) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-muted",
					children: t("pricingUnknown")
				}),
				pricing.notes && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-muted",
					children: pricing.notes
				})
			] });
		}
		function EvidenceAndValidation({ portrait }) {
			const evidence = Array.isArray(portrait.evidence) ? portrait.evidence : [];
			const checks = Array.isArray(object(portrait.validation).checks) ? portrait.validation.checks : [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-grid",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-subtitle",
					children: t("evidence")
				}), evidence.length ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-list",
					children: evidence.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-row",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mmp-row-main",
							children: [/^https?:\/\//.test(item.source ?? "") ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
								href: item.source,
								target: "_blank",
								rel: "noreferrer",
								children: item.source
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: item.source }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-tags",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mmp-tag",
									children: item.kind
								}), item.observedAt && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mmp-tag",
									children: item.observedAt
								})]
							})]
						})
					}, item.id))
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-muted",
					children: t("noEvidence")
				})] }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-subtitle",
					children: t("validation")
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mmp-checks",
					children: [checks.map((check) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-check",
						"data-status": check.status,
						children: [
							check.status === "pass" ? "✓" : check.status === "fail" ? "✕" : "△",
							" ",
							check.message
						]
					}, check.id)), checks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("notValidated")
					})]
				})] })]
			});
		}
		/** Read-only results for portraits created and maintained by the Agent. */
		function PortraitViewer({ config, reload }) {
			const targets = (0, react.useMemo)(() => snapshotPortraitTargets(config.multi, config.llm), [config.multi?.revision, config.llm?.revision]);
			const [targetId, setTargetId] = (0, react.useState)(targets[0]?.id ?? "");
			const [query, setQuery] = (0, react.useState)("");
			const [kindFilter, setKindFilter] = (0, react.useState)("all");
			const [providerFilter, setProviderFilter] = (0, react.useState)("all");
			const [stateFilter, setStateFilter] = (0, react.useState)("all");
			const [availabilityFilter, setAvailabilityFilter] = (0, react.useState)("all");
			const portraitJob = usePortraitJob(() => {
				reload();
			});
			const providers = (0, react.useMemo)(() => [...new Set(targets.map((item) => item.provider).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [targets]);
			const filteredTargets = (0, react.useMemo)(() => filterPortraitTargets(targets, {
				query,
				kind: kindFilter,
				provider: providerFilter,
				state: stateFilter,
				availability: availabilityFilter
			}), [
				targets,
				query,
				kindFilter,
				providerFilter,
				stateFilter,
				availabilityFilter
			]);
			const target = filteredTargets.find((item) => item.id === targetId) ?? filteredTargets[0];
			const filtersActive = Boolean(query.trim()) || kindFilter !== "all" || providerFilter !== "all" || stateFilter !== "all" || availabilityFilter !== "all";
			(0, react.useEffect)(() => {
				if (targets.length && !targets.some((item) => item.id === targetId)) setTargetId(targets[0].id);
			}, [targets, targetId]);
			(0, react.useEffect)(() => {
				if (filteredTargets.length && !filteredTargets.some((item) => item.id === targetId)) setTargetId(filteredTargets[0].id);
			}, [filteredTargets, targetId]);
			if (!targets.length) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
				className: "mmp-card",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-muted",
					children: t("portraitsEmpty")
				})
			});
			const portrait = object(target?.portrait);
			const state = stateOf(portrait);
			const description = descriptionOf(portrait);
			const jobBusy = ["queued", "running"].includes(portraitJob.job?.status);
			const runProbe = () => {
				if (!target) return;
				if (window.confirm(t("portraitProbeConfirm", { id: target.id }))) portraitJob.start("probe", [target.id]);
			};
			const clearFilters = () => {
				setQuery("");
				setKindFilter("all");
				setProviderFilter("all");
				setStateFilter("all");
				setAvailabilityFilter("all");
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mmp-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("portraitsHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-selector",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "mmp-subtitle",
								children: t("portraitSelectTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "mmp-muted",
								children: t("portraitSelectHint")
							})] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-filter-grid",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "mmp-portrait-search",
											children: t("searchModels")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											id: "mmp-portrait-search",
											className: "mmp-input",
											type: "search",
											value: query,
											onChange: (event) => setQuery(event.target.value),
											placeholder: t("searchModelsPlaceholder")
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "mmp-portrait-kind",
											children: t("portraitKindFilter")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "mmp-portrait-kind",
											className: "mmp-input",
											value: kindFilter,
											onChange: (event) => setKindFilter(event.target.value),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "all",
													children: t("filterAll")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "llm",
													children: t("filterLlm")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "task",
													children: t("filterTask")
												})
											]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "mmp-portrait-provider",
											children: t("portraitProviderFilter")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "mmp-portrait-provider",
											className: "mmp-input",
											value: providerFilter,
											onChange: (event) => setProviderFilter(event.target.value),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "all",
												children: t("filterAll")
											}), providers.map((provider) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: provider,
												children: provider
											}, provider))]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "mmp-portrait-state",
											children: t("portraitStateFilter")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "mmp-portrait-state",
											className: "mmp-input",
											value: stateFilter,
											onChange: (event) => setStateFilter(event.target.value),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "all",
												children: t("filterAll")
											}), [
												"valid",
												"partial",
												"invalid",
												"unvalidated",
												"missing"
											].map((value) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value,
												children: t(`portraitState.${value}`)
											}, value))]
										})]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-field",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											htmlFor: "mmp-portrait-availability",
											children: t("portraitAvailabilityFilter")
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "mmp-portrait-availability",
											className: "mmp-input",
											value: availabilityFilter,
											onChange: (event) => setAvailabilityFilter(event.target.value),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "all",
													children: t("filterAll")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "enabled",
													children: t("filterEnabled")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "disabled",
													children: t("filterDisabled")
												})
											]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-selector-meta",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mmp-muted",
									children: t("showingModels", {
										shown: filteredTargets.length,
										total: targets.length
									})
								}), filtersActive && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mmp-button",
									onClick: clearFilters,
									children: t("clearFilters")
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-selector-list",
								children: [filteredTargets.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "mmp-target",
									"aria-pressed": item.id === target?.id,
									"data-active": item.id === target?.id,
									onClick: () => setTargetId(item.id),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: item.name }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "mmp-id",
											children: item.id
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: "mmp-tags",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-tag",
													children: item.kind
												}),
												item.task && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-tag",
													children: item.task
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-status",
													"data-state": stateOf(object(item.portrait)),
													children: t(`portraitState.${stateOf(object(item.portrait))}`)
												}),
												item.enabled === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-tag",
													children: "disabled"
												})
											]
										})
									]
								}, item.id)), filteredTargets.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "mmp-muted",
									children: t("noMatchingModels")
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-action-block",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mmp-selected-model",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mmp-muted",
								children: t("portraitSelectedModel")
							}), target ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mmp-subtitle",
								children: target.name
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mmp-id",
								children: target.id
							})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("portraitSelectRequired") })]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mmp-actions",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mmp-button",
									disabled: jobBusy || !target,
									onClick: () => target && void portraitJob.start("research", [target.id]),
									children: t("portraitResearchCurrent")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mmp-button",
									disabled: jobBusy || !target,
									onClick: runProbe,
									children: t("portraitProbeCurrent")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "mmp-button",
									disabled: jobBusy,
									onClick: () => void portraitJob.start("research"),
									children: t("portraitResearchAll")
								})
							]
						})]
					}),
					portraitJob.job && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-job",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							t(`portraitJob.${portraitJob.job.status}`),
							" · ",
							portraitJob.job.action === "probe" ? t("portraitJobProbe") : t("portraitJobResearch")
						] }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "mmp-muted",
							children: portraitJob.job.summary || portraitJob.job.error || portraitJob.job.phase || portraitJob.job.workspaceLabel
						})]
					}),
					portraitJob.error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-error",
						children: portraitJob.error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-agent-note",
						children: t("portraitsAgentOwned")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-portrait-layout",
						children: target && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "mmp-card mmp-portrait-view",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-subtitle",
										children: [
											target.name,
											" ",
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "mmp-status",
												"data-state": state,
												children: t(`portraitState.${state}`)
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
										className: "mmp-id",
										children: target.id
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										className: "mmp-tags",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mmp-tag",
											children: t("inputLabel", { value: target.input.join(" + ") || t("unknown") })
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "mmp-tag",
											children: t("outputLabel", { value: target.output.join(" + ") || t("unknown") })
										})]
									})
								] }),
								description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									className: "mmp-markdown",
									children: description
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
									className: "mmp-muted",
									children: t("portraitDescriptionMissing")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricSummary, { portrait }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PriceSummary, { portrait }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(EvidenceAndValidation, { portrait })
							]
						})
					})
				]
			});
		}
		function PortraitSettings({ api }) {
			const [config, reload] = useConfig(api);
			if (config.status === "loading" && !config.multi) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-page mmp-portrait-page",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-muted",
					children: t("loadingPortraits")
				})
			});
			if (config.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-page mmp-portrait-page",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-error",
					children: config.error
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "mmp-button",
					onClick: () => void reload(),
					children: t("retry")
				})]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-page mmp-portrait-page",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PortraitViewer, {
					config,
					reload
				})
			});
		}
		/** Compact read-only portrait summary below an LLM model row. */
		function ModelPortraitDetails({ api, provider, model, displayName }) {
			const [config] = useConfig(api);
			if (!model) return null;
			if (config.status === "loading" && !config.multi) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-muted",
				children: t("loadingPortraits")
			});
			if (config.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-error",
				children: config.error
			});
			const targetId = `llm:${provider}/${model}`;
			const portrait = object(object(object(object(config.multi?.value).portraits)[targetId]).portrait);
			const description = descriptionOf(portrait);
			const state = stateOf(portrait);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mmp-provider-extension",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-subtitle",
						children: [
							displayName || model,
							" · ",
							t("portraitsTitle"),
							" ",
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mmp-status",
								"data-state": state,
								children: t(`portraitState.${state}`)
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("portraitInlineHint")
					})] }),
					description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "mmp-markdown",
						children: description
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("portraitDescriptionMissing")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(MetricSummary, { portrait })
				]
			});
		}
		const inject = [
			"slots",
			"connection",
			"locale"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), "multi-model-provider: locale dictionaries");
			ctx.effect(() => installTranslator(ctx.locale.bind(NS)), "multi-model-provider: locale binding");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-multi-model-provider";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "multi-model-provider: settings styles");
			const connection = ctx.get("connection");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "model-portraits",
				order: 11,
				label: () => t("tabPortraits"),
				locale: NS,
				inject: () => ({ api: connection.api })
			}, PortraitSettings));
			ctx.slots.inject("settings.models.model.details", () => ctx.slots.register({
				name: "settings.models.model.details",
				id: "model-portrait",
				order: 10,
				locale: NS,
				inject: () => ({ api: connection.api })
			}, ModelPortraitDetails));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map