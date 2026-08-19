import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { HarnessError, ReasoningEffortId, createUserMessage } from "@deepseek-ai/dsh-llm";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
import { Service } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/model/guidance.js
/** Stable model-visible capability summary; secrets deliberately stay outside this surface. */
const MODEL_MANAGER_GUIDANCE = `Model registration is available through two deliberately separate paths. Use list_model_routes and configure_model_route for primary language/chat models; llm-pi-ai remains their runtime and source of truth. Use list_task_models and register_task_model for image, speech, audio, video, realtime, embedding, and reranking catalog entries. Use discover_task_models for a generic authenticated task connection catalog. Use select_task_models to replace the enabled task set, and preserve [] as all disabled without fallback.

VOLCENGINE PROVIDER AUTONOMY: Installing this plugin teaches the Agent how the unified provider=volcengine works; the user must not need to know YAML, endpoint URLs, tool names, or registry ownership. Whenever the user asks about 火山、方舟、豆包, available models, configuration, registration, or invocation, immediately call inspect_volcengine_provider. Stable provider facts are built in: Ark uses the official https://ark.cn-beijing.volces.com/api/v3 Responses endpoint and the secure ARK_API_KEY reference; Doubao speech uses secure DOUBAO_APPID and DOUBAO_TOKEN references. Current account availability is not a static fact: inspect_volcengine_provider must query the authenticated /models catalog and report credential state, selected language/VLM models, registered task routes, and callability. Never invent a catalog or ask the user to paste a key into chat. After the user chooses language/VLM candidates, call select_volcengine_language_models with complete profiles; [] explicitly disables every Volcengine LLM route without fallback. Language/VLM models are used through the normal Agent model selector. Image/video/audio/speech/embedding routes belong to the task registry and may be invoked only through invoke_task_model when list_task_models says callable. A Platform deployment may require its exact ep-* endpoint id as the model id. Discovery never changes registration or selection by itself.

MODEL PORTRAIT AUTONOMY: The user only needs to state a short intent such as “整理初始画像”, “建立模型画像”, or “完善这些模型的画像”. Do not ask the user to enumerate fields, define the schema, or name tools. Immediately call prepare_model_portraits. Infer ids from models just registered, discovered, selected, or discussed; when recent context does not narrow them, use the tool's enabled candidates whose portraits are missing, partial, invalid, stale, or unvalidated. A portrait covers identity/provider model id; input and output modalities/formats; context and output limits; capabilities, operations, and execution mode; one sectioned Markdown description for qualitative routing knowledge; effective-dated price, currency, units, tiers, and caveats; normalized routing quality scores; measured speed, latency, throughput, and measurement context; evidence provenance and observation date; validation state; and separate observed usage. Gather current facts from authoritative provider documentation, never guess unknown facts, distinguish provider claims from benchmarks, probes, and usage, call upsert_model_portrait for every target, and immediately call validate_model_portrait with liveProbe=false. A live probe may create provider traffic or cost and therefore requires explicit user approval.

For automatic routing, get_model_portrait supports both task route ids and llm:<provider>/<model> ids. Usage collection is automatic: ordinary LLM turns already persist native request/header, step/start, and assistant/message usage events, while invoke_task_model appends privacy-safe multi-model/invocation events. summarize_model_usage aggregates those current-session events into counts, outcome, latency, tokens, and cost metadata. Never copy prompts, responses, media, or credentials into observations or portraits. Invoke non-language routes only with invoke_task_model after list_task_models reports callable. A task-model registration is metadata only until a compatible runtime adapter is installed, so never describe registered-only routes as callable; disabled routes also cannot be invoked. Use select_default_model only for the primary language model used by newly created Agents. Never ask the user to paste an API key into chat or place a secret in tool arguments or ordinary settings. Registration tools store only credential references; direct the user to the secure Settings credential field when a reference is not configured.`;
//#endregion
//#region lib/types/model/tool-surfaces.js
/**
* Model-visible surfaces of the five model-management tools.
*
* Names, descriptions, and parameter descriptions live here; `../tools.ts` only
* assembles them with their execute bodies. Each description states both when to
* use the tool and when not to, and points at the tool that lists current state,
* so the model can discover reality instead of guessing.
*
* @module dsh-multi-model-provider
*/
/** Shared parameter fragments so one wording change lands in one place. */
const NEVER_A_SECRET = "Never pass a secret; pass a reference name only.";
/** Tool that lists language/chat provider routes. */
const LIST_MODEL_ROUTES_SURFACE = {
	name: "list_model_routes",
	description: "Inspect registered LLM provider routes, safe credential status, and supported models. Use it before configure_model_route or select_default_model to learn which routes and model ids actually exist. Do not use it for image, speech, audio, video, embedding, or reranking routes; those live in list_task_models. Returns live routes by default and never returns credential values.",
	parameters: {
		provider: "Optional exact provider route to inspect.",
		includeDormant: "Include configurable catalog routes that are not active.",
		includeModels: "Include model catalogs for live routes; defaults to true."
	},
	helpPointer: "list_model_routes"
};
/** Tool that creates or updates a language/chat provider route. */
const CONFIGURE_MODEL_ROUTE_SURFACE = {
	name: "configure_model_route",
	description: "Create or update one llm-pi-ai provider profile without deleting fields that were not supplied. Use it when a language/chat route is missing, its endpoint changed, or its credential reference must be set; run list_model_routes first to see the current state. Do not use it to register non-language routes, and do not use it to change the model of an existing session. It accepts only a credential reference such as OPENAI_API_KEY and never an API key value. For the built-in openai route, normally provide only provider=openai and apiKeyEnv=OPENAI_API_KEY; omit endpoint and models to inherit the pi-ai catalog.",
	parameters: {
		provider: "Unique route id, for example openai or team-openai.",
		apiKeyEnv: `Credential reference in POSIX environment-variable form. ${NEVER_A_SECRET}`,
		displayName: "Human-readable provider name.",
		api: "Wire protocol. Omit on a built-in catalog route.",
		baseURL: "Absolute provider endpoint. Omit on a built-in catalog route.",
		models: "Complete served catalog for a declared route. On a built-in route, a non-empty list replaces its catalog.",
		defaultContextWindow: "Fallback context capacity for unsized declared models.",
		defaultMaxTokens: "Fallback output capacity for unsized declared models."
	},
	helpPointer: "list_model_routes"
};
const INSPECT_VOLCENGINE_PROVIDER_SURFACE = {
	name: "inspect_volcengine_provider",
	description: "Inspect the unified Volcengine provider configuration, safe credential status, the authenticated Ark model catalog, selected language/VLM models, registered task routes, and the correct invocation path for each class. Use it immediately whenever the user asks which 火山/方舟/豆包 models are available, how to configure them, or how to call them; installation is expected to make this workflow discoverable without YAML knowledge. Do not use it to expose credential values, assume catalog entries are all language models, or claim registered-only task routes are callable.",
	parameters: {},
	helpPointer: "inspect_volcengine_provider"
};
const SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE = {
	name: "select_volcengine_language_models",
	description: "Replace the selected Ark language/VLM model catalog and configure the llm-pi-ai provider=volcengine route with the official Responses endpoint. Use it after inspect_volcengine_provider and authoritative model metadata review; pass an empty models array to disable every Volcengine LLM without fallback. Do not use it for image/video generation, speech, audio, embedding, or other task routes, and verify the result with inspect_volcengine_provider.",
	parameters: { models: "Complete selected language/VLM model profiles from Ark discovery. Pass [] to remove the Volcengine LLM route and select nothing." },
	helpPointer: "inspect_volcengine_provider"
};
/** Tool that lists non-language task-model routes. */
const LIST_TASK_MODELS_SURFACE = {
	name: "list_task_models",
	description: "Inspect registered non-language task models such as image, speech, audio, video, embedding, and reranking routes. Use it before register_task_model, and use it to check declared cross-provider capabilities and whether a route is merely registered or actually callable. Do not use it for language/chat models; those live in list_model_routes. Registration and runtime callability are reported separately, and no credential values are returned.",
	parameters: {
		id: "Optional exact registry id, for example openai/gpt-image-2.",
		provider: "Optional provider-family filter.",
		task: "Optional semantic-task filter.",
		includeProfile: "Include provider-specific non-secret model profile metadata."
	},
	helpPointer: "list_task_models"
};
const DISCOVER_TASK_MODELS_SURFACE = {
	name: "discover_task_models",
	description: "Query one provider connection's authenticated model catalog and show which upstream ids are already registered and enabled. Use it before registering provider models or refreshing an available-model selector. Do not use it as proof that every catalog item is callable, and do not assume discovery changes registration or selection; inspect the result with list_task_models.",
	parameters: { connection: "Exact reusable connection id, for example volcengine." },
	helpPointer: "list_task_models"
};
const SELECT_TASK_MODELS_SURFACE = {
	name: "select_task_models",
	description: "Replace the enabled task-model set for one connection. Use it when the user changes which registered multimodal models are available; an empty ids array intentionally disables all models and never falls back to selecting everything. Do not use it to register new upstream ids or select the primary language model; verify the result with list_task_models.",
	parameters: {
		connection: "Exact reusable connection id whose registered routes will be updated.",
		ids: "Complete set of registered route ids to enable. Pass [] to disable every route on the connection."
	},
	helpPointer: "list_task_models"
};
/** Tool that creates or updates a non-language task-model registration. */
const REGISTER_TASK_MODEL_SURFACE = {
	name: "register_task_model",
	description: "Create or update a non-language task-model registration and its reusable connection profile. Use it for image, speech, audio, video, embedding, reranking, and realtime routes, including providers such as Doubao that require multiple named credential references; run list_task_models first to see what is already registered. Do not use it for language/chat models, which must go through configure_model_route so llm-pi-ai stays authoritative, and never describe a route registered this way as callable until a compatible runtime adapter is installed. It stores catalog metadata and credential references only and never accepts an API key value or another secret value.",
	parameters: {
		id: "Stable route id, for example openai/gpt-image-2.",
		connection: "Reusable connection id, for example openai.",
		provider: "Provider family; required when creating a new connection.",
		connectionDisplayName: "Human-readable connection name.",
		credentialRef: `Legacy single credential reference such as OPENAI_API_KEY. ${NEVER_A_SECRET}`,
		credentialRefs: `Named credential references for multi-credential providers, for example appId=DOUBAO_APPID and token=DOUBAO_TOKEN. Values are reference names, not secrets. ${NEVER_A_SECRET}`,
		baseURL: "Optional absolute API base URL.",
		catalogEndpoint: "Optional absolute model-catalog URL; when omitted discovery uses baseURL/models.",
		catalogCredentialName: "Credential slot used for catalog discovery, for example arkApiKey or default.",
		connectionProfile: "Optional provider-level non-secret metadata such as region, defaultVoice, or catalog-discovery mode.",
		model: "Exact provider model id.",
		displayName: "Human-readable model name.",
		task: "Semantic task served by the model.",
		runtimeAdapter: "Adapter contract expected to execute this route.",
		enabled: "Whether routing and direct invocation may use this route; defaults to true.",
		credentialNames: "Connection credential slots required by this route, allowing one provider to expose products with different authentication.",
		input: "Accepted modalities; sensible task defaults are used when omitted.",
		output: "Produced modalities or data shapes; sensible task defaults are used when omitted.",
		execution: "Invocation lifecycle.",
		capabilities: "Stable cross-provider capability ids such as speech.transcribe.file, speech.synthesize.short, or speech.realtime_session.",
		operations: "Supported operations, for example generate, edit, transcribe, or synthesize.",
		roles: "Routing roles such as image-generator or speech-to-text.",
		profile: "Optional provider-specific non-secret capability metadata.",
		portrait: "Optional initial router-facing portrait; use upsert_model_portrait for evidence-backed price, speed, and strengths."
	},
	helpPointer: "list_task_models"
};
const PREPARE_MODEL_PORTRAITS_SURFACE = {
	name: "prepare_model_portraits",
	description: "Start the complete autonomous initial-portrait workflow for registered LLM and task models. Use it immediately when the user says “整理初始画像”, “建立模型画像”, or equivalent—even if they do not list fields or tool steps—and infer model ids from the immediately preceding registration or discovery context. It returns the plugin-defined ontology, candidates needing work, and the required gather/upsert/validate sequence. Do not use it to invent undocumented facts, perform paid probes without approval, or ask the user to restate the portrait schema.",
	parameters: {
		ids: "Optional exact task route ids or LLM ids in llm:<provider>/<model> form. Infer these from recent context when possible; omit to find enabled models with missing or non-valid portraits.",
		includeDisabled: "Include disabled task routes when ids are omitted; defaults to false."
	},
	helpPointer: "prepare_model_portraits"
};
const GET_MODEL_PORTRAIT_SURFACE = {
	name: "get_model_portrait",
	description: "Inspect one router-facing portrait for either an LLM or task model together with registered capabilities, input/output types, validation state, and optional current-session observations. Use it before choosing or comparing a model. Do not use it to invoke a model or edit its portrait.",
	parameters: {
		id: "Exact task-model route id, or llm:<provider>/<model> for a language model.",
		includeEvidence: "Include evidence records; defaults to true.",
		includeUsage: "Include invocation observations aggregated from the current session."
	},
	helpPointer: "get_model_portrait"
};
const UPSERT_MODEL_PORTRAIT_SURFACE = {
	name: "upsert_model_portrait",
	description: "Create or replace the evidence-backed portrait for a registered LLM or task model. Use it after the Harness Agent has gathered authoritative documentation or benchmark evidence for price, strengths, limitations, speed, modalities, and routing quality scores; then immediately call validate_model_portrait and inspect the result with get_model_portrait. Do not use it for secrets, raw request content, guessed facts, or unregistered models.",
	parameters: {
		id: "Exact task-model route id, or llm:<provider>/<model> for a language model.",
		portrait: "Complete non-secret portrait facts. Price and performance claims should reference evidence ids; quality scores are normalized from 0 to 1."
	},
	helpPointer: "get_model_portrait"
};
const VALIDATE_MODEL_PORTRAIT_SURFACE = {
	name: "validate_model_portrait",
	description: "Validate a saved portrait against registration, credential status, adapter availability, evidence links, and optionally a live adapter probe. Use it after upsert_model_portrait or when get_model_portrait shows a portrait may be stale. Do not use it to create claims or to treat a missing adapter as proof that the provider model is invalid.",
	parameters: {
		id: "Exact task-model route id, or llm:<provider>/<model> for a language model.",
		liveProbe: "Ask the installed runtime adapter to perform a provider-safe live probe; may incur provider traffic or cost."
	},
	helpPointer: "get_model_portrait"
};
const INVOKE_TASK_MODEL_SURFACE = {
	name: "invoke_task_model",
	description: "Invoke a registered multimodal task model through its installed runtime adapter and record privacy-safe timing, outcome, modality, and cost metrics. Use it for image, speech, audio, video, realtime, embedding, or reranking operations after list_task_models reports the route callable. Do not use it for primary language/chat turns, unregistered operations, credential values, or inline binary data.",
	parameters: {
		id: "Exact registered task-model route id.",
		operation: "One operation declared by the route, for example synthesize or transcribe-file.",
		request: "Adapter-neutral non-secret request metadata. Refer to URLs, attachment ids, or file handles instead of embedding binary data."
	},
	helpPointer: "list_task_models"
};
const SUMMARIZE_MODEL_USAGE_SURFACE = {
	name: "summarize_model_usage",
	description: "Aggregate native Harness LLM calls and task-model calls in the current durable session into counts, success rate, latency percentiles, token usage, and estimated cost. Use it as measured evidence when reviewing a model portrait; collection is automatic during normal calls. Do not use it as a cross-session analytics database or as proof of quality without representative samples.",
	parameters: { id: "Optional exact task route id or llm:<provider>/<model>; omit to summarize every observed model call in the current session." },
	helpPointer: "summarize_model_usage"
};
/** Tool that saves the default language model for newly created Agents. */
const SELECT_DEFAULT_MODEL_SURFACE = {
	name: "select_default_model",
	description: "Validate and save the primary provider/model used when future Agents are created. Use it when the user wants a different default going forward; run list_model_routes first to confirm the route is live and the model id is exact. Do not use it to switch the current session, which needs the session model selector, and do not use it for non-language task models.",
	parameters: {
		provider: "Live provider route.",
		model: "Exact model id on that route.",
		reasoningEffort: "Optional effort id advertised by the selected model."
	},
	helpPointer: "list_model_routes"
};
/** Every model-visible tool surface, in registration order. */
const MODEL_MANAGER_TOOL_SURFACES = [
	LIST_MODEL_ROUTES_SURFACE,
	CONFIGURE_MODEL_ROUTE_SURFACE,
	INSPECT_VOLCENGINE_PROVIDER_SURFACE,
	SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE,
	LIST_TASK_MODELS_SURFACE,
	DISCOVER_TASK_MODELS_SURFACE,
	SELECT_TASK_MODELS_SURFACE,
	REGISTER_TASK_MODEL_SURFACE,
	PREPARE_MODEL_PORTRAITS_SURFACE,
	GET_MODEL_PORTRAIT_SURFACE,
	UPSERT_MODEL_PORTRAIT_SURFACE,
	VALIDATE_MODEL_PORTRAIT_SURFACE,
	INVOKE_TASK_MODEL_SURFACE,
	SUMMARIZE_MODEL_USAGE_SURFACE,
	SELECT_DEFAULT_MODEL_SURFACE
];
//#endregion
//#region lib/types/model/help.js
/**
* Version and command surface for the model-management tool set.
*
* This plugin has no CLI; its "commands" are the five tools the model can call.
* Stating them in one place lets a deployment answer "what can this plugin do?"
* without reading the registration code, and pins the version so the model-facing
* surface cannot drift from a release.
*
* @module dsh-multi-model-provider
*/
/** Package version; asserted equal to package.json by the contract tests. */
const VERSION = "0.1.0-rc.9";
/** Every model-callable tool name, in registration order. */
const TOOL_NAMES = MODEL_MANAGER_TOOL_SURFACES.map((surface) => surface.name);
/** Discoverable summary of the tool set and the two registration paths. */
const HELP = `multi-model-provider ${VERSION}

Two deliberately separate registration paths. Language/chat models stay owned by
llm-pi-ai; non-language task models live in this plugin's own catalog.

language / chat models:
  list_model_routes        inspect routes, credential status, and model catalogs
  configure_model_route    create or update one llm-pi-ai provider profile
  inspect_volcengine_provider inspect Ark/Doubao credentials, live catalog, selections, and usage paths
  select_volcengine_language_models replace Ark language/VLM selection; [] disables all
  select_default_model     save the default model for newly created Agents

non-language task models (image, speech, audio, video, realtime, embedding, reranking):
  list_task_models         inspect registrations and whether they are callable
  discover_task_models     query an authenticated provider model catalog
  select_task_models       replace the enabled set; [] disables all
  register_task_model      create or update a registration and its connection
  prepare_model_portraits  expand one short intent into the complete portrait workflow
  get_model_portrait       inspect price, strengths, speed, I/O, and evidence
  upsert_model_portrait    save an evidence-backed router-facing portrait
  validate_model_portrait  check registration, evidence, credentials, and adapter
  invoke_task_model        execute one registered operation through its adapter
  summarize_model_usage    aggregate current-session invocation observations

credentials:
  Registration tools accept only reference names such as OPENAI_API_KEY. A
  multi-credential provider may use named refs such as DOUBAO_APPID and
  DOUBAO_TOKEN. They never accept an API key value. When a reference is not configured, direct
  the user to the secure Settings credential field; never ask for a key in chat.

registration is not callability:
  A task-model registration is catalog metadata until a compatible runtime
  adapter is installed. list_task_models reports the two states separately.
  Disabled registrations remain inspectable but cannot be routed or invoked.

provider discovery and selection:
  Volcengine is one provider connection spanning Ark and Doubao products while
  each product keeps its own credential slots. Discovery is advisory and never
  auto-registers or auto-enables returned models. An empty enabled selection is
  preserved as all disabled; it never falls back to all models.

portrait workflow:
  “整理初始画像” is sufficient: the Agent calls prepare_model_portraits, gathers
  authoritative facts, saves each portrait, and validates it automatically.
  Native LLM and task invocation events record metrics but never content or credentials.
`;
//#endregion
//#region lib/types/operations.js
const PI_AI_SETTINGS_NAMESPACE = settingsNamespace("llm-pi-ai");
var ModelManagerError = class extends HarnessError {
	constructor(message, code, options) {
		super(message, code, options);
	}
};
function nonBlank$1(value, name) {
	const normalized = value.trim();
	if (normalized === "") throw new ModelManagerError(`${name} must not be blank`, "INVALID_MODEL_CONFIGURATION");
	return normalized;
}
function positiveInteger(value, name) {
	if (value === void 0) return void 0;
	if (!Number.isSafeInteger(value) || value <= 0) throw new ModelManagerError(`${name} must be a positive safe integer`, "INVALID_MODEL_CONFIGURATION");
	return value;
}
function optionalText$2(value) {
	if (value === void 0) return void 0;
	const normalized = value.trim();
	return normalized === "" ? void 0 : normalized;
}
function settingsDescriptor(ctx, ns) {
	return ctx.settings.describe({ redactSecrets: true }).find((descriptor) => descriptor.ns === ns);
}
function requiredPiAiDescriptor(ctx) {
	const descriptor = settingsDescriptor(ctx, PI_AI_SETTINGS_NAMESPACE);
	if (descriptor === void 0) throw new ModelManagerError("llm-pi-ai settings are unavailable; load @deepseek-ai/dsh-llm-pi-ai before multi-model-provider", "MODEL_SETTINGS_UNAVAILABLE");
	return descriptor;
}
function nestedValue(root, path) {
	let value = root;
	for (const key of path) {
		if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
		value = value[key];
	}
	return value;
}
async function credentialStatus$1(ctx, ref) {
	const info = await ctx.credentials.describe(credentialRef(ref));
	return {
		ref,
		configured: info.configured,
		writable: info.writable,
		...info.source === void 0 ? {} : { source: info.source }
	};
}
function modelProfile(input, index) {
	const id = nonBlank$1(input.id, `models[${index}].id`);
	const name = optionalText$2(input.name);
	const contextWindow = positiveInteger(input.contextWindow, `models[${index}].contextWindow`);
	const maxTokens = positiveInteger(input.maxTokens, `models[${index}].maxTokens`);
	return {
		id,
		...name === void 0 ? {} : { name },
		...contextWindow === void 0 ? {} : { contextWindow },
		...maxTokens === void 0 ? {} : { maxTokens },
		...input.input === void 0 || input.input.length === 0 ? {} : { input: [...input.input] }
	};
}
function providerProfile(input) {
	const apiKeyEnv = optionalText$2(input.apiKeyEnv);
	const displayName = optionalText$2(input.displayName);
	const baseURL = optionalText$2(input.baseURL);
	if (baseURL !== void 0) {
		let parsed;
		try {
			parsed = new URL(baseURL);
		} catch (cause) {
			throw new ModelManagerError("baseURL must be an absolute URL", "INVALID_MODEL_CONFIGURATION", { cause });
		}
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new ModelManagerError("baseURL must use http or https", "INVALID_MODEL_CONFIGURATION");
	}
	const models = input.models?.map(modelProfile);
	return {
		...apiKeyEnv === void 0 ? {} : { apiKeyEnv },
		...displayName === void 0 ? {} : { displayName },
		...input.api === void 0 ? {} : { api: input.api },
		...baseURL === void 0 ? {} : { baseURL },
		...models === void 0 || models.length === 0 ? {} : { models },
		...positiveInteger(input.defaultContextWindow, "defaultContextWindow") === void 0 ? {} : { defaultContextWindow: input.defaultContextWindow },
		...positiveInteger(input.defaultMaxTokens, "defaultMaxTokens") === void 0 ? {} : { defaultMaxTokens: input.defaultMaxTokens }
	};
}
async function configureModelRoute(ctx, input) {
	const provider = nonBlank$1(input.provider, "provider");
	const descriptor = requiredPiAiDescriptor(ctx);
	const profile = providerProfile(input);
	const fields = Object.entries(profile);
	const ops = fields.length === 0 ? [{
		op: "set",
		path: ["providers", provider],
		value: {}
	}] : fields.map(([field, value]) => ({
		op: "set",
		path: [
			"providers",
			provider,
			field
		],
		value
	}));
	await ctx.settings.mutate(PI_AI_SETTINGS_NAMESPACE, ops, descriptor.revision);
	const ref = typeof profile.apiKeyEnv === "string" ? profile.apiKeyEnv : void 0;
	const credential = ref === void 0 ? void 0 : await credentialStatus$1(ctx, ref);
	const live = ctx.llm.listProviders().some((entry) => entry.id === provider);
	return {
		provider,
		saved: true,
		live,
		settingsNs: PI_AI_SETTINGS_NAMESPACE,
		settingsPath: ["providers", provider],
		...credential === void 0 ? {} : { credential },
		requiresCredential: credential?.configured === false,
		next: credential?.configured === false ? `Store ${credential.ref} in the secure Models settings field; do not paste the key into chat.` : live ? "The provider route is ready for model selection." : "The settings change was accepted; re-list routes to observe adapter activation."
	};
}
async function listModelRoutes(ctx, input = {}) {
	const requestedProvider = optionalText$2(input.provider);
	const liveEntries = ctx.llm.listProviders();
	const liveById = new Map(liveEntries.map((entry) => [entry.id, entry]));
	const directory = ctx.llm.listConfigurableProviders();
	const directoryById = new Map(directory.map((entry) => [entry.provider, entry]));
	const ids = requestedProvider === void 0 ? input.includeDormant === true ? [.../* @__PURE__ */ new Set([...liveById.keys(), ...directoryById.keys()])] : [...liveById.keys()] : [requestedProvider];
	if (requestedProvider !== void 0 && !liveById.has(requestedProvider) && !directoryById.has(requestedProvider)) throw new ModelManagerError(`unknown provider route '${requestedProvider}'`, "UNKNOWN_MODEL_PROVIDER");
	const descriptors = new Map(ctx.settings.describe({ redactSecrets: true }).map((item) => [item.ns, item]));
	const providers = [];
	for (const id of ids) {
		const live = liveById.get(id);
		const configurable = directoryById.get(id);
		const profile = configurable === void 0 ? void 0 : nestedValue(descriptors.get(configurable.settingsNs)?.value, configurable.settingsPath);
		const ref = typeof profile === "object" && profile !== null && !Array.isArray(profile) && typeof profile.apiKeyEnv === "string" ? profile.apiKeyEnv : void 0;
		let models;
		let modelError;
		if (live !== void 0 && input.includeModels !== false) try {
			models = await ctx.llm.listModels(id);
		} catch (cause) {
			modelError = cause instanceof Error ? cause.message : String(cause);
		}
		providers.push({
			provider: id,
			displayName: live?.name ?? configurable?.displayName ?? id,
			status: live === void 0 ? "dormant" : "live",
			...configurable?.declared === void 0 ? {} : { declared: configurable.declared },
			...configurable === void 0 ? {} : {
				settingsNs: configurable.settingsNs,
				settingsPath: [...configurable.settingsPath]
			},
			...ref === void 0 ? {} : { credential: await credentialStatus$1(ctx, ref) },
			...models === void 0 ? {} : { models },
			...modelError === void 0 ? {} : { modelError }
		});
	}
	return {
		providers,
		liveCount: liveEntries.length,
		dormantCount: directory.filter((entry) => !liveById.has(entry.provider)).length
	};
}
async function selectDefaultModel(ctx, input, signal) {
	const provider = nonBlank$1(input.provider, "provider");
	const model = nonBlank$1(input.model, "model");
	const reasoningEffort = optionalText$2(input.reasoningEffort);
	const info = await ctx.llm.resolveModelInfo(provider, model, signal);
	if (reasoningEffort !== void 0) {
		if (!(info.reasoning?.efforts.some((effort) => effort.id === reasoningEffort) === true)) throw new ModelManagerError(`model '${provider}/${model}' does not advertise reasoning effort '${reasoningEffort}'`, "UNSUPPORTED_REASONING_EFFORT");
	}
	const selection = {
		provider,
		model,
		...reasoningEffort === void 0 ? {} : { reasoningEffort: ReasoningEffortId(reasoningEffort) }
	};
	await ctx.agentDefaultModel.saveSelection(selection);
	return {
		selection,
		model: {
			name: info.name,
			...info.description === void 0 ? {} : { description: info.description },
			...info.inputModalities === void 0 ? {} : { inputModalities: [...info.inputModalities] },
			...info.context === void 0 ? {} : { contextWindow: info.context.contextWindow }
		},
		appliesTo: "new-agents",
		currentSessionChanged: false
	};
}
//#endregion
//#region lib/types/portrait-core.js
const EVIDENCE_KINDS = /* @__PURE__ */ new Set([
	"provider-doc",
	"benchmark",
	"runtime-probe",
	"usage",
	"manual"
]);
const SPEED_CLASSES = /* @__PURE__ */ new Set([
	"instant",
	"fast",
	"balanced",
	"slow",
	"async"
]);
function optionalText$1(value, name) {
	if (value === void 0) return void 0;
	const normalized = value.trim();
	if (normalized === "") throw new ModelManagerError(`${name} must not be blank`, "INVALID_MODEL_PORTRAIT");
	return normalized;
}
function stringList$1(values, name) {
	if (values === void 0) return [];
	return [...new Set(values.map((value, index) => {
		const normalized = value.trim();
		if (normalized === "") throw new ModelManagerError(`${name}[${index}] must not be blank`, "INVALID_MODEL_PORTRAIT");
		return normalized;
	}))];
}
function finiteNonNegative(value, name) {
	if (!Number.isFinite(value) || value < 0) throw new ModelManagerError(`${name} must be a finite non-negative number`, "INVALID_MODEL_PORTRAIT");
	return value;
}
function normalizeRate(rate, index) {
	const tier = optionalText$1(rate.tier, `pricing.rates[${index}].tier`);
	const effectiveFrom = optionalText$1(rate.effectiveFrom, `pricing.rates[${index}].effectiveFrom`);
	const effectiveTo = optionalText$1(rate.effectiveTo, `pricing.rates[${index}].effectiveTo`);
	const evidenceId = optionalText$1(rate.evidenceId, `pricing.rates[${index}].evidenceId`);
	return {
		operation: optionalText$1(rate.operation, `pricing.rates[${index}].operation`),
		unit: optionalText$1(rate.unit, `pricing.rates[${index}].unit`),
		amount: finiteNonNegative(rate.amount, `pricing.rates[${index}].amount`),
		currency: optionalText$1(rate.currency, `pricing.rates[${index}].currency`).toUpperCase(),
		...tier === void 0 ? {} : { tier },
		...effectiveFrom === void 0 ? {} : { effectiveFrom },
		...effectiveTo === void 0 ? {} : { effectiveTo },
		...evidenceId === void 0 ? {} : { evidenceId }
	};
}
function normalizeEvidence(item, index) {
	if (!EVIDENCE_KINDS.has(item.kind)) throw new ModelManagerError(`evidence[${index}].kind is unsupported`, "INVALID_MODEL_PORTRAIT");
	const observedAt = optionalText$1(item.observedAt, `evidence[${index}].observedAt`);
	if (Number.isNaN(Date.parse(observedAt))) throw new ModelManagerError(`evidence[${index}].observedAt must be an ISO date/time`, "INVALID_MODEL_PORTRAIT");
	return {
		id: optionalText$1(item.id, `evidence[${index}].id`),
		kind: item.kind,
		source: optionalText$1(item.source, `evidence[${index}].source`),
		observedAt,
		claims: stringList$1(item.claims, `evidence[${index}].claims`),
		...optionalText$1(item.notes, `evidence[${index}].notes`) === void 0 ? {} : { notes: item.notes.trim() }
	};
}
function portraitChecks(portrait) {
	const checks = [];
	const evidenceIds = new Set(portrait.evidence.map((item) => item.id));
	const hasDescription = portrait.description !== void 0 || portrait.summary !== void 0;
	checks.push({
		id: "portrait.description",
		status: hasDescription ? "pass" : "warn",
		message: hasDescription ? "Markdown description is present" : "Markdown description is missing"
	});
	checks.push({
		id: "portrait.pricing",
		status: portrait.pricing.rates.length === 0 ? "warn" : "pass",
		message: portrait.pricing.rates.length === 0 ? "pricing is unknown" : "pricing rates are present"
	});
	checks.push({
		id: "portrait.performance.speed",
		status: portrait.performance.speedClass === void 0 ? "warn" : "pass",
		message: portrait.performance.speedClass === void 0 ? "speed class is unknown" : "speed class is present"
	});
	for (const [index, rate] of portrait.pricing.rates.entries()) {
		const supported = rate.evidenceId !== void 0 && evidenceIds.has(rate.evidenceId);
		checks.push({
			id: `portrait.pricing.${index}`,
			status: supported ? "pass" : "warn",
			message: supported ? `price rate '${rate.operation}' has evidence` : `price rate '${rate.operation}' has no matching evidence`
		});
	}
	if (portrait.performance.typicalLatencyMs !== void 0) checks.push({
		id: "portrait.performance.latency-evidence",
		status: portrait.evidence.some((item) => item.kind === "benchmark" || item.kind === "runtime-probe" || item.kind === "usage") ? "pass" : "warn",
		message: portrait.evidence.some((item) => item.kind === "benchmark" || item.kind === "runtime-probe" || item.kind === "usage") ? "latency has measurable evidence" : "latency estimate has no benchmark, probe, or usage evidence"
	});
	return checks;
}
function normalizePortrait(input) {
	const evidence = (input.evidence ?? []).map(normalizeEvidence);
	if (new Set(evidence.map((item) => item.id)).size !== evidence.length) throw new ModelManagerError("portrait evidence ids must be unique", "INVALID_MODEL_PORTRAIT");
	const speedClass = input.performance?.speedClass;
	if (speedClass !== void 0 && !SPEED_CLASSES.has(speedClass)) throw new ModelManagerError(`unsupported speedClass '${speedClass}'`, "INVALID_MODEL_PORTRAIT");
	const latency = input.performance?.typicalLatencyMs;
	if (latency !== void 0) {
		finiteNonNegative(latency.min, "performance.typicalLatencyMs.min");
		finiteNonNegative(latency.max, "performance.typicalLatencyMs.max");
		if (latency.min > latency.max) throw new ModelManagerError("typical latency min must not exceed max", "INVALID_MODEL_PORTRAIT");
	}
	const lastProbe = input.performance?.lastProbe;
	if (lastProbe !== void 0) {
		if (Number.isNaN(Date.parse(lastProbe.observedAt))) throw new ModelManagerError("performance.lastProbe.observedAt must be an ISO date/time", "INVALID_MODEL_PORTRAIT");
		finiteNonNegative(lastProbe.latencyMs, "performance.lastProbe.latencyMs");
		if (lastProbe.timeToFirstTokenMs !== void 0) finiteNonNegative(lastProbe.timeToFirstTokenMs, "performance.lastProbe.timeToFirstTokenMs");
	}
	const qualityScores = Object.fromEntries(Object.entries(input.qualityScores ?? {}).map(([key, value]) => {
		const normalized = optionalText$1(key, "qualityScores key");
		if (!Number.isFinite(value) || value < 0 || value > 1) throw new ModelManagerError(`qualityScores.${normalized} must be between 0 and 1`, "INVALID_MODEL_PORTRAIT");
		return [normalized, value];
	}));
	const draft = {
		schemaVersion: 1,
		...optionalText$1(input.description, "description") === void 0 ? {} : { description: input.description.trim() },
		...optionalText$1(input.summary, "summary") === void 0 ? {} : { summary: input.summary.trim() },
		specialties: stringList$1(input.specialties, "specialties"),
		limitations: stringList$1(input.limitations, "limitations"),
		bestFor: stringList$1(input.bestFor, "bestFor"),
		avoidFor: stringList$1(input.avoidFor, "avoidFor"),
		pricing: {
			rates: (input.pricing?.rates ?? []).map(normalizeRate),
			...optionalText$1(input.pricing?.notes, "pricing.notes") === void 0 ? {} : { notes: input.pricing.notes.trim() }
		},
		performance: {
			...speedClass === void 0 ? {} : { speedClass },
			...latency === void 0 ? {} : { typicalLatencyMs: {
				min: latency.min,
				max: latency.max
			} },
			...input.performance?.throughputPerMinute === void 0 ? {} : { throughputPerMinute: finiteNonNegative(input.performance.throughputPerMinute, "performance.throughputPerMinute") },
			...optionalText$1(input.performance?.notes, "performance.notes") === void 0 ? {} : { notes: input.performance.notes.trim() },
			...lastProbe === void 0 ? {} : { lastProbe: {
				observedAt: lastProbe.observedAt,
				reachable: lastProbe.reachable,
				latencyMs: lastProbe.latencyMs,
				...lastProbe.timeToFirstTokenMs === void 0 ? {} : { timeToFirstTokenMs: lastProbe.timeToFirstTokenMs }
			} }
		},
		qualityScores,
		evidence,
		validation: {
			state: "unvalidated",
			checks: []
		}
	};
	const checks = portraitChecks(draft);
	return {
		...draft,
		validation: {
			state: checks.some((check) => check.status === "fail") ? "invalid" : checks.some((check) => check.status === "warn") ? "partial" : "valid",
			checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
			checks
		}
	};
}
function initialPortrait(summary) {
	return {
		schemaVersion: 1,
		...summary === void 0 ? {} : { summary },
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
//#endregion
//#region lib/types/types.js
const TASK_MODEL_TASKS = [
	"image-understanding",
	"image-generation",
	"speech-synthesis",
	"transcription",
	"speech-translation",
	"speech-analysis",
	"voice-conversion",
	"podcast-generation",
	"realtime-speech",
	"voice-cloning",
	"voice-design",
	"audio-generation",
	"video-generation",
	"embedding",
	"reranking"
];
const MODEL_MODALITIES = [
	"text",
	"image",
	"audio",
	"video",
	"file",
	"vector",
	"data"
];
const MODEL_EXECUTION_MODES = [
	"request-response",
	"streaming",
	"async-job",
	"realtime"
];
/** Stable cross-provider capability ids shared with Lore's model registry. */
const TASK_MODEL_CAPABILITIES = [
	"text.generate",
	"image.understand",
	"image.generate",
	"speech.transcribe.stream",
	"speech.transcribe.file",
	"speech.synthesize.short",
	"speech.synthesize.long",
	"speech.translate.stream",
	"speech.analyze",
	"speech.convert_voice",
	"speech.create_podcast",
	"speech.realtime_session",
	"voice.clone",
	"voice.design",
	"voice.preview",
	"voice.activate",
	"audio.generate",
	"video.generate"
];
//#endregion
//#region lib/types/registry.js
const TASK_MODEL_SETTINGS_NAMESPACE = settingsNamespace("multi-model-provider");
const modalitySchema = z.union(MODEL_MODALITIES);
const taskSchema = z.union(TASK_MODEL_TASKS);
const executionSchema = z.union(MODEL_EXECUTION_MODES);
const capabilitySchema = z.union(TASK_MODEL_CAPABILITIES);
const connectionSchema = z.object({
	provider: z.string().required().description("Provider family, for example openai."),
	displayName: z.string().description("Human-readable connection name."),
	credentialRef: z.string().role("credential-ref").description("Secure credential reference; never the credential value."),
	credentialRefs: z.dict(z.string().role("credential-ref")).description("Named secure credential references for multi-credential providers."),
	baseURL: z.string().description("Optional absolute API base URL."),
	catalogEndpoint: z.string().description("Optional provider model-catalog endpoint; defaults to baseURL/models."),
	catalogCredentialName: z.string().description("Credential slot used for catalog discovery."),
	profile: z.dict(z.any()).default({}).description("Non-secret provider-specific connection metadata.")
}).description("Reusable provider connection and authentication reference.");
const taskModelSchema = z.object({
	enabled: z.boolean().default(true).description("Whether routing and direct invocation may use this registered route."),
	connection: z.string().required().description("Key in the connections dictionary."),
	model: z.string().required().description("Exact model id accepted by the provider."),
	displayName: z.string().description("Human-readable model name."),
	task: taskSchema.required().description("Semantic task; language models remain in llm-pi-ai."),
	runtimeAdapter: z.string().description("Adapter contract required to execute this route."),
	credentialNames: z.array(z.string()).description("Named connection credential slots required by this route."),
	input: z.array(modalitySchema).default([]).description("Accepted input modalities."),
	output: z.array(modalitySchema).default([]).description("Produced output modalities or data shapes."),
	execution: executionSchema.default("request-response").description("Invocation lifecycle."),
	capabilities: z.array(capabilitySchema).default([]).description("Stable cross-provider capability ids."),
	operations: z.array(z.string()).default([]).description("Provider operations such as generate, edit, or transcribe."),
	roles: z.array(z.string()).default([]).description("Routing roles this model may fill."),
	profile: z.dict(z.any()).default({}).description("Non-secret provider-specific capability metadata."),
	portrait: z.dict(z.any()).description("Router-facing model portrait: pricing, strengths, speed, evidence, and validation.")
}).description("A registered task-model route. Registration does not make it callable by itself.");
const externalPortraitSchema = z.object({
	kind: z.union(["llm"]).required().description("Runtime registry owning this portrait target."),
	provider: z.string().required().description("Exact LLM provider route."),
	model: z.string().required().description("Exact provider model id."),
	portrait: z.dict(z.any()).required().description("Evidence-backed router-facing model portrait.")
}).description("Portrait binding for a model whose runtime registration is owned by llm-pi-ai.");
const TASK_MODEL_REGISTRY_SCHEMA = z.object({
	connections: z.dict(connectionSchema).default({}).description("Reusable endpoint and credential-reference profiles."),
	models: z.dict(taskModelSchema).default({}).description("Image, audio, video, embedding, and reranking model routes."),
	defaults: z.dict(z.string(), taskSchema).default({}).description("Optional default route id for each task."),
	portraits: z.dict(externalPortraitSchema).default({}).description("Portraits for LLM routes, keyed as llm:<provider>/<model>.")
});
const BUILTIN_TASK_MODEL_REGISTRY = {
	connections: {
		openai: {
			provider: "openai",
			displayName: "OpenAI",
			credentialRef: "OPENAI_API_KEY",
			baseURL: "https://api.openai.com/v1",
			profile: {}
		},
		"doubao-speech": {
			provider: "doubao-speech",
			displayName: "豆包语音",
			credentialRefs: {
				speechAppId: "DOUBAO_APPID",
				speechToken: "DOUBAO_TOKEN",
				realtimeApiKey: "DOUBAO_REALTIME_API_KEY"
			},
			profile: {
				product: "doubao-speech",
				speechResources: "documented-resource-ids"
			}
		}
	},
	models: {
		"openai/gpt-image-2": {
			connection: "openai",
			model: "gpt-image-2",
			displayName: "GPT Image 2",
			task: "image-generation",
			runtimeAdapter: "openai-images",
			input: ["text", "image"],
			output: ["image"],
			execution: "request-response",
			capabilities: ["image.generate"],
			operations: ["generate", "edit"],
			roles: ["image-generator"],
			profile: {},
			portrait: initialPortrait("OpenAI image generation and editing model.")
		},
		"doubao/volc.bigasr.sauc.duration": {
			enabled: false,
			connection: "doubao-speech",
			model: "volc.bigasr.sauc.duration",
			displayName: "豆包大模型录音文件识别",
			task: "transcription",
			runtimeAdapter: "doubao-speech",
			credentialNames: ["speechAppId", "speechToken"],
			input: ["audio", "file"],
			output: ["text"],
			execution: "streaming",
			capabilities: ["speech.transcribe.file", "speech.transcribe.stream"],
			operations: ["transcribe-file", "transcribe-stream"],
			roles: ["speech-to-text"],
			profile: { resourceIdRole: "asr" },
			portrait: initialPortrait("Doubao/Volcengine large-model speech transcription resource.")
		},
		"doubao/seed-tts-1.0": {
			enabled: false,
			connection: "doubao-speech",
			model: "seed-tts-1.0",
			displayName: "豆包 Seed TTS 1.0",
			task: "speech-synthesis",
			runtimeAdapter: "doubao-speech",
			credentialNames: ["speechAppId", "speechToken"],
			input: ["text"],
			output: ["audio"],
			execution: "streaming",
			capabilities: ["speech.synthesize.short"],
			operations: ["synthesize"],
			roles: ["text-to-speech"],
			profile: { resourceIdRole: "tts" },
			portrait: initialPortrait("Doubao/Volcengine short-text speech synthesis resource.")
		},
		"doubao/realtime-duplex-3.0": {
			enabled: false,
			connection: "doubao-speech",
			model: "1.2.6.0",
			displayName: "豆包 Realtime Duplex 3.0（Seeduplex）",
			task: "realtime-speech",
			runtimeAdapter: "doubao-realtime-duplex",
			credentialNames: ["speechAppId", "realtimeApiKey"],
			input: ["text", "audio"],
			output: ["text", "audio"],
			execution: "realtime",
			capabilities: ["speech.realtime_session"],
			operations: ["realtime-session"],
			roles: ["voice-deliberation"],
			profile: {
				protocol: "doubao-realtime-duplex",
				endpoint: "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue",
				inputSampleRate: 16e3,
				outputSampleRate: 24e3,
				nativeFunctionCalling: true
			},
			portrait: initialPortrait("Volcengine Realtime Speech Model 3.0 full-duplex speech dialogue with native function calling.")
		}
	},
	defaults: {},
	portraits: {}
};
const TASK_DEFAULTS = {
	"image-understanding": {
		input: ["image", "file"],
		output: ["text"],
		execution: "request-response",
		operations: ["understand"]
	},
	"image-generation": {
		input: ["text"],
		output: ["image"],
		execution: "request-response",
		operations: ["generate"]
	},
	"speech-synthesis": {
		input: ["text"],
		output: ["audio"],
		execution: "streaming",
		operations: ["synthesize"]
	},
	transcription: {
		input: ["audio", "file"],
		output: ["text"],
		execution: "request-response",
		operations: ["transcribe"]
	},
	"speech-translation": {
		input: ["audio", "file"],
		output: ["text"],
		execution: "streaming",
		operations: ["translate"]
	},
	"speech-analysis": {
		input: ["audio", "file"],
		output: ["data"],
		execution: "request-response",
		operations: ["analyze"]
	},
	"voice-conversion": {
		input: ["audio", "file"],
		output: ["audio"],
		execution: "async-job",
		operations: ["convert-voice"]
	},
	"podcast-generation": {
		input: [
			"text",
			"audio",
			"file"
		],
		output: ["audio"],
		execution: "async-job",
		operations: ["create-podcast"]
	},
	"realtime-speech": {
		input: ["text", "audio"],
		output: ["text", "audio"],
		execution: "realtime",
		operations: ["realtime-session"]
	},
	"voice-cloning": {
		input: ["audio", "file"],
		output: ["data"],
		execution: "async-job",
		operations: ["clone-voice"]
	},
	"voice-design": {
		input: ["text"],
		output: ["data"],
		execution: "async-job",
		operations: ["design-voice"]
	},
	"audio-generation": {
		input: ["text"],
		output: ["audio"],
		execution: "async-job",
		operations: ["generate"]
	},
	"video-generation": {
		input: ["text", "image"],
		output: ["video"],
		execution: "async-job",
		operations: ["generate"]
	},
	embedding: {
		input: ["text"],
		output: ["vector"],
		execution: "request-response",
		operations: ["embed"]
	},
	reranking: {
		input: ["text"],
		output: ["data"],
		execution: "request-response",
		operations: ["rerank"]
	}
};
const CREDENTIAL_NAME = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
function nonBlank(value, name) {
	const normalized = value.trim();
	if (normalized === "") throw new ModelManagerError(`${name} must not be blank`, "INVALID_TASK_MODEL_CONFIGURATION");
	return normalized;
}
function optionalText(value) {
	if (value === void 0) return void 0;
	const normalized = value.trim();
	return normalized === "" ? void 0 : normalized;
}
function absoluteHttpUrl(value, name) {
	const normalized = optionalText(value);
	if (normalized === void 0) return void 0;
	let parsed;
	try {
		parsed = new URL(normalized);
	} catch (cause) {
		throw new ModelManagerError(`${name} must be an absolute URL`, "INVALID_TASK_MODEL_CONFIGURATION", { cause });
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new ModelManagerError(`${name} must use http or https`, "INVALID_TASK_MODEL_CONFIGURATION");
	return normalized;
}
function stringList(values, name) {
	if (values === void 0) return void 0;
	const normalized = values.map((value, index) => nonBlank(value, `${name}[${index}]`));
	return [...new Set(normalized)];
}
function namedCredentialRefs(values, name) {
	if (values === void 0) return void 0;
	const refs = {};
	for (const [rawKey, rawRef] of Object.entries(values)) {
		const key = nonBlank(rawKey, `${name} key`);
		if (!CREDENTIAL_NAME.test(key)) throw new ModelManagerError(`${name} key '${key}' must start with a letter and contain only letters, digits, dot, underscore, or hyphen`, "INVALID_TASK_MODEL_CONFIGURATION");
		if (typeof rawRef !== "string") throw new ModelManagerError(`${name}.${key} must be a credential reference name`, "INVALID_TASK_MODEL_CONFIGURATION");
		const ref = nonBlank(rawRef, `${name}.${key}`);
		try {
			credentialRef(ref);
		} catch (cause) {
			throw new ModelManagerError(`${name}.${key} '${ref}' must be a POSIX environment-variable name`, "INVALID_TASK_MODEL_CONFIGURATION", { cause });
		}
		refs[key] = ref;
	}
	return refs;
}
async function namedCredentialStatuses(ctx, refs) {
	if (refs === void 0 || Object.keys(refs).length === 0) return void 0;
	return Object.fromEntries(await Promise.all(Object.entries(refs).map(async ([name, ref]) => [name, await credentialStatus(ctx, ref)])));
}
function selectedCredentialRefs(connection, names) {
	if (names === void 0) return {
		...connection.credentialRef === void 0 ? {} : { credentialRef: connection.credentialRef },
		...connection.credentialRefs === void 0 ? {} : { credentialRefs: { ...connection.credentialRefs } }
	};
	const selected = new Set(names);
	return {
		...selected.has("default") && connection.credentialRef !== void 0 ? { credentialRef: connection.credentialRef } : {},
		credentialRefs: Object.fromEntries(Object.entries(connection.credentialRefs ?? {}).filter(([name]) => selected.has(name)))
	};
}
function requiredDescriptor(ctx) {
	const descriptor = ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === TASK_MODEL_SETTINGS_NAMESPACE);
	if (descriptor === void 0) throw new ModelManagerError("multi-model-provider settings are unavailable; register the plugin before using its tools", "TASK_MODEL_SETTINGS_UNAVAILABLE");
	return descriptor;
}
function resolvedConfig(descriptor) {
	return descriptor.value;
}
function resolveTaskModelRoute(ctx, id) {
	const routeId = nonBlank(id, "id");
	const config = resolvedConfig(requiredDescriptor(ctx));
	const registration = config.models[routeId];
	if (registration === void 0) throw new ModelManagerError(`unknown task model '${routeId}'`, "UNKNOWN_TASK_MODEL");
	const connection = config.connections[registration.connection];
	if (connection === void 0) throw new ModelManagerError(`task model '${routeId}' references unknown connection '${registration.connection}'`, "INVALID_TASK_MODEL_CONFIGURATION");
	return {
		id: routeId,
		connection,
		registration
	};
}
async function credentialStatus(ctx, ref) {
	let branded;
	try {
		branded = credentialRef(ref);
	} catch (cause) {
		throw new ModelManagerError(`credentialRef '${ref}' must be a POSIX environment-variable name`, "INVALID_TASK_MODEL_CONFIGURATION", { cause });
	}
	const info = await ctx.credentials.describe(branded);
	return {
		ref,
		configured: info.configured,
		writable: info.writable,
		...info.source === void 0 ? {} : { source: info.source }
	};
}
function validateConnection(id, connection) {
	nonBlank(id, "connection id");
	nonBlank(connection.provider, `connections.${id}.provider`);
	absoluteHttpUrl(connection.baseURL, `connections.${id}.baseURL`);
	absoluteHttpUrl(connection.catalogEndpoint, `connections.${id}.catalogEndpoint`);
	if (connection.credentialRef !== void 0) credentialRef(nonBlank(connection.credentialRef, `connections.${id}.credentialRef`));
	const refs = namedCredentialRefs(connection.credentialRefs, `connections.${id}.credentialRefs`);
	const catalogCredentialName = optionalText(connection.catalogCredentialName);
	if (catalogCredentialName !== void 0 && catalogCredentialName !== "default" && refs?.[catalogCredentialName] === void 0) throw new ModelManagerError(`connections.${id}.catalogCredentialName references unknown credential slot '${catalogCredentialName}'`, "INVALID_TASK_MODEL_CONFIGURATION");
}
function validateTaskModelRegistry(config) {
	for (const [id, connection] of Object.entries(config.connections)) validateConnection(id, connection);
	for (const [id, model] of Object.entries(config.models)) {
		nonBlank(id, "model route id");
		nonBlank(model.connection, `models.${id}.connection`);
		nonBlank(model.model, `models.${id}.model`);
		if (config.connections[model.connection] === void 0) throw new ModelManagerError(`models.${id}.connection references unknown connection '${model.connection}'`, "INVALID_TASK_MODEL_CONFIGURATION");
		stringList(model.input, `models.${id}.input`);
		stringList(model.output, `models.${id}.output`);
		stringList(model.capabilities, `models.${id}.capabilities`);
		const credentialNames = stringList(model.credentialNames, `models.${id}.credentialNames`);
		const connection = config.connections[model.connection];
		for (const name of credentialNames ?? []) if (name !== "default" && connection.credentialRefs?.[name] === void 0) throw new ModelManagerError(`models.${id}.credentialNames references unknown connection credential slot '${name}'`, "INVALID_TASK_MODEL_CONFIGURATION");
		stringList(model.operations, `models.${id}.operations`);
		stringList(model.roles, `models.${id}.roles`);
		if (model.portrait !== void 0) normalizePortrait(model.portrait);
	}
	for (const [task, id] of Object.entries(config.defaults)) {
		const model = config.models[id];
		if (model === void 0) throw new ModelManagerError(`defaults.${task} references unknown model '${id}'`, "INVALID_TASK_MODEL_CONFIGURATION");
		if (model.task !== task) throw new ModelManagerError(`defaults.${task} references a '${model.task}' model`, "INVALID_TASK_MODEL_CONFIGURATION");
	}
	for (const [id, binding] of Object.entries(config.portraits ?? {})) {
		if (!id.startsWith("llm:")) throw new ModelManagerError(`portraits.${id} must use llm:<provider>/<model> id`, "INVALID_TASK_MODEL_CONFIGURATION");
		nonBlank(binding.provider, `portraits.${id}.provider`);
		nonBlank(binding.model, `portraits.${id}.model`);
		normalizePortrait(binding.portrait);
	}
}
function registerTaskModelSettings(ctx) {
	ctx.settings.register(TASK_MODEL_SETTINGS_NAMESPACE, TASK_MODEL_REGISTRY_SCHEMA, {
		base: BUILTIN_TASK_MODEL_REGISTRY,
		applies: "live",
		validate: validateTaskModelRegistry
	});
}
async function registerTaskModel(ctx, input) {
	const id = nonBlank(input.id, "id");
	const connectionId = nonBlank(input.connection, "connection");
	const modelId = nonBlank(input.model, "model");
	const descriptor = requiredDescriptor(ctx);
	const config = resolvedConfig(descriptor);
	const existingConnection = config.connections[connectionId];
	const provider = optionalText(input.provider) ?? existingConnection?.provider;
	if (provider === void 0) throw new ModelManagerError(`provider is required when creating connection '${connectionId}'`, "INVALID_TASK_MODEL_CONFIGURATION");
	const credential = optionalText(input.credentialRef);
	if (credential !== void 0) await credentialStatus(ctx, credential);
	const credentialRefs = namedCredentialRefs(input.credentialRefs, "credentialRefs");
	if (credentialRefs !== void 0) await namedCredentialStatuses(ctx, credentialRefs);
	const baseURL = absoluteHttpUrl(input.baseURL, "baseURL");
	const catalogEndpoint = absoluteHttpUrl(input.catalogEndpoint, "catalogEndpoint");
	const catalogCredentialName = optionalText(input.catalogCredentialName);
	const defaults = TASK_DEFAULTS[input.task];
	const existingModel = config.models[id];
	const connectionFields = {
		provider: nonBlank(provider, "provider"),
		...input.connectionDisplayName === void 0 ? {} : { displayName: optionalText(input.connectionDisplayName) },
		...credential === void 0 ? {} : { credentialRef: credential },
		...credentialRefs === void 0 ? {} : { credentialRefs },
		...baseURL === void 0 ? {} : { baseURL },
		...catalogEndpoint === void 0 ? {} : { catalogEndpoint },
		...catalogCredentialName === void 0 ? {} : { catalogCredentialName },
		...input.connectionProfile === void 0 ? {} : { profile: input.connectionProfile }
	};
	const modelFields = {
		enabled: input.enabled ?? existingModel?.enabled ?? true,
		connection: connectionId,
		model: modelId,
		task: input.task,
		...input.displayName === void 0 ? {} : { displayName: optionalText(input.displayName) },
		...input.runtimeAdapter === void 0 ? {} : { runtimeAdapter: optionalText(input.runtimeAdapter) },
		...input.credentialNames === void 0 ? {} : { credentialNames: stringList(input.credentialNames, "credentialNames") },
		input: stringList(input.input, "input") ?? existingModel?.input ?? defaults.input,
		output: stringList(input.output, "output") ?? existingModel?.output ?? defaults.output,
		execution: input.execution ?? existingModel?.execution ?? defaults.execution,
		capabilities: stringList(input.capabilities, "capabilities") ?? existingModel?.capabilities ?? [],
		operations: stringList(input.operations, "operations") ?? existingModel?.operations ?? defaults.operations,
		roles: stringList(input.roles, "roles") ?? existingModel?.roles ?? [],
		profile: input.profile ?? existingModel?.profile ?? {},
		portrait: input.portrait === void 0 ? existingModel?.portrait ?? initialPortrait(input.displayName ?? modelId) : normalizePortrait(input.portrait)
	};
	const ops = [...Object.entries(connectionFields).filter(([, value]) => value !== void 0).map(([field, value]) => ({
		op: "set",
		path: [
			"connections",
			connectionId,
			field
		],
		value
	})), ...Object.entries(modelFields).filter(([, value]) => value !== void 0).map(([field, value]) => ({
		op: "set",
		path: [
			"models",
			id,
			field
		],
		value
	}))];
	await ctx.settings.mutate(TASK_MODEL_SETTINGS_NAMESPACE, ops, descriptor.revision);
	const effectiveCredentialRef = credential ?? existingConnection?.credentialRef;
	const effectiveNamedCredentialRefs = credentialRefs ?? existingConnection?.credentialRefs;
	const selectedRefs = selectedCredentialRefs({
		provider,
		...effectiveCredentialRef === void 0 ? {} : { credentialRef: effectiveCredentialRef },
		...effectiveNamedCredentialRefs === void 0 ? {} : { credentialRefs: effectiveNamedCredentialRefs }
	}, input.credentialNames ?? existingModel?.credentialNames);
	const status = selectedRefs.credentialRef === void 0 ? void 0 : await credentialStatus(ctx, selectedRefs.credentialRef);
	const statuses = await namedCredentialStatuses(ctx, selectedRefs.credentialRefs);
	const requiredAdapter = optionalText(input.runtimeAdapter) ?? existingModel?.runtimeAdapter;
	const missingRefs = [...status?.configured === false ? [status.ref] : [], ...Object.values(statuses ?? {}).filter((item) => !item.configured).map((item) => item.ref)];
	return {
		id,
		registered: true,
		callable: false,
		task: input.task,
		connection: connectionId,
		provider,
		model: modelId,
		...requiredAdapter === void 0 ? {} : { requiredAdapter },
		...status === void 0 ? {} : { credential: status },
		...statuses === void 0 ? {} : { credentials: statuses },
		settingsNs: TASK_MODEL_SETTINGS_NAMESPACE,
		settingsPath: ["models", id],
		next: missingRefs.length > 0 ? `Store ${[...new Set(missingRefs)].join(", ")} in the secure multi-model-provider credential fields; do not paste secrets into chat.` : requiredAdapter === void 0 ? "The route is registered. Install and declare a compatible runtime adapter before invoking it." : `The route is registered. Runtime adapter '${requiredAdapter}' is still required for invocation.`
	};
}
function catalogURL(connection) {
	if (connection.catalogEndpoint !== void 0) return connection.catalogEndpoint;
	if (connection.baseURL === void 0) throw new ModelManagerError("connection declares neither catalogEndpoint nor baseURL", "TASK_MODEL_CATALOG_UNAVAILABLE");
	return `${connection.baseURL.replace(/\/+$/, "")}/models`;
}
async function discoverTaskModels(ctx, input, signal = AbortSignal.timeout(15e3)) {
	const connectionId = nonBlank(input.connection, "connection");
	const config = resolvedConfig(requiredDescriptor(ctx));
	const connection = config.connections[connectionId];
	if (connection === void 0) throw new ModelManagerError(`unknown connection '${connectionId}'`, "UNKNOWN_TASK_MODEL_CONNECTION");
	const endpoint = catalogURL(connection);
	const credentialName = optionalText(connection.catalogCredentialName);
	let authorization;
	if (credentialName !== void 0) {
		const ref = credentialName === "default" ? connection.credentialRef : connection.credentialRefs?.[credentialName];
		if (ref === void 0) throw new ModelManagerError(`catalog credential slot '${credentialName}' is not configured on connection '${connectionId}'`, "TASK_MODEL_CATALOG_CREDENTIAL_UNDECLARED");
		const resolved = await ctx.credentials.resolve(credentialRef(ref));
		if (resolved === void 0) throw new ModelManagerError(`credential reference '${ref}' required by connection '${connectionId}' is not configured`, "TASK_MODEL_CREDENTIAL_MISSING");
		authorization = `Bearer ${resolved.value}`;
	}
	const started = Date.now();
	const response = await fetch(endpoint, {
		method: "GET",
		headers: authorization === void 0 ? {} : { Authorization: authorization },
		signal
	});
	if (!response.ok) throw new ModelManagerError(`model catalog request failed with HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`, "TASK_MODEL_CATALOG_REQUEST_FAILED");
	const body = await response.json();
	const rows = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : [];
	const registrations = Object.entries(config.models).filter(([, model]) => model.connection === connectionId);
	const models = rows.map((row) => {
		if (typeof row === "string") return { id: row };
		const name = "name" in row ? row.name : void 0;
		return {
			id: typeof row.id === "string" ? row.id : typeof name === "string" ? name : "",
			...typeof row.owned_by === "string" ? { ownedBy: row.owned_by } : {}
		};
	}).filter((row) => row.id !== "").map((row) => {
		const registered = registrations.find(([, model]) => model.model === row.id);
		return {
			...row,
			registered: registered !== void 0,
			...registered === void 0 ? {} : {
				routeId: registered[0],
				enabled: registered[1].enabled !== false
			}
		};
	}).sort((a, b) => a.id.localeCompare(b.id));
	return {
		connection: connectionId,
		provider: connection.provider,
		endpoint,
		latencyMs: Date.now() - started,
		count: models.length,
		models,
		note: "Discovery is advisory and never registers or enables models automatically."
	};
}
async function selectTaskModels(ctx, input) {
	const connectionId = nonBlank(input.connection, "connection");
	const descriptor = requiredDescriptor(ctx);
	const config = resolvedConfig(descriptor);
	if (config.connections[connectionId] === void 0) throw new ModelManagerError(`unknown connection '${connectionId}'`, "UNKNOWN_TASK_MODEL_CONNECTION");
	const ids = stringList(input.ids, "ids") ?? [];
	const routes = Object.entries(config.models).filter(([, model]) => model.connection === connectionId);
	const routeIds = new Set(routes.map(([id]) => id));
	for (const id of ids) if (!routeIds.has(id)) throw new ModelManagerError(`task model '${id}' is not registered on connection '${connectionId}'`, "INVALID_TASK_MODEL_SELECTION");
	const selected = new Set(ids);
	const ops = routes.map(([id]) => ({
		op: "set",
		path: [
			"models",
			id,
			"enabled"
		],
		value: selected.has(id)
	}));
	if (ops.length > 0) await ctx.settings.mutate(TASK_MODEL_SETTINGS_NAMESPACE, ops, descriptor.revision);
	return {
		connection: connectionId,
		selected: ids,
		disabled: routes.map(([id]) => id).filter((id) => !selected.has(id)),
		allDisabled: ids.length === 0,
		note: ids.length === 0 ? "All registered models on this connection are explicitly disabled; no fallback selection was applied." : "Only the selected registered routes are enabled on this connection."
	};
}
async function listTaskModels(ctx, input = {}) {
	const requestedId = optionalText(input.id);
	const provider = optionalText(input.provider);
	const descriptor = requiredDescriptor(ctx);
	const config = resolvedConfig(descriptor);
	if (requestedId !== void 0 && config.models[requestedId] === void 0) throw new ModelManagerError(`unknown task model '${requestedId}'`, "UNKNOWN_TASK_MODEL");
	const userModels = typeof descriptor.user === "object" && descriptor.user !== null && !Array.isArray(descriptor.user) ? descriptor.user.models ?? {} : {};
	const models = [];
	for (const [id, model] of Object.entries(config.models)) {
		if (requestedId !== void 0 && id !== requestedId) continue;
		if (input.task !== void 0 && model.task !== input.task) continue;
		const connection = config.connections[model.connection];
		if (connection === void 0) continue;
		if (provider !== void 0 && connection.provider !== provider) continue;
		const selectedRefs = selectedCredentialRefs(connection, model.credentialNames);
		const status = selectedRefs.credentialRef === void 0 ? void 0 : await credentialStatus(ctx, selectedRefs.credentialRef);
		const statuses = await namedCredentialStatuses(ctx, selectedRefs.credentialRefs);
		const credentialReady = status?.configured !== false && Object.values(statuses ?? {}).every((item) => item.configured);
		const runtime = ctx.taskModelRuntime;
		const route = {
			id,
			connection,
			registration: model
		};
		const adapterAvailable = runtime?.hasAdapter(model.runtimeAdapter, route) ?? false;
		const enabled = model.enabled !== false;
		const callable = enabled && adapterAvailable && credentialReady;
		models.push({
			id,
			enabled,
			provider: connection.provider,
			connection: model.connection,
			model: model.model,
			displayName: model.displayName ?? model.model,
			task: model.task,
			input: [...model.input],
			output: [...model.output],
			execution: model.execution,
			capabilities: [...model.capabilities ?? []],
			operations: [...model.operations],
			roles: [...model.roles],
			registration: userModels[id] === void 0 ? "built-in" : "user",
			availability: {
				status: callable ? "callable" : "registered-only",
				callable,
				...model.runtimeAdapter === void 0 ? {} : { requiredAdapter: model.runtimeAdapter },
				reason: callable ? `Runtime adapter '${model.runtimeAdapter}' is available and credential references are configured.` : !enabled ? "The route is registered but explicitly disabled by the current model selection." : model.runtimeAdapter === void 0 ? "No runtime adapter contract is declared for this route." : !adapterAvailable ? `Registration is present, but runtime adapter '${model.runtimeAdapter}' is unavailable.` : "Runtime adapter is available, but one or more credential references are not configured."
			},
			connectionProfile: {
				displayName: connection.displayName ?? connection.provider,
				...connection.baseURL === void 0 ? {} : { baseURL: connection.baseURL },
				...status === void 0 ? {} : { credential: status },
				...statuses === void 0 ? {} : { credentials: statuses },
				...connection.profile === void 0 ? {} : { metadata: connection.profile }
			},
			...input.includeProfile === true ? { profile: model.profile } : {},
			portrait: model.portrait === void 0 ? void 0 : {
				summary: model.portrait.summary,
				specialties: model.portrait.specialties,
				speedClass: model.portrait.performance.speedClass,
				pricingRates: model.portrait.pricing.rates.length,
				validation: model.portrait.validation
			}
		});
	}
	const counts = Object.fromEntries(TASK_MODEL_TASKS.map((task) => [task, models.filter((model) => model.task === task).length]));
	return {
		models,
		count: models.length,
		enabledCount: models.filter((model) => model.enabled === true).length,
		counts,
		defaults: config.defaults,
		settingsNs: TASK_MODEL_SETTINGS_NAMESPACE,
		note: "Task-model registration is catalog metadata. A runtime adapter must separately claim and execute each route."
	};
}
//#endregion
//#region lib/types/providers/volcengine.js
const VOLCENGINE_PROVIDER = "volcengine";
const VOLCENGINE_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
const VOLCENGINE_ARK_API = "openai-responses";
const CREDENTIALS = {
	arkApiKey: "ARK_API_KEY",
	speechAppId: "DOUBAO_APPID",
	speechToken: "DOUBAO_TOKEN",
	realtimeApiKey: "DOUBAO_REALTIME_API_KEY"
};
function object$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function descriptor(ctx, ns) {
	return ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === ns);
}
function selectedLanguageModels(ctx) {
	const profile = object$1(object$1(object$1(descriptor(ctx, PI_AI_SETTINGS_NAMESPACE)?.value)?.providers)?.[VOLCENGINE_PROVIDER]);
	return Array.isArray(profile?.models) ? profile.models : [];
}
async function credentialStatuses(ctx) {
	return Object.fromEntries(await Promise.all(Object.entries(CREDENTIALS).map(async ([slot, ref]) => {
		const status = await ctx.credentials.describe(credentialRef(ref));
		return [slot, {
			ref,
			configured: status.configured,
			writable: status.writable,
			...status.source === void 0 ? {} : { source: status.source }
		}];
	})));
}
async function discoverArkModels(ctx, signal) {
	const resolved = await ctx.credentials.resolve(credentialRef(CREDENTIALS.arkApiKey));
	if (resolved === void 0) return { models: [] };
	try {
		return { models: (await ctx.llm.discoverModels(PI_AI_SETTINGS_NAMESPACE, {
			baseURL: VOLCENGINE_ARK_BASE_URL,
			api: VOLCENGINE_ARK_API,
			apiKey: resolved.value,
			signal
		})).map((model) => ({
			id: model.id,
			...model.name === void 0 ? {} : { name: model.name },
			...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
			...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens }
		})) };
	} catch (error) {
		return {
			models: [],
			error: error instanceof Error ? error.message : "Ark model discovery failed"
		};
	}
}
/** One provider-specific orientation call: credentials, live catalog, selections, and invocation paths. */
async function inspectVolcengineProvider(ctx, signal) {
	const credentials = await credentialStatuses(ctx);
	const discovery = await discoverArkModels(ctx, signal);
	const taskModels = object$1(object$1(descriptor(ctx, TASK_MODEL_SETTINGS_NAMESPACE)?.value)?.models) ?? {};
	const taskRoutes = Object.entries(taskModels).filter(([, value]) => object$1(value)?.connection === "doubao-speech").map(([id, value]) => {
		const route = object$1(value);
		return {
			id,
			model: route.model,
			task: route.task,
			enabled: route.enabled !== false,
			runtimeAdapter: route.runtimeAdapter,
			callability: ctx.taskModelRuntime.hasAdapter(typeof route.runtimeAdapter === "string" ? route.runtimeAdapter : void 0)
		};
	});
	const arkConfigured = credentials.arkApiKey.configured;
	return {
		provider: VOLCENGINE_PROVIDER,
		displayName: "火山方舟",
		credentials,
		ark: {
			api: VOLCENGINE_ARK_API,
			baseURL: VOLCENGINE_ARK_BASE_URL,
			catalogEndpoint: `${VOLCENGINE_ARK_BASE_URL}/models`,
			discovery: arkConfigured ? discovery.error === void 0 ? "ok" : "failed" : "credential-required",
			...discovery.error === void 0 ? {} : { error: discovery.error },
			availableModels: discovery.models,
			selectedLanguageModels: selectedLanguageModels(ctx)
		},
		relatedTaskProvider: {
			provider: "doubao-speech",
			displayName: "豆包语音",
			taskRoutes
		},
		routingRules: {
			languageAndVlm: "Select with select_volcengine_language_models; these become ordinary llm-pi-ai models and are used through the Agent model selector.",
			imageVideoAudioSpeech: "Register/select task routes, then invoke with invoke_task_model only when list_task_models reports callable.",
			platformEndpoint: "When the account uses a deployed Platform endpoint, its ep-* endpoint id is the model id; do not substitute a display name."
		},
		next: !arkConfigured ? "Store ARK_API_KEY in the secure Models credentials UI, then call inspect_volcengine_provider again. Do not paste the key into chat." : discovery.error !== void 0 ? "Fix the Ark credential or endpoint access, then retry discovery." : "Choose zero or more language/VLM entries with select_volcengine_language_models. Zero explicitly disables the Volcengine LLM route."
	};
}
function normalizeProfiles(models) {
	const seen = /* @__PURE__ */ new Set();
	return models.map((model, index) => {
		const id = model.id.trim();
		if (id === "") throw new ModelManagerError(`models[${index}].id must not be blank`, "INVALID_VOLCENGINE_MODEL_SELECTION");
		if (seen.has(id)) throw new ModelManagerError(`duplicate Volcengine model id '${id}'`, "INVALID_VOLCENGINE_MODEL_SELECTION");
		seen.add(id);
		return {
			...model,
			id
		};
	});
}
async function selectVolcengineLanguageModels(ctx, input) {
	const models = normalizeProfiles(input.models);
	if (models.length === 0) {
		const current = descriptor(ctx, PI_AI_SETTINGS_NAMESPACE);
		if (current === void 0) throw new ModelManagerError("llm-pi-ai settings are unavailable", "MODEL_SETTINGS_UNAVAILABLE");
		const ops = [{
			op: "unset",
			path: ["providers", VOLCENGINE_PROVIDER]
		}];
		await ctx.settings.mutate(PI_AI_SETTINGS_NAMESPACE, ops, current.revision);
		return {
			provider: VOLCENGINE_PROVIDER,
			selected: [],
			allDisabled: true,
			note: "The Volcengine LLM route was removed. No fallback model was selected; task-model selections are unchanged."
		};
	}
	return {
		...await configureModelRoute(ctx, {
			provider: VOLCENGINE_PROVIDER,
			displayName: "火山方舟",
			api: VOLCENGINE_ARK_API,
			baseURL: VOLCENGINE_ARK_BASE_URL,
			apiKeyEnv: CREDENTIALS.arkApiKey,
			models
		}),
		selected: models.map((model) => model.id),
		allDisabled: false,
		usage: "Create a new Agent or use the session model selector with provider=volcengine and one selected model id."
	};
}
//#endregion
//#region lib/types/runtime.js
var TaskModelRuntime = class extends Service {
	adapters = /* @__PURE__ */ new Map();
	constructor(ctx) {
		super(ctx, "taskModelRuntime");
	}
	registerAdapter(adapter) {
		const id = adapter.id.trim();
		if (id === "") throw new ModelManagerError("task-model adapter id must not be blank", "INVALID_TASK_MODEL_ADAPTER");
		if (this.adapters.has(id)) throw new ModelManagerError(`task-model adapter '${id}' is already registered`, "DUPLICATE_TASK_MODEL_ADAPTER");
		const dispose = this.ctx.effect(function* () {
			this.adapters.set(id, adapter);
			yield () => this.adapters.delete(id);
		}.bind(this), "taskModelRuntime.registerAdapter()");
		return () => void dispose();
	}
	hasAdapter(id, route) {
		if (id === void 0) return false;
		const adapter = this.adapters.get(id);
		if (adapter === void 0) return false;
		return route === void 0 || adapter.available?.(route) !== false;
	}
	async invoke(route, operation, request, signal) {
		const adapter = this.requiredAdapter(route);
		const credentials = await this.resolveCredentials(route);
		return adapter.invoke({
			route,
			operation,
			request,
			credentials
		}, signal);
	}
	async probe(route, signal) {
		const adapter = this.requiredAdapter(route);
		const credentials = await this.resolveCredentials(route);
		if (adapter.probe === void 0) return {
			ok: true,
			message: `adapter '${adapter.id}' is registered but exposes no live probe`
		};
		return adapter.probe(route, credentials, signal);
	}
	requiredAdapter(route) {
		const adapterId = route.registration.runtimeAdapter;
		if (adapterId === void 0) throw new ModelManagerError(`task model '${route.id}' declares no runtime adapter`, "TASK_MODEL_ADAPTER_UNDECLARED");
		const adapter = this.adapters.get(adapterId);
		if (adapter === void 0 || adapter.available?.(route) === false) throw new ModelManagerError(`runtime adapter '${adapterId}' is not available for task model '${route.id}'`, "TASK_MODEL_ADAPTER_UNAVAILABLE");
		return adapter;
	}
	async resolveCredentials(route) {
		const allRefs = {
			...route.connection.credentialRef === void 0 ? {} : { default: route.connection.credentialRef },
			...route.connection.credentialRefs ?? {}
		};
		const selected = route.registration.credentialNames === void 0 ? void 0 : new Set(route.registration.credentialNames);
		const refs = Object.fromEntries(Object.entries(allRefs).filter(([name]) => selected === void 0 || selected.has(name)));
		const credentials = {};
		for (const [name, ref] of Object.entries(refs)) {
			const resolved = await this.ctx.credentials.resolve(credentialRef(ref));
			if (resolved === void 0) throw new ModelManagerError(`credential reference '${ref}' required by task model '${route.id}' is not configured`, "TASK_MODEL_CREDENTIAL_MISSING");
			credentials[name] = resolved.value;
		}
		return credentials;
	}
};
//#endregion
//#region lib/types/observations/session-events.js
function recordTaskModelObservation(exec, value) {
	exec.agent?.session.append("multi-model/invocation", value);
}
//#endregion
//#region lib/types/invocation.js
async function invokeTaskModel(ctx, input, exec) {
	const route = resolveTaskModelRoute(ctx, input.id);
	if (route.registration.enabled === false) throw new ModelManagerError(`task model '${route.id}' is registered but disabled by the current model selection`, "TASK_MODEL_DISABLED");
	const operation = input.operation.trim();
	if (operation === "") throw new ModelManagerError("operation must not be blank", "INVALID_TASK_MODEL_INVOCATION");
	if (route.registration.operations.length > 0 && !route.registration.operations.includes(operation)) throw new ModelManagerError(`task model '${route.id}' does not declare operation '${operation}'`, "UNSUPPORTED_TASK_MODEL_OPERATION");
	const adapter = route.registration.runtimeAdapter;
	if (adapter === void 0) throw new ModelManagerError(`task model '${route.id}' declares no runtime adapter`, "TASK_MODEL_ADAPTER_UNDECLARED");
	const started = Date.now();
	const startedAt = new Date(started).toISOString();
	try {
		const result = await ctx.taskModelRuntime.invoke(route, operation, input.request, exec.signal);
		const invocation = {
			routeId: route.id,
			provider: route.connection.provider,
			model: route.registration.model,
			task: route.registration.task,
			adapter,
			operation,
			startedAt,
			durationMs: Date.now() - started,
			success: true,
			inputModalities: route.registration.input,
			outputModalities: result.outputModalities ?? route.registration.output,
			...result.metrics === void 0 ? {} : { metrics: result.metrics }
		};
		recordTaskModelObservation(exec, invocation);
		return {
			id: route.id,
			...result,
			invocation
		};
	} catch (error) {
		recordTaskModelObservation(exec, {
			routeId: route.id,
			provider: route.connection.provider,
			model: route.registration.model,
			task: route.registration.task,
			adapter,
			operation,
			startedAt,
			durationMs: Date.now() - started,
			success: false,
			inputModalities: route.registration.input,
			outputModalities: route.registration.output,
			...typeof error?.code === "string" ? { errorCode: error.code } : {}
		});
		throw error;
	}
}
//#endregion
//#region lib/types/model-target-id.js
function llmTargetId(provider, model) {
	return `llm:${provider}/${model}`;
}
function parseLlmTargetId(id) {
	if (!id.startsWith("llm:")) return void 0;
	const value = id.slice(4);
	const slash = value.indexOf("/");
	if (slash <= 0 || slash === value.length - 1) throw new ModelManagerError(`invalid LLM portrait id '${id}'; expected llm:<provider>/<model>`, "INVALID_MODEL_PORTRAIT_ID");
	return {
		provider: value.slice(0, slash),
		model: value.slice(slash + 1)
	};
}
//#endregion
//#region lib/types/observations/llm-session-reader.js
function object(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function coordinate(data) {
	const turn = typeof data.turn === "number" ? data.turn : void 0;
	const step = typeof data.step === "number" ? data.step : void 0;
	return turn === void 0 || step === void 0 ? void 0 : `${turn}:${step}`;
}
/**
* Adapts durable Harness LLM events into privacy-safe observations.
* Prompt and response content are deliberately ignored.
*/
function llmObservations(events) {
	if (events === void 0) return [];
	let selection;
	const starts = /* @__PURE__ */ new Map();
	const result = [];
	for (const event of events) {
		const data = object(event.data);
		if (data === void 0) continue;
		if (event.type === "request/header") {
			const config = object(object(data.header)?.config);
			if (typeof config?.provider === "string" && typeof config.model === "string") selection = {
				provider: config.provider,
				model: config.model
			};
			continue;
		}
		if (event.type === "step/start" && selection !== void 0) {
			const key = coordinate(data);
			if (key !== void 0) starts.set(key, {
				time: event.time,
				...selection
			});
			continue;
		}
		if (event.type !== "assistant/message") continue;
		const key = coordinate(data);
		const start = key === void 0 ? void 0 : starts.get(key);
		const usage = object(data.usage);
		if (start === void 0 || usage === void 0) continue;
		const tokens = Object.fromEntries([
			"inputTokens",
			"outputTokens",
			"cacheReadTokens",
			"cacheWriteTokens",
			"reasoningTokens"
		].filter((name) => typeof usage[name] === "number").map((name) => [name, usage[name]]));
		result.push({
			id: llmTargetId(start.provider, start.model),
			provider: start.provider,
			model: start.model,
			startedAt: new Date(start.time).toISOString(),
			durationMs: Math.max(0, event.time - start.time),
			success: true,
			usage: tokens
		});
	}
	return result;
}
//#endregion
//#region lib/types/observations/task-session-reader.js
function taskModelObservations(events) {
	if (events === void 0) return [];
	return events.filter((event) => event.type === "multi-model/invocation").map((event) => event.data);
}
//#endregion
//#region lib/types/observations/aggregate.js
function percentile(values, fraction) {
	if (values.length === 0) return void 0;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}
function summarizeTask(id, items) {
	const successes = items.filter((item) => item.success).length;
	return {
		id,
		kind: "task",
		calls: items.length,
		successes,
		failures: items.length - successes,
		successRate: items.length === 0 ? void 0 : successes / items.length,
		latencyMs: {
			p50: percentile(items.map((item) => item.durationMs), .5),
			p95: percentile(items.map((item) => item.durationMs), .95)
		},
		estimatedCost: items.reduce((sum, item) => sum + (item.metrics?.estimatedCost ?? 0), 0),
		currencies: [...new Set(items.map((item) => item.metrics?.currency).filter((item) => item !== void 0))],
		firstAt: items[0]?.startedAt,
		lastAt: items.at(-1)?.startedAt
	};
}
function summarizeLlm(id, items) {
	const successes = items.filter((item) => item.success).length;
	const sum = (key) => items.reduce((total, item) => total + (item.usage[key] ?? 0), 0);
	return {
		id,
		kind: "llm",
		provider: items[0]?.provider,
		model: items[0]?.model,
		calls: items.length,
		successes,
		failures: items.length - successes,
		successRate: items.length === 0 ? void 0 : successes / items.length,
		latencyMs: {
			p50: percentile(items.map((item) => item.durationMs), .5),
			p95: percentile(items.map((item) => item.durationMs), .95)
		},
		tokens: {
			input: sum("inputTokens"),
			output: sum("outputTokens"),
			cacheRead: sum("cacheReadTokens"),
			cacheWrite: sum("cacheWriteTokens"),
			reasoning: sum("reasoningTokens")
		},
		firstAt: items[0]?.startedAt,
		lastAt: items.at(-1)?.startedAt
	};
}
function summarizeModelUsage(input, events) {
	const tasks = taskModelObservations(events).filter((item) => input.id === void 0 || item.routeId === input.id);
	const llms = llmObservations(events).filter((item) => input.id === void 0 || item.id === input.id);
	const byTask = /* @__PURE__ */ new Map();
	const byLlm = /* @__PURE__ */ new Map();
	for (const item of tasks) byTask.set(item.routeId, [...byTask.get(item.routeId) ?? [], item]);
	for (const item of llms) byLlm.set(item.id, [...byLlm.get(item.id) ?? [], item]);
	return {
		scope: "current-session",
		count: tasks.length + llms.length,
		models: [...[...byTask].map(([id, items]) => summarizeTask(id, items)), ...[...byLlm].map(([id, items]) => summarizeLlm(id, items))],
		note: "Uses native Harness LLM events plus task-model invocation records. Only routing, timing, outcome, modality, token, and cost metadata are aggregated; prompts, responses, media, and credentials are never copied."
	};
}
//#endregion
//#region lib/types/portraits/storage.js
function portraitSettings(ctx) {
	const value = ctx.settings.describe({ redactSecrets: true }).find((item) => item.ns === TASK_MODEL_SETTINGS_NAMESPACE);
	if (value === void 0) throw new ModelManagerError("multi-model-provider settings are unavailable", "TASK_MODEL_SETTINGS_UNAVAILABLE");
	return value;
}
function portraitRegistry(ctx) {
	return portraitSettings(ctx).value;
}
async function mutatePortraitSettings(ctx, operations) {
	const current = portraitSettings(ctx);
	await ctx.settings.mutate(TASK_MODEL_SETTINGS_NAMESPACE, operations, current.revision);
}
//#endregion
//#region lib/types/portraits/targets.js
async function resolvePortraitTarget(ctx, id, signal) {
	const targetId = id.trim();
	if (targetId === "") throw new ModelManagerError("id must not be blank", "INVALID_MODEL_PORTRAIT_ID");
	const config = portraitRegistry(ctx);
	if (config.models[targetId] !== void 0) {
		const route = resolveTaskModelRoute(ctx, targetId);
		return {
			kind: "task",
			id: route.id,
			portrait: route.registration.portrait,
			storagePath: [
				"models",
				route.id,
				"portrait"
			],
			declared: {
				task: route.registration.task,
				input: route.registration.input,
				output: route.registration.output,
				execution: route.registration.execution,
				capabilities: route.registration.capabilities ?? [],
				operations: route.registration.operations,
				runtimeAdapter: route.registration.runtimeAdapter,
				enabled: route.registration.enabled !== false
			},
			route
		};
	}
	const parsed = parseLlmTargetId(targetId);
	if (parsed === void 0) throw new ModelManagerError(`unknown model portrait target '${targetId}'; use a task route id or llm:<provider>/<model>`, "UNKNOWN_MODEL_PORTRAIT_TARGET");
	const info = await ctx.llm.resolveModelInfo(parsed.provider, parsed.model, signal);
	const binding = config.portraits?.[targetId];
	if (binding !== void 0 && (binding.provider !== parsed.provider || binding.model !== parsed.model)) throw new ModelManagerError(`portrait binding '${targetId}' does not match its provider/model identity`, "INVALID_MODEL_PORTRAIT_BINDING");
	return {
		kind: "llm",
		id: targetId,
		provider: parsed.provider,
		model: parsed.model,
		portrait: binding?.portrait,
		storagePath: ["portraits", targetId],
		declared: {
			kind: "llm",
			input: info.inputModalities ?? [],
			output: ["text"],
			contextWindow: info.context?.contextWindow,
			maxTokens: info.defaultMaxTokens,
			reasoningEfforts: info.reasoning?.efforts.map((effort) => effort.id) ?? []
		},
		info
	};
}
//#endregion
//#region lib/types/portraits/service.js
async function upsertModelPortrait(ctx, input) {
	const target = await resolvePortraitTarget(ctx, input.id);
	const portrait = normalizePortrait(input.portrait);
	await mutatePortraitSettings(ctx, [{
		op: "set",
		path: [...target.storagePath],
		value: target.kind === "task" ? portrait : {
			kind: "llm",
			provider: target.provider,
			model: target.model,
			portrait
		}
	}]);
	return {
		id: target.id,
		kind: target.kind,
		portrait,
		structurallyValidated: true,
		automaticallyValidated: true,
		next: `Call validate_model_portrait for '${target.id}'.`
	};
}
async function getModelPortrait(ctx, input, events) {
	const target = await resolvePortraitTarget(ctx, input.id);
	const visiblePortrait = target.portrait === void 0 ? void 0 : input.includeEvidence === false ? {
		...target.portrait,
		evidence: void 0
	} : target.portrait;
	return {
		id: target.id,
		kind: target.kind,
		provider: target.kind === "task" ? target.route.connection.provider : target.provider,
		model: target.kind === "task" ? target.route.registration.model : target.model,
		declared: target.declared,
		portrait: visiblePortrait,
		...input.includeUsage === true ? { observed: summarizeModelUsage({ id: target.id }, events) } : {}
	};
}
//#endregion
//#region lib/types/portraits/validation.js
function validationState(checks) {
	return checks.some((check) => check.status === "fail") ? "invalid" : checks.some((check) => check.status === "warn") ? "partial" : "valid";
}
async function validateModelPortrait(ctx, input, signal) {
	const target = await resolvePortraitTarget(ctx, input.id, signal);
	const portrait = target.portrait;
	if (portrait === void 0) throw new ModelManagerError(`model '${target.id}' has no portrait`, "MODEL_PORTRAIT_MISSING");
	const checks = [...portraitChecks(portrait)];
	if (target.kind === "llm") {
		const routeView = (await listModelRoutes(ctx, {
			provider: target.provider,
			includeModels: false
		})).providers[0];
		const credentialConfigured = routeView?.credential?.configured !== false;
		checks.push({
			id: "registration.llm-route",
			status: "pass",
			message: `LLM route '${target.provider}/${target.model}' resolves through its installed adapter`
		});
		checks.push({
			id: "registration.modalities",
			status: (target.info.inputModalities?.length ?? 0) > 0 ? "pass" : "warn",
			message: (target.info.inputModalities?.length ?? 0) > 0 ? "input modalities are declared by the LLM adapter" : "input modalities are unknown"
		});
		checks.push({
			id: "runtime.credentials",
			status: credentialConfigured ? "pass" : "warn",
			message: routeView?.credential === void 0 ? "provider adapter does not expose a credential reference" : credentialConfigured ? "provider credential reference is configured" : "provider credential reference is not configured"
		});
		if (input.liveProbe === true) checks.push({
			id: "runtime.live-probe",
			status: "warn",
			message: "LLM portrait validation does not create a paid synthetic turn; normal Harness calls are observed automatically."
		});
		const validated = {
			...portrait,
			validation: {
				state: validationState(checks),
				checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
				checks
			}
		};
		await mutatePortraitSettings(ctx, [{
			op: "set",
			path: [...target.storagePath],
			value: {
				kind: "llm",
				provider: target.provider,
				model: target.model,
				portrait: validated
			}
		}]);
		return {
			id: target.id,
			kind: "llm",
			validation: validated.validation,
			callable: routeView?.status === "live" && credentialConfigured
		};
	}
	const route = target.route;
	checks.push({
		id: "registration.modalities",
		status: route.registration.input.length > 0 && route.registration.output.length > 0 ? "pass" : "fail",
		message: route.registration.input.length > 0 && route.registration.output.length > 0 ? "input and output modalities are declared" : "input or output modalities are missing"
	});
	checks.push({
		id: "registration.capabilities",
		status: (route.registration.capabilities?.length ?? 0) > 0 ? "pass" : "warn",
		message: (route.registration.capabilities?.length ?? 0) > 0 ? "cross-provider capabilities are declared" : "capabilities are missing"
	});
	const allRefs = {
		...route.connection.credentialRef === void 0 ? {} : { default: route.connection.credentialRef },
		...route.connection.credentialRefs ?? {}
	};
	const selected = route.registration.credentialNames === void 0 ? void 0 : new Set(route.registration.credentialNames);
	const refs = Object.entries(allRefs).filter(([name]) => selected === void 0 || selected.has(name)).map(([, ref]) => ref);
	const statuses = await Promise.all(refs.map((ref) => ctx.credentials.describe(credentialRef(ref))));
	checks.push({
		id: "runtime.credentials",
		status: statuses.every((status) => status.configured) ? "pass" : "warn",
		message: statuses.every((status) => status.configured) ? "all credential references are configured" : "one or more credential references are not configured"
	});
	const adapterAvailable = ctx.taskModelRuntime.hasAdapter(route.registration.runtimeAdapter, route);
	checks.push({
		id: "runtime.adapter",
		status: adapterAvailable ? "pass" : "warn",
		message: adapterAvailable ? `runtime adapter '${route.registration.runtimeAdapter}' is available` : `runtime adapter '${route.registration.runtimeAdapter ?? "undeclared"}' is unavailable`
	});
	if (input.liveProbe === true) try {
		const probe = await ctx.taskModelRuntime.probe(route, signal);
		checks.push({
			id: "runtime.live-probe",
			status: probe.ok ? "pass" : "fail",
			message: probe.message
		});
	} catch (error) {
		checks.push({
			id: "runtime.live-probe",
			status: "fail",
			message: error instanceof Error ? error.message : "live probe failed"
		});
	}
	const validated = {
		...portrait,
		validation: {
			state: validationState(checks),
			checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
			checks
		}
	};
	await mutatePortraitSettings(ctx, [{
		op: "set",
		path: [...target.storagePath],
		value: validated
	}]);
	return {
		id: target.id,
		kind: "task",
		validation: validated.validation,
		callable: route.registration.enabled !== false && adapterAvailable && statuses.every((status) => status.configured)
	};
}
//#endregion
//#region lib/types/portraits/workflow.js
async function prepareModelPortraits(ctx, input, signal) {
	const config = portraitRegistry(ctx);
	const requested = input.ids === void 0 ? void 0 : new Set(input.ids.map((id) => id.trim()).filter(Boolean));
	const candidates = [];
	for (const [id, registration] of Object.entries(config.models)) {
		if (requested !== void 0 && !requested.has(id)) continue;
		if (requested === void 0 && input.includeDisabled !== true && registration.enabled === false) continue;
		candidates.push({
			id,
			kind: "task",
			provider: config.connections[registration.connection]?.provider,
			model: registration.model,
			displayName: registration.displayName,
			declared: {
				task: registration.task,
				input: registration.input,
				output: registration.output,
				execution: registration.execution,
				capabilities: registration.capabilities ?? []
			},
			portraitState: registration.portrait?.validation.state ?? "missing",
			needsInitialPortrait: registration.portrait === void 0 || registration.portrait.validation.state !== "valid"
		});
	}
	const warnings = [];
	for (const provider of ctx.llm.listProviders()) try {
		for (const model of await ctx.llm.listModels(provider.id)) {
			const id = llmTargetId(provider.id, model.id);
			if (requested !== void 0 && !requested.has(id)) continue;
			const portrait = config.portraits?.[id]?.portrait;
			candidates.push({
				id,
				kind: "llm",
				provider: provider.id,
				model: model.id,
				displayName: model.name,
				declared: {
					input: model.inputModalities ?? [],
					output: ["text"]
				},
				portraitState: portrait?.validation.state ?? "missing",
				needsInitialPortrait: portrait === void 0 || portrait.validation.state !== "valid"
			});
		}
	} catch (error) {
		warnings.push(`${provider.id}: ${error instanceof Error ? error.message : "model catalog unavailable"}`);
	}
	if (requested !== void 0) {
		const found = new Set(candidates.map((candidate) => candidate.id));
		const unknown = [...requested].filter((id) => !found.has(id));
		if (unknown.length > 0) throw new ModelManagerError(`unknown portrait targets: ${unknown.join(", ")}`, "UNKNOWN_MODEL_PORTRAIT_TARGET");
	}
	return {
		activation: "When the user says “整理初始画像”, “建立模型画像”, or equivalent, infer the intended models from the immediately preceding registration/discovery context and execute this workflow without asking the user to enumerate portrait fields or tool names.",
		candidates: requested === void 0 ? candidates.filter((candidate) => candidate.needsInitialPortrait === true) : candidates,
		ontology: {
			identity: [
				"canonical target id",
				"provider",
				"provider model id",
				"display name"
			],
			interface: [
				"input modalities and formats",
				"output modalities and formats",
				"context/output limits",
				"execution mode",
				"capabilities and operations"
			],
			commercial: [
				"effective-dated rates",
				"billing unit",
				"currency",
				"tiers and caveats"
			],
			routing: ["one sectioned Markdown description", "normalized qualityScores"],
			performance: [
				"explicit reachability probe",
				"time to first token",
				"total latency",
				"throughput and measurement context"
			],
			provenance: [
				"source URL/reference",
				"source kind",
				"observedAt",
				"supported claims and limitations"
			],
			validation: [
				"registration and modalities",
				"evidence links",
				"credential/adapter availability where applicable",
				"state and checks"
			],
			observations: [
				"call counts",
				"success/failure",
				"latency percentiles",
				"token usage",
				"estimated cost"
			]
		},
		workflow: [
			"Use authoritative current provider documentation for identity, modalities, limits, capabilities, and prices; do not guess missing facts.",
			"Keep provider claims, external benchmarks, runtime probes, and observed usage as distinct evidence kinds with observation dates.",
			"Build a complete portrait for each candidate and call upsert_model_portrait.",
			"Immediately call validate_model_portrait with liveProbe=false; only perform a paid/provider-traffic probe with explicit user approval.",
			"Use summarize_model_usage to incorporate native Harness LLM observations and task-model invocation observations; never copy request or response content into the portrait."
		],
		warnings,
		signalAborted: signal?.aborted === true
	};
}
//#endregion
//#region lib/types/tools.js
function asJsonValue(value) {
	return JSON.parse(JSON.stringify(value));
}
const jsonOutput = {
	schema: { type: "json" },
	render: (_args, value) => [{
		type: "text",
		text: JSON.stringify(value, null, 2)
	}]
};
const modelProfileSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		id: {
			type: "string",
			required: true,
			description: "Exact model id accepted by the provider endpoint."
		},
		name: {
			type: "string",
			description: "Human-readable model name."
		},
		contextWindow: {
			type: "integer",
			description: "Maximum combined context in tokens."
		},
		maxTokens: {
			type: "integer",
			description: "Maximum output tokens."
		},
		input: {
			type: "array",
			items: {
				type: "string",
				enum: ["text", "image"]
			},
			description: "Accepted request modalities."
		}
	}
};
const portraitSchema = {
	type: "object",
	additionalProperties: false,
	properties: {
		summary: {
			type: "string",
			description: "Concise model summary."
		},
		specialties: {
			type: "array",
			items: { type: "string" },
			description: "Tasks or domains where the model is strong."
		},
		limitations: {
			type: "array",
			items: { type: "string" },
			description: "Known limitations."
		},
		bestFor: {
			type: "array",
			items: { type: "string" },
			description: "Positive routing intents."
		},
		avoidFor: {
			type: "array",
			items: { type: "string" },
			description: "Negative routing intents."
		},
		pricing: {
			type: "object",
			additionalProperties: false,
			properties: {
				rates: {
					type: "array",
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							operation: {
								type: "string",
								required: true,
								description: "Billed operation."
							},
							unit: {
								type: "string",
								required: true,
								description: "Provider billing unit, for example 1m-input-tokens, image, minute, or request."
							},
							amount: {
								type: "number",
								required: true,
								description: "Non-negative price for one unit."
							},
							currency: {
								type: "string",
								required: true,
								description: "ISO-style currency code such as USD or CNY."
							},
							tier: {
								type: "string",
								description: "Optional provider pricing tier."
							},
							effectiveFrom: {
								type: "string",
								description: "Optional ISO effective date/time."
							},
							effectiveTo: {
								type: "string",
								description: "Optional ISO expiry date/time."
							},
							evidenceId: {
								type: "string",
								description: "Evidence record supporting this price."
							}
						}
					},
					description: "Effective-dated provider price rates."
				},
				notes: {
					type: "string",
					description: "Pricing caveats."
				}
			}
		},
		performance: {
			type: "object",
			additionalProperties: false,
			properties: {
				speedClass: {
					type: "string",
					enum: [
						"instant",
						"fast",
						"balanced",
						"slow",
						"async"
					],
					description: "Coarse speed class."
				},
				typicalLatencyMs: {
					type: "object",
					additionalProperties: false,
					properties: {
						min: {
							type: "number",
							required: true,
							description: "Typical lower latency bound."
						},
						max: {
							type: "number",
							required: true,
							description: "Typical upper latency bound."
						}
					},
					description: "Evidence-backed typical latency range."
				},
				throughputPerMinute: {
					type: "number",
					description: "Observed or documented throughput per minute."
				},
				notes: {
					type: "string",
					description: "Performance measurement context."
				}
			}
		},
		qualityScores: {
			type: "object",
			additionalProperties: true,
			description: "Router criteria mapped to normalized 0..1 scores."
		},
		evidence: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: {
						type: "string",
						required: true,
						description: "Stable evidence id."
					},
					kind: {
						type: "string",
						required: true,
						enum: [
							"provider-doc",
							"benchmark",
							"runtime-probe",
							"usage",
							"manual"
						],
						description: "Evidence source class."
					},
					source: {
						type: "string",
						required: true,
						description: "Source URL or stable local reference."
					},
					observedAt: {
						type: "string",
						required: true,
						description: "ISO date/time when this evidence was observed."
					},
					claims: {
						type: "array",
						required: true,
						items: { type: "string" },
						description: "Claims supported by this evidence."
					},
					notes: {
						type: "string",
						description: "Optional limitations or measurement context."
					}
				}
			},
			description: "Evidence supporting price, performance, and assessment claims."
		}
	}
};
function modelManagerTools(ctx) {
	return [
		defineTool({
			name: LIST_MODEL_ROUTES_SURFACE.name,
			description: LIST_MODEL_ROUTES_SURFACE.description,
			parameters: {
				provider: {
					type: "string",
					description: LIST_MODEL_ROUTES_SURFACE.parameters.provider
				},
				includeDormant: {
					type: "boolean",
					description: LIST_MODEL_ROUTES_SURFACE.parameters.includeDormant
				},
				includeModels: {
					type: "boolean",
					description: LIST_MODEL_ROUTES_SURFACE.parameters.includeModels
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await listModelRoutes(ctx, args))
		}),
		defineTool({
			name: CONFIGURE_MODEL_ROUTE_SURFACE.name,
			description: CONFIGURE_MODEL_ROUTE_SURFACE.description,
			parameters: {
				provider: {
					type: "string",
					required: true,
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.provider
				},
				apiKeyEnv: {
					type: "string",
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.apiKeyEnv
				},
				displayName: {
					type: "string",
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.displayName
				},
				api: {
					type: "string",
					enum: [
						"openai-completions",
						"openai-responses",
						"anthropic-messages"
					],
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.api
				},
				baseURL: {
					type: "string",
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.baseURL
				},
				models: {
					type: "array",
					items: modelProfileSchema,
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.models
				},
				defaultContextWindow: {
					type: "integer",
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.defaultContextWindow
				},
				defaultMaxTokens: {
					type: "integer",
					description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.defaultMaxTokens
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await configureModelRoute(ctx, args))
		}),
		defineTool({
			name: INSPECT_VOLCENGINE_PROVIDER_SURFACE.name,
			description: INSPECT_VOLCENGINE_PROVIDER_SURFACE.description,
			parameters: {},
			output: jsonOutput,
			execute: async (_args, exec) => asJsonValue(await inspectVolcengineProvider(ctx, exec.signal))
		}),
		defineTool({
			name: SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE.name,
			description: SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE.description,
			parameters: { models: {
				type: "array",
				required: true,
				items: modelProfileSchema,
				description: SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE.parameters.models
			} },
			output: jsonOutput,
			execute: async (args) => asJsonValue(await selectVolcengineLanguageModels(ctx, args))
		}),
		defineTool({
			name: LIST_TASK_MODELS_SURFACE.name,
			description: LIST_TASK_MODELS_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					description: LIST_TASK_MODELS_SURFACE.parameters.id
				},
				provider: {
					type: "string",
					description: LIST_TASK_MODELS_SURFACE.parameters.provider
				},
				task: {
					type: "string",
					enum: TASK_MODEL_TASKS,
					description: LIST_TASK_MODELS_SURFACE.parameters.task
				},
				includeProfile: {
					type: "boolean",
					description: LIST_TASK_MODELS_SURFACE.parameters.includeProfile
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await listTaskModels(ctx, args))
		}),
		defineTool({
			name: DISCOVER_TASK_MODELS_SURFACE.name,
			description: DISCOVER_TASK_MODELS_SURFACE.description,
			parameters: { connection: {
				type: "string",
				required: true,
				description: DISCOVER_TASK_MODELS_SURFACE.parameters.connection
			} },
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(await discoverTaskModels(ctx, args, exec.signal))
		}),
		defineTool({
			name: SELECT_TASK_MODELS_SURFACE.name,
			description: SELECT_TASK_MODELS_SURFACE.description,
			parameters: {
				connection: {
					type: "string",
					required: true,
					description: SELECT_TASK_MODELS_SURFACE.parameters.connection
				},
				ids: {
					type: "array",
					required: true,
					items: { type: "string" },
					description: SELECT_TASK_MODELS_SURFACE.parameters.ids
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await selectTaskModels(ctx, args))
		}),
		defineTool({
			name: REGISTER_TASK_MODEL_SURFACE.name,
			description: REGISTER_TASK_MODEL_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					required: true,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.id
				},
				connection: {
					type: "string",
					required: true,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.connection
				},
				provider: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.provider
				},
				connectionDisplayName: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.connectionDisplayName
				},
				credentialRef: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.credentialRef
				},
				credentialRefs: {
					type: "object",
					additionalProperties: true,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.credentialRefs
				},
				baseURL: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.baseURL
				},
				catalogEndpoint: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.catalogEndpoint
				},
				catalogCredentialName: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.catalogCredentialName
				},
				connectionProfile: {
					type: "object",
					additionalProperties: true,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.connectionProfile
				},
				model: {
					type: "string",
					required: true,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.model
				},
				displayName: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.displayName
				},
				task: {
					type: "string",
					required: true,
					enum: TASK_MODEL_TASKS,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.task
				},
				runtimeAdapter: {
					type: "string",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.runtimeAdapter
				},
				enabled: {
					type: "boolean",
					description: REGISTER_TASK_MODEL_SURFACE.parameters.enabled
				},
				credentialNames: {
					type: "array",
					items: { type: "string" },
					description: REGISTER_TASK_MODEL_SURFACE.parameters.credentialNames
				},
				input: {
					type: "array",
					items: {
						type: "string",
						enum: MODEL_MODALITIES
					},
					description: "Accepted modalities; sensible task defaults are used when omitted."
				},
				output: {
					type: "array",
					items: {
						type: "string",
						enum: MODEL_MODALITIES
					},
					description: "Produced modalities or data shapes; sensible task defaults are used when omitted."
				},
				execution: {
					type: "string",
					enum: MODEL_EXECUTION_MODES,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.execution
				},
				capabilities: {
					type: "array",
					items: {
						type: "string",
						enum: TASK_MODEL_CAPABILITIES
					},
					description: REGISTER_TASK_MODEL_SURFACE.parameters.capabilities
				},
				operations: {
					type: "array",
					items: { type: "string" },
					description: "Supported operations, for example generate, edit, transcribe, or synthesize."
				},
				roles: {
					type: "array",
					items: { type: "string" },
					description: "Routing roles such as image-generator or speech-to-text."
				},
				profile: {
					type: "object",
					additionalProperties: true,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.profile
				},
				portrait: {
					...portraitSchema,
					description: REGISTER_TASK_MODEL_SURFACE.parameters.portrait
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await registerTaskModel(ctx, args))
		}),
		defineTool({
			name: PREPARE_MODEL_PORTRAITS_SURFACE.name,
			description: PREPARE_MODEL_PORTRAITS_SURFACE.description,
			parameters: {
				ids: {
					type: "array",
					items: { type: "string" },
					description: PREPARE_MODEL_PORTRAITS_SURFACE.parameters.ids
				},
				includeDisabled: {
					type: "boolean",
					description: PREPARE_MODEL_PORTRAITS_SURFACE.parameters.includeDisabled
				}
			},
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(await prepareModelPortraits(ctx, args, exec.signal))
		}),
		defineTool({
			name: GET_MODEL_PORTRAIT_SURFACE.name,
			description: GET_MODEL_PORTRAIT_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					required: true,
					description: GET_MODEL_PORTRAIT_SURFACE.parameters.id
				},
				includeEvidence: {
					type: "boolean",
					description: GET_MODEL_PORTRAIT_SURFACE.parameters.includeEvidence
				},
				includeUsage: {
					type: "boolean",
					description: GET_MODEL_PORTRAIT_SURFACE.parameters.includeUsage
				}
			},
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(await getModelPortrait(ctx, args, exec.agent?.session.events))
		}),
		defineTool({
			name: UPSERT_MODEL_PORTRAIT_SURFACE.name,
			description: UPSERT_MODEL_PORTRAIT_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					required: true,
					description: UPSERT_MODEL_PORTRAIT_SURFACE.parameters.id
				},
				portrait: {
					...portraitSchema,
					required: true,
					description: UPSERT_MODEL_PORTRAIT_SURFACE.parameters.portrait
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await upsertModelPortrait(ctx, args))
		}),
		defineTool({
			name: VALIDATE_MODEL_PORTRAIT_SURFACE.name,
			description: VALIDATE_MODEL_PORTRAIT_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					required: true,
					description: VALIDATE_MODEL_PORTRAIT_SURFACE.parameters.id
				},
				liveProbe: {
					type: "boolean",
					description: VALIDATE_MODEL_PORTRAIT_SURFACE.parameters.liveProbe
				}
			},
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(await validateModelPortrait(ctx, args, exec.signal))
		}),
		defineTool({
			name: INVOKE_TASK_MODEL_SURFACE.name,
			description: INVOKE_TASK_MODEL_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					required: true,
					description: INVOKE_TASK_MODEL_SURFACE.parameters.id
				},
				operation: {
					type: "string",
					required: true,
					description: INVOKE_TASK_MODEL_SURFACE.parameters.operation
				},
				request: {
					type: "object",
					required: true,
					additionalProperties: true,
					description: INVOKE_TASK_MODEL_SURFACE.parameters.request
				}
			},
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(await invokeTaskModel(ctx, args, exec))
		}),
		defineTool({
			name: SUMMARIZE_MODEL_USAGE_SURFACE.name,
			description: SUMMARIZE_MODEL_USAGE_SURFACE.description,
			parameters: { id: {
				type: "string",
				description: SUMMARIZE_MODEL_USAGE_SURFACE.parameters.id
			} },
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(summarizeModelUsage(args, exec.agent?.session.events))
		}),
		defineTool({
			name: SELECT_DEFAULT_MODEL_SURFACE.name,
			description: SELECT_DEFAULT_MODEL_SURFACE.description,
			parameters: {
				provider: {
					type: "string",
					required: true,
					description: SELECT_DEFAULT_MODEL_SURFACE.parameters.provider
				},
				model: {
					type: "string",
					required: true,
					description: SELECT_DEFAULT_MODEL_SURFACE.parameters.model
				},
				reasoningEffort: {
					type: "string",
					description: SELECT_DEFAULT_MODEL_SURFACE.parameters.reasoningEffort
				}
			},
			output: jsonOutput,
			execute: async (args, exec) => asJsonValue(await selectDefaultModel(ctx, args, exec.signal))
		})
	];
}
//#endregion
//#region lib/types/probe-route.js
function sendJson(res, status, value) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(value));
}
async function readJson(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		size += bytes.length;
		if (size > 16384) throw new Error("request body is too large");
		chunks.push(bytes);
	}
	const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("request must be an object");
	return parsed;
}
function routeId(value, name) {
	if (typeof value !== "string" || !/^[A-Za-z0-9._:/-]{1,180}$/.test(value)) throw new Error(`${name} is invalid`);
	return value;
}
/** Mount the explicit, minimally billed per-model availability/latency probe. */
function registerModelProbeRoute(ctx) {
	ctx.inject(["webServer"], (scope) => {
		scope.webServer.register({
			kind: "exact",
			path: "/dsh-multi-model-provider/probe",
			handler: async (req, res) => {
				if (req.method !== "POST") {
					res.writeHead(405, { allow: "POST" });
					res.end();
					return;
				}
				if (req.headers["x-dsh-model-probe"] !== "1") {
					sendJson(res, 403, {
						ok: false,
						error: "missing model probe request marker"
					});
					return;
				}
				try {
					const body = await readJson(req);
					const provider = routeId(body.provider, "provider");
					const model = routeId(body.model, "model");
					await scope.llm.resolveModelInfo(provider, model);
					const started = performance.now();
					let firstTokenAt;
					let finish;
					const signal = AbortSignal.timeout(2e4);
					for await (const chunk of scope.llm.stream({
						provider,
						model,
						messages: [createUserMessage({
							content: [{
								type: "text",
								text: "Reply with OK."
							}],
							source: {
								kind: "plugin",
								plugin: "multi-model-provider"
							}
						})],
						maxTokens: 8,
						signal
					})) {
						if (firstTokenAt === void 0 && (chunk.type === "text-delta" || chunk.type === "reasoning-delta")) firstTokenAt = performance.now();
						if (chunk.type === "finish") finish = chunk.reason.kind;
					}
					const ended = performance.now();
					if (finish === "error" || finish === "aborted") throw new Error(`model probe ended with ${finish}`);
					sendJson(res, 200, {
						ok: true,
						provider,
						model,
						observedAt: (/* @__PURE__ */ new Date()).toISOString(),
						latencyMs: Math.round(ended - started),
						...firstTokenAt === void 0 ? {} : { timeToFirstTokenMs: Math.round(firstTokenAt - started) }
					});
				} catch (error) {
					sendJson(res, 502, {
						ok: false,
						error: error instanceof Error ? error.message : String(error)
					});
				}
			}
		});
	});
}
//#endregion
//#region lib/types/index.js
const name = "multi-model-provider";
const inject = [
	"llm",
	"settings",
	"credentials",
	"agentDefaultModel",
	"tools",
	"systemPrompt"
];
function apply(ctx) {
	if (ctx.llm.listConfigurableProviders().find((entry) => entry.provider === "volcengine") === void 0) ctx.llm.registerConfigurableProviders([{
		provider: "volcengine",
		displayName: "火山方舟",
		settingsNs: "llm-pi-ai",
		settingsPath: ["providers", "volcengine"],
		profileDefaults: {
			displayName: "火山方舟",
			apiKeyEnv: "ARK_API_KEY",
			api: "openai-responses",
			baseURL: VOLCENGINE_ARK_BASE_URL
		},
		declared: true
	}]);
	new TaskModelRuntime(ctx);
	registerTaskModelSettings(ctx);
	registerModelProbeRoute(ctx);
	for (const tool of modelManagerTools(ctx)) ctx.tools.register(tool);
	ctx.systemPrompt.section({
		name: "tool:multi-model-provider",
		order: 170,
		text: `${MODEL_MANAGER_GUIDANCE}\n\n${HELP}`
	});
}
//#endregion
export { BUILTIN_TASK_MODEL_REGISTRY, CONFIGURE_MODEL_ROUTE_SURFACE, DISCOVER_TASK_MODELS_SURFACE, GET_MODEL_PORTRAIT_SURFACE, HELP, INSPECT_VOLCENGINE_PROVIDER_SURFACE, INVOKE_TASK_MODEL_SURFACE, LIST_MODEL_ROUTES_SURFACE, LIST_TASK_MODELS_SURFACE, MODEL_EXECUTION_MODES, MODEL_MANAGER_GUIDANCE, MODEL_MANAGER_TOOL_SURFACES, MODEL_MODALITIES, ModelManagerError, PI_AI_SETTINGS_NAMESPACE, PREPARE_MODEL_PORTRAITS_SURFACE, REGISTER_TASK_MODEL_SURFACE, SELECT_DEFAULT_MODEL_SURFACE, SELECT_TASK_MODELS_SURFACE, SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE, SUMMARIZE_MODEL_USAGE_SURFACE, TASK_MODEL_CAPABILITIES, TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE, TASK_MODEL_TASKS, TOOL_NAMES, TaskModelRuntime, UPSERT_MODEL_PORTRAIT_SURFACE, VALIDATE_MODEL_PORTRAIT_SURFACE, VERSION, VOLCENGINE_ARK_API, VOLCENGINE_ARK_BASE_URL, VOLCENGINE_PROVIDER, apply, configureModelRoute, discoverTaskModels, getModelPortrait, initialPortrait, inject, inspectVolcengineProvider, invokeTaskModel, listModelRoutes, listTaskModels, llmObservations, modelManagerTools, mutatePortraitSettings, name, normalizePortrait, portraitChecks, portraitRegistry, portraitSettings, prepareModelPortraits, recordTaskModelObservation, registerTaskModel, registerTaskModelSettings, resolvePortraitTarget, resolveTaskModelRoute, selectDefaultModel, selectTaskModels, selectVolcengineLanguageModels, summarizeModelUsage, taskModelObservations, upsertModelPortrait, validateModelPortrait, validateTaskModelRegistry };
