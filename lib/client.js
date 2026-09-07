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
			arkSetup: "Configure Volcengine Ark",
			arkTitle: "Volcengine Ark · Pay-as-you-go",
			arkHint: "The official endpoint is filled in. Fetch the account catalog, select models, and save them for the session model selector.",
			arkDefaultUrl: "Restore official endpoint",
			arkKeyStored: "Key saved; leave blank to keep it",
			arkKeyRequired: "Ark API key",
			arkFetchModels: "Fetch available models",
			arkChooseModels: "Select the models to enable. Discovery does not save them automatically.",
			arkEmptyModels: "The endpoint returned an empty catalog. Check account access or enter the exact model/endpoint ID below.",
			arkModelIds: "Model IDs · one per line",
			arkManualHint: "If listing is unavailable, copy the exact model ID or ep-* endpoint ID from the Ark console. At least one model is required to save this route.",
			arkSave: "Save Ark configuration",
			arkSaved: "Ark configuration saved. The models are available in the session model selector.",
			requestFailed: "Request failed",
			settingsReadUnavailable: "No settings read channel is available in this client build.",
			providerVolcengine: "Volcengine Ark",
			providerDoubaoSpeech: "Doubao Speech",
			portraitsEmpty: "Register or select at least one model in this profile before portraits appear here.",
			portraitSelectTitle: "Select model",
			refreshModelRegistry: "Refresh registered models",
			registeredModelCount: "{count} registered models",
			modelRegistryFailure: "{provider} model registry failed: {message}",
			portraitTabCollect: "Collect",
			portraitTabView: "View",
			portraitStartCollection: "Collect in current Session",
			portraitStartingCollection: "Starting…",
			portraitSkillHint: "Collection runs as the collect-model-portraits skill in the current Session. It does not create a background Agent or temporary Workspace.",
			portraitNeedsSession: "Open or create a Session before collecting a portrait.",
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
			pricing: "Pricing",
			evidence: "Evidence",
			noEvidence: "No evidence yet. The Agent adds cited sources while building the portrait.",
			validation: "Validation",
			notValidated: "Not validated yet",
			retry: "Retry",
			tabPortraits: "Model portraits",
			loadingPortraits: "Loading model portraits…",
			availability: "Availability",
			reachable: "Reachable",
			unreachable: "Unreachable",
			notProbed: "Not probed yet",
			timeToFirstToken: "Time to first token",
			totalLatency: "Total latency",
			probeObservedAt: "Observed {time} · one tiny request; it only describes that moment"
		};
		const ZH = {
			...EN,
			arkSetup: "配置火山方舟",
			arkTitle: "火山方舟 · 按量计费",
			arkHint: "已填入官方默认地址。获取当前账号的模型目录，选择模型并保存后，即可在会话中选用。",
			arkDefaultUrl: "恢复官方默认地址",
			arkKeyStored: "密钥已保存，留空保留",
			arkKeyRequired: "填写方舟 API Key",
			arkFetchModels: "获取可用模型",
			arkChooseModels: "勾选需要启用的模型；获取目录不会自动保存。",
			arkEmptyModels: "接口返回了空目录。请检查账号访问权限，或在下方填写准确的模型／接入点 ID。",
			arkModelIds: "模型 ID · 每行一个",
			arkManualHint: "若无法获取目录，可从方舟控制台复制准确的模型 ID 或 ep-* 接入点 ID。至少填写一个模型才能保存这条路由。",
			arkSave: "保存方舟配置",
			arkSaved: "方舟配置已保存，可在会话的模型选择器中选用。",
			requestFailed: "请求失败",
			settingsReadUnavailable: "当前客户端没有可用的设置读取通道。",
			providerVolcengine: "火山方舟",
			providerDoubaoSpeech: "豆包语音",
			portraitsEmpty: "当前 profile 的统一模型注册表中还没有可展示的模型。",
			portraitSelectTitle: "选择模型",
			refreshModelRegistry: "刷新统一模型注册表",
			registeredModelCount: "已注册 {count} 个模型",
			modelRegistryFailure: "{provider} 模型注册表读取失败：{message}",
			portraitTabCollect: "采集",
			portraitTabView: "查看",
			portraitStartCollection: "在当前会话采集",
			portraitStartingCollection: "正在启动…",
			portraitSkillHint: "采集由当前会话中的 collect-model-portraits skill 执行，不再创建后台 Agent 或临时工作区。",
			portraitNeedsSession: "请先打开或创建一个会话，再采集画像。",
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
			pricing: "价格",
			evidence: "证据",
			noEvidence: "暂无证据；Agent 建立画像时会补入带出处的资料。",
			validation: "校验",
			notValidated: "尚未校验",
			retry: "重试",
			tabPortraits: "模型画像",
			loadingPortraits: "正在加载模型画像…",
			availability: "可用性",
			reachable: "可访问",
			unreachable: "不可访问",
			notProbed: "尚未实测",
			timeToFirstToken: "首 Token",
			totalLatency: "总延迟",
			probeObservedAt: "观测时间：{time} · 单次极小请求，仅代表当时链路状态"
		};
		const withEnglish = (overrides) => ({
			...EN,
			...overrides
		});
		const DICTIONARIES = {
			en: EN,
			zh: ZH,
			"zh-TW": withEnglish({
				tabPortraits: "模型畫像",
				loadingPortraits: "正在載入模型畫像…"
			}),
			ja: withEnglish({
				tabPortraits: "モデルプロファイル",
				loadingPortraits: "モデルプロファイルを読み込み中…"
			}),
			ko: withEnglish({
				tabPortraits: "모델 프로필",
				loadingPortraits: "모델 프로필 불러오는 중…"
			}),
			es: withEnglish({
				tabPortraits: "Perfiles de modelos",
				loadingPortraits: "Cargando perfiles…"
			}),
			fr: withEnglish({
				tabPortraits: "Profils de modèles",
				loadingPortraits: "Chargement des profils…"
			}),
			de: withEnglish({
				tabPortraits: "Modellprofile",
				loadingPortraits: "Modellprofile werden geladen…"
			}),
			"pt-BR": withEnglish({
				tabPortraits: "Perfis de modelos",
				loadingPortraits: "Carregando perfis…"
			}),
			ru: withEnglish({
				tabPortraits: "Профили моделей",
				loadingPortraits: "Загрузка профилей…"
			}),
			ar: withEnglish({
				tabPortraits: "ملفات النماذج",
				loadingPortraits: "جارٍ تحميل الملفات…"
			}),
			hi: withEnglish({
				tabPortraits: "मॉडल प्रोफ़ाइल",
				loadingPortraits: "प्रोफ़ाइल लोड हो रही हैं…"
			})
		};
		let translate = (key, vars) => {
			let text = EN[key] ?? key;
			if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
			return text;
		};
		/** Bind this JSX surface to the shared host locale service. */
		function installTranslator(next) {
			const previous = translate;
			translate = next;
			return () => {
				translate = previous;
			};
		}
		function t(key, vars) {
			return translate(key, vars);
		}
		//#endregion
		//#region src/client/portrait-targets.js
		function object$1(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function targetFromLanguage(raw) {
			const row = object$1(raw);
			if (typeof row.id !== "string" || typeof row.provider !== "string" || typeof row.model !== "string") return void 0;
			return {
				id: row.id,
				kind: "llm",
				provider: row.provider,
				providerName: typeof row.providerName === "string" && row.providerName ? row.providerName : row.provider,
				model: row.model,
				name: typeof row.displayName === "string" && row.displayName ? row.displayName : row.model,
				input: Array.isArray(row.inputModalities) && row.inputModalities.length ? row.inputModalities : ["text"],
				output: ["text"],
				enabled: row.status === "live",
				portrait: object$1(row.portrait)
			};
		}
		/**
		* Convert the server-side modelCatalog.snapshot() response into portrait rows.
		*
		* This is deliberately the same language-model collection exposed by DSH's
		* session model picker. Task models have their own registry and must not leak
		* into this Agent-model surface.
		*/
		function snapshotPortraitTargets(catalog) {
			return (Array.isArray(catalog?.languageModels) ? catalog.languageModels : []).map(targetFromLanguage).filter(Boolean);
		}
		//#endregion
		//#region src/volcengine-defaults.ts
		/** Shared by the Host tools and the native Models-page setup form. */
		const VOLCENGINE_PROVIDER = "volcengine";
		const VOLCENGINE_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
		const VOLCENGINE_ARK_API = "openai-completions";
		//#endregion
		//#region src/client/ark-settings.js
		function value(response) {
			if (!response.ok) throw new Error(response.error.message);
			return response.value;
		}
		async function loadArkSettings(remote) {
			const settings = value(await remote.settings.describe());
			const namespace = settings.namespaces.find((item) => item.ns === "llm-pi-ai");
			if (!namespace) throw new Error("llm-pi-ai settings are unavailable");
			const profile = namespace.value?.providers?.["volcengine"] ?? {};
			const ref = profile.apiKeyEnv || "ARK_API_KEY";
			return {
				namespace,
				profile,
				ref,
				keyConfigured: value(await remote.credentials.describe([ref]))[ref]?.configured === true,
				writable: settings.writable
			};
		}
		function arkDraft(snapshot) {
			return {
				baseURL: snapshot.profile.baseURL || "https://ark.cn-beijing.volces.com/api/v3",
				models: snapshot.profile.models ?? []
			};
		}
		async function discoverArkSettings(remote, draft, apiKey) {
			return value(await remote.llm.discoverModels("multi-model-provider", {
				provider: VOLCENGINE_PROVIDER,
				baseURL: draft.baseURL.trim() || "https://ark.cn-beijing.volces.com/api/v3",
				...apiKey.trim() ? { apiKey: apiKey.trim() } : {}
			}));
		}
		/** Save only the fields this form owns; adopt the revision before saving a key. */
		async function saveArkSettings(remote, snapshot, draft, apiKey, committed) {
			const baseURL = draft.baseURL.trim() || "https://ark.cn-beijing.volces.com/api/v3";
			const url = new URL(baseURL);
			if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("Base URL must be an HTTP(S) endpoint without credentials, query, or fragment");
			const key = apiKey.trim();
			if (key && (!/^[\x21-\x7e]+$/.test(key) || /^(?:[A-Z_][A-Z0-9_]*=|["'])/.test(key))) throw new Error("Paste the raw API key only");
			const models = draft.models.map((model) => ({
				...model,
				id: model.id.trim()
			}));
			if (!models.length || models.some((model) => !model.id)) throw new Error("Select at least one model or enter its exact model ID");
			if (new Set(models.map((model) => model.id)).size !== models.length) throw new Error("Model IDs must be unique");
			const fields = {
				baseURL,
				api: VOLCENGINE_ARK_API,
				apiKeyEnv: snapshot.ref,
				models
			};
			if (!snapshot.profile.displayName) fields.displayName = "火山方舟（按量计费）";
			const ops = Object.entries(fields).map(([field, next]) => ({
				op: "set",
				path: [
					"providers",
					VOLCENGINE_PROVIDER,
					field
				],
				value: next
			}));
			const namespace = value(await remote.settings.mutate("llm-pi-ai", ops, snapshot.namespace.revision));
			committed({
				...snapshot,
				namespace,
				profile: namespace.value.providers[VOLCENGINE_PROVIDER]
			});
			if (key) value(await remote.credentials.set(snapshot.ref, key));
		}
		/** Discovery capacity is not a request cap; preserve explicit saved model fields. */
		function arkModelsFromIds(text, previous, candidates) {
			return text.split(/\n/).map((id) => id.trim()).filter(Boolean).map((id) => {
				const saved = previous.find((model) => model.id === id);
				if (saved) return saved;
				const candidate = candidates.find((model) => model.id === id);
				return {
					id,
					...candidate?.name ? { name: candidate.name } : {},
					...candidate?.contextWindow ? { contextWindow: candidate.contextWindow } : {}
				};
			});
		}
		//#endregion
		//#region src/client/ark-settings.jsx
		/** Provider setup inside DSH's native Models page, backed by its own Remotes. */
		function ArkSetup({ remote, t }) {
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-page",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					className: "mmp-button",
					type: "button",
					onClick: () => setOpen(!open),
					"aria-expanded": open,
					children: t("arkSetup")
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArkForm, {
					remote,
					t
				})]
			});
		}
		function ArkForm({ remote, t }) {
			const [snapshot, setSnapshot] = (0, react.useState)();
			const [baseURL, setBaseURL] = (0, react.useState)(VOLCENGINE_ARK_BASE_URL);
			const [ids, setIds] = (0, react.useState)("");
			const [apiKey, setApiKey] = (0, react.useState)("");
			const [candidates, setCandidates] = (0, react.useState)([]);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [notice, setNotice] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				let active = true;
				loadArkSettings(remote).then((next) => {
					if (!active) return;
					setSnapshot(next);
					const draft = arkDraft(next);
					setBaseURL(draft.baseURL);
					setIds(draft.models.map((model) => model.id).join("\n"));
				}).catch((error) => {
					if (active) setError(error.message);
				});
				return () => {
					active = false;
				};
			}, [remote]);
			const run = async (action) => {
				setBusy(true);
				setError("");
				setNotice("");
				try {
					await action();
				} catch (error) {
					setError(error.message);
				} finally {
					setBusy(false);
				}
			};
			const discover = () => run(async () => {
				setCandidates([]);
				const found = await discoverArkSettings(remote, { baseURL }, apiKey);
				setCandidates(found);
				setNotice(found.length ? t("arkChooseModels") : t("arkEmptyModels"));
			});
			const save = () => run(async () => {
				await saveArkSettings(remote, snapshot, {
					baseURL,
					models: arkModelsFromIds(ids, snapshot.profile.models ?? [], candidates)
				}, apiKey, setSnapshot);
				setSnapshot(await loadArkSettings(remote));
				setApiKey("");
				setNotice(t("arkSaved"));
			});
			const selected = new Set(ids.split("\n").map((id) => id.trim()).filter(Boolean));
			const toggle = (id) => {
				if (selected.has(id)) selected.delete(id);
				else selected.add(id);
				setIds([...selected].join("\n"));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-subtitle",
						children: t("arkTitle")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("arkHint")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["Base URL", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "mmp-input",
						"aria-label": "Ark Base URL",
						value: baseURL,
						disabled: busy,
						onChange: (event) => {
							setBaseURL(event.target.value);
							setCandidates([]);
						}
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mmp-button",
						disabled: busy,
						onClick: () => {
							setBaseURL(VOLCENGINE_ARK_BASE_URL);
							setCandidates([]);
						},
						children: t("arkDefaultUrl")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: ["API Key", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "mmp-input",
						"aria-label": "Ark API Key",
						type: "password",
						autoComplete: "off",
						value: apiKey,
						disabled: busy,
						placeholder: snapshot?.keyConfigured ? t("arkKeyStored") : t("arkKeyRequired"),
						onChange: (event) => setApiKey(event.target.value)
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mmp-button",
						disabled: busy || !snapshot || !apiKey.trim() && !snapshot.keyConfigured,
						onClick: discover,
						children: t("arkFetchModels")
					}),
					candidates.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-list",
						children: candidates.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "mmp-row",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								type: "checkbox",
								disabled: busy,
								checked: selected.has(model.id),
								onChange: () => toggle(model.id)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [model.name ? `${model.name} · ` : "", model.id] })]
						}, model.id))
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", { children: [t("arkModelIds"), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
						className: "mmp-input",
						"aria-label": "Ark model IDs",
						rows: 4,
						disabled: busy,
						value: ids,
						onChange: (event) => setIds(event.target.value)
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: t("arkManualHint")
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-error",
						role: "alert",
						children: error
					}),
					notice && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						role: "status",
						children: notice
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mmp-button",
						disabled: busy || !snapshot?.writable || !ids.trim(),
						onClick: save,
						children: t("arkSave")
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.jsx
		const MULTI_NS = "multi-model-provider";
		const MODEL_CATALOG_PATH = "/dsh-multi-model-provider/catalog";
		const CSS = `
.mmp-page{display:flex;max-width:720px;flex-direction:column;gap:16px;padding-bottom:32px;color:var(--dsw-alias-label-primary)}
.mmp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;display:flex;flex-direction:column;gap:14px;padding:14px 16px}
.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}.mmp-button:disabled{opacity:.45;cursor:default}
.mmp-title{font-size:16px;font-weight:600}.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-input{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-status{font-size:12px;padding:2px 7px;border-radius:999px;background:var(--dsw-alias-bg-module-platform)}.mmp-status[data-state=valid]{color:var(--dsw-alias-state-success-primary,#16803c)}.mmp-status[data-state=invalid]{color:var(--dsw-alias-state-error-primary,#c33)}.mmp-status[data-state=partial]{color:var(--dsw-alias-state-warning-primary,#9a6700)}
.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}
.mmp-list{display:flex;max-height:360px;flex-direction:column;gap:2px;overflow:auto}.mmp-row{display:flex;gap:10px;align-items:flex-start;padding:9px 2px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mmp-row-main{flex:1;min-width:0}.mmp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mmp-tag{font-size:11px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-module-platform)}
.mmp-portrait-page{max-width:720px}.mmp-portrait-panel{display:flex;min-width:0;flex-direction:column;gap:16px}.mmp-portrait-tabs{display:flex;gap:20px;border-bottom:1px solid var(--dsw-alias-border-l2)}.mmp-portrait-tab{border:0;border-bottom:2px solid transparent;padding:9px 2px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}.mmp-portrait-tab[data-active=true]{border-bottom-color:var(--dsw-alias-label-primary);color:var(--dsw-alias-label-primary);font-weight:600}.mmp-model-picker{font-size:14px;padding:11px 12px}
.mmp-portrait-view{display:flex;flex-direction:column;gap:14px}.mmp-checks{display:flex;flex-direction:column;gap:5px}.mmp-check{font-size:12px}.mmp-check[data-status=warn]{color:var(--dsw-alias-state-warning-primary,#9a6700)}.mmp-check[data-status=fail]{color:var(--dsw-alias-state-error-primary,#c33)}
.mmp-markdown{max-height:360px;overflow:auto;margin:0;border-radius:9px;padding:12px;background:var(--dsw-alias-bg-module-platform);font:12px/1.65 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
.mmp-rate{display:grid;grid-template-columns:minmax(90px,1.2fr) minmax(90px,1fr) auto auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--dsw-alias-border-l2);font-size:12px}.mmp-rate:last-child{border-bottom:0}
.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mmp-job{display:flex;flex-direction:column;gap:6px;border-radius:9px;padding:10px 12px;background:var(--dsw-alias-bg-module-platform)}
@media(max-width:760px){.mmp-grid,.mmp-grid3{grid-template-columns:1fr}.mmp-rate{grid-template-columns:1fr 1fr}}
`;
		function object(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function responseValue(response) {
			const result = response?.result ?? response;
			if (!result?.ok) throw new Error(result?.error?.message ?? t("requestFailed"));
			return result.value;
		}
		/**
		* Read the redacted settings document over a channel this browser build has.
		*
		* The typed `remote.settings` namespace exists only when the running DSH
		* client assembly mounts the settings-controller contribution; older
		* assemblies (e.g. dsh-api-remotes 0.1.1-rc.2) never mount it, so a bare
		* `api.settings.describe()` throws "Cannot read properties of undefined
		* (reading 'describe')". The static Connection carrier is part of
		* dsh-client-connection itself and is always present — the same read path
		* the built-in settings UI uses — so prefer it and keep the typed namespace
		* as a fallback for assemblies that scope reads per caller.
		*/
		function describeSettings(api, connection) {
			const carrier = connection?.api?.settings;
			if (typeof carrier?.describe === "function") return carrier.describe({}).then(responseValue);
			const typed = api?.settings;
			if (typeof typed?.describe === "function") return typed.describe().then(responseValue);
			return Promise.reject(new Error(t("settingsReadUnavailable")));
		}
		function useConfig(api, connection, includeModelCatalog = false) {
			const [state, setState] = (0, react.useState)({
				status: "loading",
				multi: void 0,
				modelCatalog: {
					languageModels: [],
					taskModels: [],
					languageFailures: []
				},
				writable: false
			});
			const load = async () => {
				setState((current) => ({
					...current,
					status: "loading",
					error: void 0
				}));
				try {
					const [settings, modelCatalog] = await Promise.all([describeSettings(api, connection), includeModelCatalog ? fetch(MODEL_CATALOG_PATH, {
						credentials: "same-origin",
						cache: "no-store"
					}).then(async (response) => {
						if (!response.ok) throw new Error(`model catalog HTTP ${response.status}`);
						return response.json();
					}) : Promise.resolve({
						languageModels: [],
						taskModels: [],
						languageFailures: []
					})]);
					const byNs = new Map(settings.namespaces.map((item) => [item.ns, item]));
					setState({
						status: "ready",
						multi: byNs.get(MULTI_NS),
						modelCatalog,
						writable: settings.writable
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
			}, [
				api,
				connection,
				includeModelCatalog
			]);
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
		/** Localized user-facing Provider name; route ids remain stable technical identifiers only. */
		function providerNameOf(target) {
			if (target.provider === "volcengine") return t("providerVolcengine");
			if (target.provider === "doubao-speech") return t("providerDoubaoSpeech");
			return target.providerName || target.provider || t("unknown");
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
		/** Two flat tasks: collect a portrait or view the latest result. */
		function PortraitViewer({ config, reload, sessions, close }) {
			const targets = (0, react.useMemo)(() => snapshotPortraitTargets(config.modelCatalog), [config.modelCatalog]);
			const catalogFailures = Array.isArray(config.modelCatalog?.languageFailures) ? config.modelCatalog.languageFailures : [];
			const [targetId, setTargetId] = (0, react.useState)(targets[0]?.id ?? "");
			const [portraitTab, setPortraitTab] = (0, react.useState)("collect");
			const [launching, setLaunching] = (0, react.useState)(false);
			const [launchError, setLaunchError] = (0, react.useState)(void 0);
			const target = targets.find((item) => item.id === targetId) ?? targets[0];
			(0, react.useEffect)(() => {
				if (targets.length && !targets.some((item) => item.id === targetId)) setTargetId(targets[0].id);
			}, [targets, targetId]);
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
			const startCollection = async () => {
				if (!target || launching) return;
				setLaunching(true);
				setLaunchError(void 0);
				try {
					const sessionId = sessions.list.getSnapshot().current;
					if (!sessionId) throw new Error(t("portraitNeedsSession"));
					const binding = sessions.binding(sessionId);
					if (!binding) throw new Error(t("portraitNeedsSession"));
					const response = await binding.session.prompt([{
						type: "text",
						text: `/collect-model-portraits ${target.id}`
					}], "queue");
					if (!response.ok) throw new Error(response.error.message);
					close();
					sessions.open(sessionId);
				} catch (cause) {
					setLaunchError(cause instanceof Error ? cause.message : String(cause));
				} finally {
					setLaunching(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mmp-portrait-panel",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-portrait-tabs",
						role: "tablist",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mmp-portrait-tab",
							role: "tab",
							"aria-selected": portraitTab === "collect",
							"data-active": portraitTab === "collect",
							onClick: () => setPortraitTab("collect"),
							children: t("portraitTabCollect")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mmp-portrait-tab",
							role: "tab",
							"aria-selected": portraitTab === "view",
							"data-active": portraitTab === "view",
							onClick: () => setPortraitTab("view"),
							children: t("portraitTabView")
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mmp-button",
							onClick: () => void reload(),
							children: t("refreshModelRegistry")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-muted",
							children: t("registeredModelCount", { count: targets.length })
						})]
					}),
					catalogFailures.map((failure) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-error",
						children: t("modelRegistryFailure", {
							provider: failure.name || failure.id,
							message: failure.message
						})
					}, failure.id)),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						"aria-label": t("portraitSelectTitle"),
						className: "mmp-input mmp-model-picker",
						value: target?.id ?? "",
						onChange: (event) => setTargetId(event.target.value),
						children: targets.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
							value: item.id,
							children: [
								item.name,
								" · ",
								providerNameOf(item),
								" · ",
								t(`portraitState.${stateOf(object(item.portrait))}`)
							]
						}, item.id))
					}),
					portraitTab === "collect" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "mmp-muted",
							children: t("portraitSkillHint")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mmp-button",
							disabled: launching || !target,
							onClick: () => void startCollection(),
							children: launching ? t("portraitStartingCollection") : t("portraitStartCollection")
						}) }),
						launchError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "mmp-error",
							children: launchError
						})
					] }),
					portraitTab === "view" && target && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-portrait-view",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "mmp-status",
								"data-state": state,
								children: t(`portraitState.${state}`)
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-tags",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mmp-tag",
									children: t("inputLabel", { value: target.input.join(" + ") || t("unknown") })
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "mmp-tag",
									children: t("outputLabel", { value: target.output.join(" + ") || t("unknown") })
								})]
							})] }),
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
				]
			});
		}
		function PortraitSettings({ api, connection, sessions, close }) {
			const [config, reload] = useConfig(api, connection, true);
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
					reload,
					sessions,
					close
				})
			});
		}
		const inject = [
			"slots",
			"locale",
			"sessions",
			"remote",
			"connection"
		];
		function apply(ctx) {
			ctx.inject([
				"remote.settings",
				"remote.credentials",
				"remote.llm"
			], (scope) => {
				scope.slots.inject("settings.models.footer", () => scope.slots.register({
					name: "settings.models.footer",
					id: "volcengine-setup",
					order: 10,
					locale: NS,
					inject: () => ({
						remote: scope.remote,
						t: scope.locale.bind(NS)
					})
				}, ArkSetup));
			});
			ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), "multi-model-provider: locale dictionaries");
			ctx.effect(() => installTranslator(ctx.locale.bind(NS)), "multi-model-provider: locale binding");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-multi-model-provider";
				tag.textContent = CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "multi-model-provider: settings styles");
			const sessions = ctx.get("sessions");
			const connection = ctx.get("connection");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "model-portraits",
				order: 11,
				label: () => t("tabPortraits"),
				locale: NS,
				inject: () => ({
					api: ctx.remote,
					connection,
					sessions
				})
			}, PortraitSettings));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map