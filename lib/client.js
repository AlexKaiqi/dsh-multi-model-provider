window.__ModuleLoader__.load({
	id: "dsh-multi-model-provider",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/index.jsx
		const MULTI_NS = "multi-model-provider";
		const LLM_NS = "llm-pi-ai";
		const REFS = [
			"ARK_API_KEY",
			"DOUBAO_APPID",
			"DOUBAO_TOKEN",
			"DOUBAO_REALTIME_API_KEY"
		];
		const CSS = `
.mmp-page{display:flex;flex-direction:column;gap:20px;padding-bottom:32px;color:var(--dsw-alias-label-primary)}
.mmp-tabs{display:flex;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2);padding-bottom:10px}
.mmp-tab,.mmp-button{border:0;border-radius:9px;padding:8px 13px;background:var(--dsw-alias-bg-module-platform);color:inherit;font:inherit;cursor:pointer}
.mmp-tab[data-active=true],.mmp-button[data-primary=true]{background:var(--dsw-alias-interactive-bg-active,#e9e9e9);font-weight:600}
.mmp-button:disabled{opacity:.45;cursor:default}.mmp-button[data-danger=true]{color:var(--dsw-alias-label-error,#c33)}
.mmp-card{border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:14px;background:var(--dsw-alias-bg-card,transparent)}
.mmp-title{font-size:16px;font-weight:600}.mmp-subtitle{font-size:14px;font-weight:600}.mmp-muted{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.mmp-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.mmp-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.mmp-field{display:flex;flex-direction:column;gap:6px;min-width:0}.mmp-field>label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.mmp-input,.mmp-select,.mmp-textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;padding:9px 11px;background:var(--dsw-alias-bg-page-primary,transparent);color:inherit;font:inherit;font-size:13px}
.mmp-textarea{min-height:82px;resize:vertical}.mmp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.mmp-status{font-size:12px;padding:3px 8px;border-radius:999px;background:var(--dsw-alias-bg-module-platform)}
.mmp-status[data-ok=true]{color:var(--dsw-alias-label-success,#16803c)}.mmp-error{font-size:12px;color:var(--dsw-alias-label-error,#c33);white-space:pre-wrap}.mmp-success{font-size:12px;color:var(--dsw-alias-label-success,#16803c)}
.mmp-list{display:flex;flex-direction:column;gap:7px;max-height:320px;overflow:auto}.mmp-row{display:flex;gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.mmp-row-main{flex:1;min-width:0}.mmp-id{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.mmp-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}.mmp-tag{font-size:11px;padding:2px 6px;border-radius:5px;background:var(--dsw-alias-bg-module-platform)}
.mmp-portrait-layout{display:grid;grid-template-columns:minmax(190px,30%) minmax(0,1fr);gap:14px}.mmp-target{width:100%;text-align:left;border:0;border-radius:8px;padding:9px;background:transparent;color:inherit;cursor:pointer}.mmp-target[data-active=true]{background:var(--dsw-alias-bg-module-platform)}
.mmp-price{display:grid;grid-template-columns:1.2fr 1fr .7fr .7fr auto;gap:7px;align-items:end}.mmp-checks{display:flex;flex-direction:column;gap:5px}.mmp-check{font-size:12px}.mmp-check[data-status=warn]{color:var(--dsw-alias-label-warning,#9a6700)}
.mmp-divider{height:1px;background:var(--dsw-alias-border-l2);margin:3px 0}.mmp-capability{display:flex;flex-direction:column;gap:14px}.mmp-provider-extension{display:flex;flex-direction:column;gap:14px;margin-top:12px;padding-top:14px;border-top:1px solid var(--dsw-alias-border-l2)}
.mmp-search-summary{font-size:12px;color:var(--dsw-alias-label-tertiary)}
.mmp-provider-row{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:12px}.mmp-provider-head{display:flex;align-items:center;gap:8px}.mmp-provider-name{font-size:14px;line-height:22px;font-weight:500}.mmp-provider-actions{margin-left:auto}.mmp-provider-dot{width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-error-primary)}.mmp-provider-dot[data-ready=true]{background:var(--dsw-alias-state-success-primary)}.mmp-provider-editor{border-radius:12px;background:var(--dsw-alias-bg-module-platform);padding:14px 16px}
@media(max-width:760px){.mmp-grid,.mmp-grid3,.mmp-portrait-layout{grid-template-columns:1fr}.mmp-price{grid-template-columns:1fr 1fr}.mmp-price .mmp-button{grid-column:span 2}}
`;
		function object(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
		}
		function responseValue(response) {
			if (!response?.result?.ok) throw new Error(response?.result?.error?.message ?? "请求失败");
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
				llm: void 0,
				multi: void 0,
				credentials: {}
			});
			const load = async () => {
				setState((current) => ({
					...current,
					status: "loading",
					error: void 0
				}));
				try {
					const [settings, credentials] = await Promise.all([api.settings.describe({}).then(responseValue), api.credentials.describe({ refs: REFS }).then(responseValue)]);
					const byNs = new Map(settings.namespaces.map((item) => [item.ns, item]));
					setState({
						status: "ready",
						settingsWritable: settings.writable,
						llm: byNs.get(LLM_NS),
						multi: byNs.get(MULTI_NS),
						credentials: credentials.credentials
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
		function SecretField({ label, name, status, value, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-field",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					htmlFor: `mmp-${name}`,
					children: [
						label,
						" ",
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-status",
							"data-ok": status?.configured === true,
							children: status?.configured ? `已配置 · ${status.source ?? "安全存储"}` : "未配置"
						})
					]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					id: `mmp-${name}`,
					className: "mmp-input",
					type: "password",
					autoComplete: "off",
					value,
					onChange: (event) => onChange(event.target.value),
					placeholder: status?.configured ? "留空则保持现有值" : "仅写入本机安全凭据存储",
					disabled: status?.writable === false
				})]
			});
		}
		function TaskCapability({ api, config, reload, readOnly = false }) {
			const multiValue = object(config.multi?.value);
			const connections = object(multiValue.connections);
			const taskModels = Object.entries(object(multiValue.models)).filter(([, raw]) => {
				const model = object(raw);
				return model.connection === "doubao-speech" || object(connections[model.connection]).provider === "doubao-speech";
			});
			const [appId, setAppId] = (0, react.useState)("");
			const [token, setToken] = (0, react.useState)("");
			const [realtimeKey, setRealtimeKey] = (0, react.useState)("");
			const [query, setQuery] = (0, react.useState)("");
			const [enabledTasks, setEnabledTasks] = (0, react.useState)(() => new Set(taskModels.filter(([, raw]) => object(raw).enabled !== false).map(([id]) => id)));
			const [busy, setBusy] = (0, react.useState)(false);
			const [message, setMessage] = (0, react.useState)(void 0);
			const [error, setError] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				setEnabledTasks(new Set(taskModels.filter(([, raw]) => object(raw).enabled !== false).map(([id]) => id)));
			}, [config.multi?.revision]);
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
			const hasCredential = (ref, draft) => Boolean(draft.trim() || config.credentials[ref]?.configured === true);
			const realtimeSelected = taskModels.some(([id, raw]) => enabledTasks.has(id) && object(raw).task === "realtime-speech");
			const classicSpeechSelected = taskModels.some(([id, raw]) => enabledTasks.has(id) && object(raw).task !== "realtime-speech");
			const testRealtime = async () => {
				const response = await fetch("/dsh-talk-to-text/realtime/doubao/probe", {
					method: "POST",
					headers: { "x-dsh-model-probe": "1" }
				});
				const body = await response.json().catch(() => ({}));
				if (!response.ok || body.ok !== true) throw new Error(body.error ?? `豆包 Realtime 测试失败（HTTP ${response.status}）`);
				return body;
			};
			const saveProvider = () => run(async () => {
				if (!config.multi) throw new Error("multi-model-provider 设置未加载");
				if (enabledTasks.size > 0 && !hasCredential("DOUBAO_APPID", appId)) throw new Error("已选模型需要豆包 App ID");
				if (classicSpeechSelected && !hasCredential("DOUBAO_TOKEN", token)) throw new Error("ASR / TTS 模型需要语音 Access Token");
				if (realtimeSelected && !hasCredential("DOUBAO_REALTIME_API_KEY", realtimeKey)) throw new Error("Realtime Duplex 模型需要 Realtime API Key");
				const writes = [
					["DOUBAO_APPID", appId],
					["DOUBAO_TOKEN", token],
					["DOUBAO_REALTIME_API_KEY", realtimeKey]
				].filter(([, value]) => value.trim());
				for (const [ref, value] of writes) responseValue(await api.credentials.set({
					ref,
					value: value.trim()
				}));
				const ops = taskModels.map(([id]) => ({
					op: "set",
					path: [
						"models",
						id,
						"enabled"
					],
					value: enabledTasks.has(id)
				}));
				if (ops.length) responseValue(await api.settings.mutate({
					ns: MULTI_NS,
					ops,
					expectedRevision: config.multi.revision
				}));
				setAppId("");
				setToken("");
				setRealtimeKey("");
				await reload();
				if (realtimeSelected) {
					const probe = await testRealtime();
					setMessage(`已注册 ${enabledTasks.size} 个豆包语音模型；Realtime 连接测试通过（${probe.latencyMs} ms）。`);
					return;
				}
				setMessage(enabledTasks.size ? `已注册 ${enabledTasks.size} 个豆包语音模型。` : "已停用全部豆包语音模型。");
			});
			const probeRealtime = () => run(async () => {
				if (!hasCredential("DOUBAO_APPID", appId) || !hasCredential("DOUBAO_REALTIME_API_KEY", realtimeKey)) throw new Error("请先保存 App ID 和 Realtime API Key");
				const probe = await testRealtime();
				setMessage(`Realtime 连接测试通过（${probe.latencyMs} ms）。`);
			});
			const normalizedQuery = query.trim().toLocaleLowerCase();
			const filteredTasks = taskModels.filter(([id, raw]) => {
				if (!normalizedQuery) return true;
				const model = object(raw);
				return [
					id,
					model.model,
					model.displayName,
					model.task,
					...model.input ?? [],
					...model.output ?? []
				].filter((value) => typeof value === "string").some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "mmp-capability",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-subtitle",
						children: "豆包语音"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: "独立 Provider ID：doubao-speech。模型来自内置语音能力目录，不使用方舟 /models 接口。"
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-grid3",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SecretField, {
								label: "豆包 App ID",
								name: "doubao-appid",
								status: config.credentials.DOUBAO_APPID,
								value: appId,
								onChange: setAppId
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SecretField, {
								label: "语音 Token",
								name: "doubao-token",
								status: config.credentials.DOUBAO_TOKEN,
								value: token,
								onChange: setToken
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SecretField, {
								label: "Realtime API Key",
								name: "doubao-realtime-key",
								status: config.credentials.DOUBAO_REALTIME_API_KEY,
								value: realtimeKey,
								onChange: setRealtimeKey
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-actions",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "mmp-button",
							onClick: () => setEnabledTasks(/* @__PURE__ */ new Set()),
							disabled: busy || readOnly,
							children: "全部取消"
						})
					}),
					taskModels.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-field",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								htmlFor: "mmp-task-search",
								children: "检索任务模型"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								id: "mmp-task-search",
								className: "mmp-input",
								type: "search",
								value: query,
								onChange: (event) => setQuery(event.target.value),
								placeholder: "按模型、能力或输入输出类型检索"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "mmp-search-summary",
								children: [
									"显示 ",
									filteredTasks.length,
									" / ",
									taskModels.length,
									" 个模型"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-list",
						children: filteredTasks.map(([id, raw]) => {
							const model = object(raw);
							const realtime = model.task === "realtime-speech";
							const credentialReady = hasCredential("DOUBAO_APPID", appId) && (realtime ? hasCredential("DOUBAO_REALTIME_API_KEY", realtimeKey) : hasCredential("DOUBAO_TOKEN", token));
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "mmp-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: enabledTasks.has(id),
									disabled: busy || readOnly,
									onChange: (event) => setEnabledTasks((current) => {
										const next = new Set(current);
										event.target.checked ? next.add(id) : next.delete(id);
										return next;
									})
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: "mmp-row-main",
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: model.displayName ?? model.model }),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
											className: "mmp-id",
											children: id
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: "mmp-tags",
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-tag",
													children: model.task
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
													className: "mmp-tag",
													children: [
														(model.input ?? []).join(" + "),
														" → ",
														(model.output ?? []).join(" + ")
													]
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-tag",
													children: model.execution
												}),
												enabledTasks.has(id) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: "mmp-tag",
													children: credentialReady ? "凭据就绪" : "缺少凭据"
												})
											]
										})
									]
								})]
							}, id);
						})
					}),
					taskModels.length > 0 && filteredTasks.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: "没有匹配的任务模型。"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-actions",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "mmp-button",
							"data-primary": "true",
							onClick: saveProvider,
							disabled: busy || readOnly || !config.settingsWritable,
							children: enabledTasks.size ? `保存并注册（${enabledTasks.size}）` : "保存：全部停用"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "mmp-button",
							onClick: probeRealtime,
							disabled: busy || readOnly || !realtimeSelected,
							children: "测试 Realtime 连接"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: "保存时会自动测试已启用的 Realtime Duplex；只有测试通过才显示注册成功。"
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-error",
						role: "alert",
						children: error
					}),
					message && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-success",
						role: "status",
						children: message
					})
				]
			});
		}
		function DoubaoSpeechProviderRow({ api, readOnly }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [config, reload] = useConfig(api);
			const enabled = Object.values(object(object(config.multi?.value).models)).map(object).filter((model) => model.connection === "doubao-speech").filter((model) => model.enabled !== false);
			const credentialReady = enabled.every((model) => config.credentials.DOUBAO_APPID?.configured === true && (model.task === "realtime-speech" ? config.credentials.DOUBAO_REALTIME_API_KEY?.configured === true : config.credentials.DOUBAO_TOKEN?.configured === true));
			const ready = enabled.length > 0 && credentialReady;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: "mmp-provider-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "mmp-provider-head",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-provider-name",
							children: "豆包语音"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-tag",
							children: "任务模型"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-provider-dot",
							"data-ready": ready,
							role: "img",
							"aria-label": ready ? "豆包语音凭据已配置" : "豆包语音尚未就绪",
							title: ready ? "凭据已配置" : "尚未就绪"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-muted",
							children: enabled.length ? `已启用 ${enabled.length} 个模型` : "尚未启用模型"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "mmp-provider-actions",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "mmp-button",
								onClick: () => setOpen((value) => !value),
								children: open ? "收起" : "编辑"
							})
						})
					]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "mmp-provider-editor",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TaskCapability, {
						api,
						config,
						reload,
						readOnly
					})
				})]
			});
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
		/** Qualitative Markdown plus structured, measured metrics for one LLM row. */
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
				children: "正在加载模型说明…"
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
				if (!config.multi) throw new Error("multi-model-provider 设置未加载");
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
			const save = () => run(() => persist(draft, "模型说明已保存。"));
			const probe = () => run(async () => {
				const started = Date.now();
				const response = await fetch("/dsh-multi-model-provider/probe", {
					method: "POST",
					headers: {
						"content-type": "application/json",
						"x-dsh-model-probe": "1"
					},
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
						`reachable=true`,
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
				await persist(next, reachable ? "实测完成，结果已保存。" : "探测失败，失败结果已保存。");
				if (!reachable) throw new Error(String(result.error ?? `模型不可访问（HTTP ${response.status}）`));
			});
			const lastProbe = object(draft.performance?.lastProbe);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "mmp-provider-extension",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-subtitle",
						children: "模型说明与运行指标"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: "文字信息集中为一份分章节 Markdown；可用性和速度来自实测，不再手填。价格仍按计费单位结构化保存。"
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-field",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "模型说明（Markdown）" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
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
								children: "可用性"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: lastProbe.observedAt ? lastProbe.reachable ? "可访问" : "不可访问" : "尚未实测" })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "mmp-muted",
								children: "首 Token"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: Number.isFinite(lastProbe.timeToFirstTokenMs) ? `${lastProbe.timeToFirstTokenMs} ms` : "—" })] }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "mmp-muted",
								children: "总延迟"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: Number.isFinite(lastProbe.latencyMs) ? `${lastProbe.latencyMs} ms` : "—" })] })
						]
					}),
					lastProbe.observedAt && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-muted",
						children: [
							"观测时间：",
							new Date(lastProbe.observedAt).toLocaleString(),
							" · 单次极小请求，仅代表当时链路状态"
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-subtitle",
						children: "价格"
					}),
					rates.map((rate, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "mmp-price",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "操作" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mmp-input",
									value: rate.operation ?? "",
									disabled: disabled || busy,
									onChange: (event) => setRate(index, "operation", event.target.value),
									placeholder: "input / output"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "计费单位" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "mmp-input",
									value: rate.unit ?? "",
									disabled: disabled || busy,
									onChange: (event) => setRate(index, "unit", event.target.value),
									placeholder: "1M tokens"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "mmp-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "金额" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
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
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", { children: "币种" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
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
								children: "删除"
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
								children: "添加价格项"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "mmp-button",
								"data-primary": "true",
								disabled: disabled || busy || !config.settingsWritable,
								onClick: save,
								children: "保存说明与价格"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "mmp-button",
								disabled: disabled || busy || !config.settingsWritable,
								onClick: probe,
								children: "测试可用性与速度"
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "mmp-muted",
						children: "速度测试会向该模型发送一次最多 8 token 的极小请求，可能产生少量费用。"
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
			ctx.slots.inject("settings.models.provider.rows", () => ctx.slots.register({
				name: "settings.models.provider.rows",
				id: "doubao-speech",
				order: 20,
				inject: () => ({ api: connection.api })
			}, DoubaoSpeechProviderRow));
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