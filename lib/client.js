window.__ModuleLoader__.load({
	id: "dsh-multi-model-provider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/i18n.js
		const EN = {
			honestyBanner: "This plugin registers models and portraits. Image, speech, and realtime invoke need a separate runtime adapter. Doubao Realtime tests need dsh-talk-to-text.",
			configured: "Configured · {source}",
			secureStore: "secure store",
			notConfigured: "Not configured",
			keepExisting: "Leave blank to keep the stored value",
			writeOnlyPlaceholder: "Written only to the local credential store",
			needArkKeyToDiscover: "Enter an Ark API key first. Discovery uses it once and never echoes it.",
			discoveredModels: "Found {count} models. Select some, then save.",
			llmSettingsMissing: "llm-pi-ai settings are not loaded",
			needArkKeyToEnable: "Configure an API key before enabling Ark models",
			arkEnabled: "Enabled {count} Ark language models.",
			arkDisabled: "Cleared every Ark language-model selection.",
			arkTitle: "Ark · language / vision-language models",
			arkHint: "Provider ID: volcengine. Models are written to the host llm-pi-ai registry.",
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
			realtimeSaveHint: "Saving an enabled Realtime Duplex route probes the connection. Registration still succeeds if dsh-talk-to-text is not installed.",
			talkToTextMissing: "dsh-talk-to-text is not installed. This plugin only registers the Doubao Realtime route; install that plugin to run a live connection test.",
			talkToTextUnreachable: "Could not reach the Doubao Realtime probe. Install dsh-talk-to-text, or check that Web is serving that plugin.",
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
			loadingSpeech: "Loading Volcengine speech capabilities…",
			settingsMissing: "multi-model-provider settings are not loaded",
			portraitSaved: "Portrait saved and structurally validated.",
			portraitsTitle: "Model portraits",
			portraitsEmpty: "Register or select at least one model before portraits appear here.",
			portraitsHint: "Portraits feed later routing. Keep evidence and observation dates on price and latency. Usage stats live in a separate observation module.",
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
			noEvidence: "No evidence yet. Ask the Agent to build initial portraits; it fills sources and validates them.",
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
			probeCostHint: "The speed test sends one request capped at eight tokens and may incur a small provider charge."
		};
		const ZH = {
			honestyBanner: "本插件负责登记模型和画像。图片 / 语音 / Realtime 的真正调用需要另装 runtime adapter。豆包 Realtime 连接测试需要 dsh-talk-to-text。",
			configured: "已配置 · {source}",
			secureStore: "安全存储",
			notConfigured: "未配置",
			keepExisting: "留空则保持现有值",
			writeOnlyPlaceholder: "仅写入本机安全凭据存储",
			needArkKeyToDiscover: "请先输入方舟 API Key；查询只会临时使用它，不会回显。",
			discoveredModels: "查询到 {count} 个模型；请勾选后保存。",
			llmSettingsMissing: "llm-pi-ai 设置未加载",
			needArkKeyToEnable: "启用方舟模型前需要配置 API Key",
			arkEnabled: "已启用 {count} 个方舟模型。",
			arkDisabled: "已取消全部方舟语言模型。",
			arkTitle: "方舟 · 语言 / 视觉语言模型",
			arkHint: "标准 Provider ID：volcengine。模型写入 DSH 的 llm-pi-ai 注册表。",
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
			realtimeSaveHint: "保存已启用的 Realtime Duplex 时会尝试连接测试。未安装 dsh-talk-to-text 时登记仍然成功。",
			talkToTextMissing: "未安装 dsh-talk-to-text。本插件只登记豆包 Realtime 路由；要做实况连接测试请安装该插件。",
			talkToTextUnreachable: "无法访问豆包 Realtime 探测接口。请安装 dsh-talk-to-text，或确认 Web 已加载该插件。",
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
			loadingSpeech: "正在加载火山语音能力…",
			settingsMissing: "multi-model-provider 设置未加载",
			portraitSaved: "画像已保存并完成结构校验。",
			portraitsTitle: "模型画像",
			portraitsEmpty: "先注册或选择至少一个模型，画像目标才会出现在这里。",
			portraitsHint: "画像用于后续自动路由；价格和延迟应保留证据及观测日期。调用统计由独立观测模块采集，不写进这里。",
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
			noEvidence: "暂无证据。让 Agent“整理初始画像”会按画像本体定义补齐来源并自动校验。",
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
			probeCostHint: "速度测试会向该模型发送一次最多 8 token 的极小请求，可能产生少量费用。"
		};
		/**
		* Pick Settings copy from the document language, then the browser language.
		*
		* Returns:
		*   `zh` when the UI language starts with zh, otherwise `en`.
		*/
		function settingsLocale() {
			return String(typeof document !== "undefined" && document.documentElement?.lang || typeof navigator !== "undefined" && navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
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
			let text = (settingsLocale() === "zh" ? ZH : EN)[key] ?? EN[key] ?? key;
			if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		}
		//#endregion
		//#region src/client/index.jsx
		const MULTI_NS = "multi-model-provider";
		const CSS = `
.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}
.mmp-button[data-primary=true]{background:var(--dsw-alias-interactive-bg-active,#e9e9e9);font-weight:600}
.mmp-button:disabled{opacity:.45;cursor:default}.mmp-button[data-danger=true]{color:var(--dsw-alias-label-error,#c33)}
.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.mmp-field>label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.mmp-input,.mmp-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-textarea{min-height:82px;resize:vertical}.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}.mmp-success{font-size:12px;color:var(--dsw-alias-label-success,#16803c)}
.mmp-price{display:grid;grid-template-columns:1.2fr 1fr .7fr .7fr auto;gap:7px;align-items:end}
.mmp-provider-extension{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
@media(max-width:760px){.mmp-grid3{grid-template-columns:1fr}.mmp-price{grid-template-columns:1fr 1fr}.mmp-price .mmp-button{grid-column:span 2}}
`;
		function object(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function responseValue(response) {
			if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? t("requestFailed"));
			return response.result.value;
		}
		function initialPortrait(summary = "") {
			return {
				schemaVersion: 1,
				...summary.trim() ? { description: `# ${summary.trim()}\n` } : {},
				specialties: [],
				limitations: [],
				bestFor: [],
				avoidFor: [],
				pricing: { rates: [] },
				performance: {},
				qualityScores: {},
				evidence: [],
				validation: {
					state: "unvalidated",
					checks: []
				}
			};
		}
		function validatePortrait(portrait) {
			const checks = [];
			const evidenceIds = new Set((portrait.evidence ?? []).map((item) => item.id));
			const hasDescription = Boolean(portrait.description || portrait.summary);
			checks.push({
				id: "portrait.description",
				status: hasDescription ? "pass" : "warn",
				message: hasDescription ? "已有 Markdown 说明" : "缺少 Markdown 说明"
			});
			checks.push({
				id: "portrait.pricing",
				status: portrait.pricing.rates.length ? "pass" : "warn",
				message: portrait.pricing.rates.length ? "已有价格" : "价格未知"
			});
			checks.push({
				id: "portrait.performance.speed",
				status: portrait.performance.speedClass ? "pass" : "warn",
				message: portrait.performance.speedClass ? "已有速度分级" : "速度未知"
			});
			portrait.pricing.rates.forEach((rate, index) => checks.push({
				id: `portrait.pricing.${index}`,
				status: rate.evidenceId && evidenceIds.has(rate.evidenceId) ? "pass" : "warn",
				message: rate.evidenceId && evidenceIds.has(rate.evidenceId) ? `${rate.operation} 价格有证据` : `${rate.operation} 价格缺少证据`
			}));
			if (portrait.performance.typicalLatencyMs) {
				const measured = (portrait.evidence ?? []).some((item) => [
					"benchmark",
					"runtime-probe",
					"usage"
				].includes(item.kind));
				checks.push({
					id: "portrait.performance.latency-evidence",
					status: measured ? "pass" : "warn",
					message: measured ? "延迟有测量证据" : "延迟缺少测量证据"
				});
			}
			return {
				state: checks.some((check) => check.status === "warn") ? "partial" : "valid",
				checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
				checks
			};
		}
		function useConfig(api) {
			const [state, setState] = (0, react.useState)({
				status: "loading",
				settingsWritable: false,
				multi: void 0
			});
			const load = async () => {
				setState((current) => ({
					...current,
					status: "loading",
					error: void 0
				}));
				try {
					const settings = responseValue(await api.settings.describe({}));
					const multi = settings.namespaces.find((item) => item.ns === MULTI_NS);
					setState({
						status: "ready",
						settingsWritable: settings.writable,
						multi
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
		function descriptionOf(portrait, fallbackName) {
			if (typeof portrait.description === "string" && portrait.description.trim()) return portrait.description;
			const sections = [];
			if (portrait.summary) sections.push(`# ${portrait.summary}`);
			const add = (title, values) => {
				if (Array.isArray(values) && values.length) sections.push(`## ${title}\n${values.map((value) => `- ${value}`).join("\n")}`);
			};
			add("擅长", portrait.specialties);
			add("局限", portrait.limitations);
			add("适合", portrait.bestFor);
			add("避免用于", portrait.avoidFor);
			return sections.join("\n\n") || `# ${fallbackName}\n\n## 定位\n\n## 擅长\n\n## 局限\n\n## 适用场景\n`;
		}
		function speedClassOf(probe) {
			const value = Number(probe.timeToFirstTokenMs ?? probe.latencyMs);
			if (value <= 1e3) return "instant";
			if (value <= 2500) return "fast";
			if (value <= 6e3) return "balanced";
			return "slow";
		}
		/** Qualitative Markdown plus structured, measured metrics for one model row. */
		function ModelPortraitDetails({ api, provider, model, displayName, disabled }) {
			const [config, reload] = useConfig(api);
			const [draft, setDraft] = (0, react.useState)(() => initialPortrait());
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			const targetId = `llm:${provider}/${model}`;
			const saved = object(object(object(object(config.multi?.value).portraits)[targetId]).portrait);
			(0, react.useEffect)(() => {
				const portrait = {
					...initialPortrait(),
					...saved,
					pricing: {
						rates: [],
						...object(saved.pricing)
					},
					performance: object(saved.performance),
					validation: object(saved.validation)
				};
				setDraft({
					...portrait,
					description: descriptionOf(portrait, displayName || model)
				});
			}, [
				config.multi?.revision,
				targetId,
				displayName
			]);
			if (!model) return null;
			if (config.status === "loading" && !config.multi) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-muted",
				children: t("loadingPortraits")
			});
			if (config.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "mmp-error",
				children: config.error
			});
			const rates = Array.isArray(draft.pricing?.rates) ? draft.pricing.rates : [];
			const setRate = (index, key, value) => setDraft((current) => ({
				...current,
				pricing: {
					...current.pricing,
					rates: rates.map((rate, at) => at === index ? {
						...rate,
						[key]: value
					} : rate)
				}
			}));
			const normalizedPortrait = (source) => {
				const description = String(source.description ?? "").trim();
				const portrait = {
					...initialPortrait(),
					...source,
					...description ? { description } : {},
					specialties: [],
					limitations: [],
					bestFor: [],
					avoidFor: [],
					pricing: {
						...object(source.pricing),
						rates: (source.pricing?.rates ?? []).map((rate) => ({
							...rate,
							amount: Number(rate.amount)
						})).filter((rate) => rate.operation && rate.unit && Number.isFinite(rate.amount) && rate.amount >= 0 && rate.currency)
					},
					performance: object(source.performance),
					evidence: Array.isArray(source.evidence) ? source.evidence : [],
					qualityScores: object(source.qualityScores)
				};
				delete portrait.summary;
				if (!description) delete portrait.description;
				portrait.validation = validatePortrait(portrait);
				return portrait;
			};
			const persist = async (source, successMessage) => {
				if (!config.multi) throw new Error(t("settingsMissing"));
				const portrait = normalizedPortrait(source);
				const value = {
					kind: "llm",
					provider,
					model,
					portrait
				};
				responseValue(await api.settings.mutate({
					ns: MULTI_NS,
					ops: [{
						op: "set",
						path: ["portraits", targetId],
						value
					}],
					expectedRevision: config.multi.revision
				}));
				setDraft(portrait);
				setMessage(successMessage);
				await reload();
			};
			const run = async (action) => {
				setBusy(true);
				setError(void 0);
				setMessage(void 0);
				try {
					await action();
				} catch (cause) {
					setError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setBusy(false);
				}
			};
			const save = () => run(() => persist(draft, t("notesSaved")));
			const probe = () => run(async () => {
				const started = Date.now();
				const response = provider === "doubao-speech" ? await fetch("/dsh-talk-to-text/realtime/doubao/probe", {
					method: "POST",
					headers: { "x-dsh-model-probe": "1" },
					credentials: "same-origin"
				}) : await fetch("/dsh-multi-model-provider/probe", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-dsh-model-probe": "1"
					},
					credentials: "same-origin",
					body: JSON.stringify({
						provider,
						model
					})
				});
				const result = await response.json().catch(() => ({}));
				const observedAt = typeof result.observedAt === "string" ? result.observedAt : (/* @__PURE__ */ new Date()).toISOString();
				const reachable = response.ok && result.ok === true;
				const lastProbe = {
					observedAt,
					reachable,
					latencyMs: Number.isFinite(result.latencyMs) ? result.latencyMs : Date.now() - started,
					...Number.isFinite(result.timeToFirstTokenMs) ? { timeToFirstTokenMs: result.timeToFirstTokenMs } : {}
				};
				const evidence = [...(Array.isArray(draft.evidence) ? draft.evidence : []).filter((item) => item.id !== "runtime-probe:latest"), {
					id: "runtime-probe:latest",
					kind: "runtime-probe",
					source: "DSH minimal live probe",
					observedAt,
					claims: reachable ? [
						"reachable=true",
						`latencyMs=${lastProbe.latencyMs}`,
						...lastProbe.timeToFirstTokenMs === void 0 ? [] : [`timeToFirstTokenMs=${lastProbe.timeToFirstTokenMs}`]
					] : ["reachable=false"],
					...reachable ? {} : { notes: String(result.error ?? `HTTP ${response.status}`) }
				}];
				const next = {
					...draft,
					performance: {
						...object(draft.performance),
						lastProbe,
						...reachable ? {
							speedClass: speedClassOf(lastProbe),
							typicalLatencyMs: {
								min: lastProbe.latencyMs,
								max: lastProbe.latencyMs
							}
						} : {}
					},
					evidence
				};
				await persist(next, reachable ? t("probeSaved") : t("probeFailedSaved"));
				if (!reachable) throw new Error(String(result.error ?? t("modelUnreachable", { status: response.status })));
			});
			const lastProbe = object(draft.performance?.lastProbe);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mmp-provider-extension",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-subtitle",
						children: t("notesTitle")
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("notesHint")
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: t("notesMarkdown") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: "mmp-textarea",
							style: { minHeight: 180 },
							value: draft.description ?? "",
							disabled: disabled || busy,
							onChange: (event) => setDraft((current) => ({
								...current,
								description: event.target.value
							}))
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
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
					}),
					lastProbe.observedAt && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("probeObservedAt", { time: new Date(lastProbe.observedAt).toLocaleString() })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-subtitle",
						children: t("pricing")
					}),
					rates.map((rate, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-price",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: t("operation") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mmp-input",
									value: rate.operation ?? "",
									disabled: disabled || busy,
									onChange: (event) => setRate(index, "operation", event.target.value),
									placeholder: "input / output"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: t("unit") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mmp-input",
									value: rate.unit ?? "",
									disabled: disabled || busy,
									onChange: (event) => setRate(index, "unit", event.target.value),
									placeholder: "1M tokens"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: t("amount") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mmp-input",
									type: "number",
									min: "0",
									step: "any",
									value: rate.amount ?? "",
									disabled: disabled || busy,
									onChange: (event) => setRate(index, "amount", event.target.value)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: t("currency") }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mmp-input",
									value: rate.currency ?? "CNY",
									disabled: disabled || busy,
									onChange: (event) => setRate(index, "currency", event.target.value.toUpperCase())
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "mmp-button",
								"data-danger": "true",
								disabled: disabled || busy,
								onClick: () => setDraft((current) => ({
									...current,
									pricing: {
										...current.pricing,
										rates: rates.filter((_, at) => at !== index)
									}
								})),
								children: t("remove")
							})
						]
					}, index)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-actions",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "mmp-button",
								disabled: disabled || busy,
								onClick: () => setDraft((current) => ({
									...current,
									pricing: {
										...current.pricing,
										rates: [...rates, {
											operation: "",
											unit: "",
											amount: "",
											currency: "CNY"
										}]
									}
								})),
								children: t("addPrice")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "mmp-button",
								"data-primary": "true",
								disabled: disabled || busy || !config.settingsWritable,
								onClick: save,
								children: t("saveNotes")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "mmp-button",
								disabled: disabled || busy || !config.settingsWritable,
								onClick: probe,
								children: t("testSpeed")
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("probeCostHint")
					}),
					message && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-success",
						role: "status",
						children: message
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-error",
						role: "alert",
						children: error
					})
				]
			});
		}
		const inject = ["slots", "connection"];
		function apply(ctx) {
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-multi-model-provider";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "multi-model-provider: settings styles");
			const connection = ctx.get("connection");
			ctx.slots.inject("settings.models.model.details", () => ctx.slots.register({
				name: "settings.models.model.details",
				id: "model-portrait",
				order: 10,
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