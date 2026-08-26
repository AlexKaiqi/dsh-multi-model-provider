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
			requestFailed: "Request failed",
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
			requestFailed: "请求失败",
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
			if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? t("requestFailed"));
			return response.result.value;
		}
		function useConfig(api, includeModelCatalog = false) {
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
					const [settings, modelCatalog] = await Promise.all([api.settings.describe({}).then(responseValue), includeModelCatalog ? fetch(MODEL_CATALOG_PATH, {
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
			}, [api, includeModelCatalog]);
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
		function PortraitSettings({ api, sessions, close }) {
			const [config, reload] = useConfig(api, true);
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
			"connection",
			"locale",
			"sessions"
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
			const sessions = ctx.get("sessions");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "model-portraits",
				order: 11,
				label: () => t("tabPortraits"),
				locale: NS,
				inject: () => ({
					api: connection.api,
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