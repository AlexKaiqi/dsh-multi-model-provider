import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { HarnessError, ReasoningEffortId, createUserMessage } from "@deepseek-ai/dsh-llm";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "@deepseek-ai/schemastery";
import { Service } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region lib/types/model/guidance.js
/** Stable model-visible capability summary; secrets deliberately stay outside this surface. */
const MODEL_MANAGER_GUIDANCE = `This plugin has three capabilities. First, register models: use list_model_routes and configure_model_route for primary language/chat models; llm-pi-ai remains their runtime and source of truth. Use list_task_models and register_task_model for image, speech, audio, video, realtime, embedding, and reranking catalog entries. Use discover_task_models for a generic authenticated task connection catalog. Use select_task_models to replace the enabled task set, and preserve [] as all disabled without fallback. Second, assist with portraits: prepare_model_portraits, ingest_portrait_research, get_model_portrait, upsert_model_portrait, validate_model_portrait, and summarize_model_usage. Third, select the Agent (primary) language model with select_default_model from the registered live language catalog; never pick a task model.

VOLCENGINE PROVIDER AUTONOMY: Fire Volcano Ark and Doubao Speech are two separate providers in the Models UI: provider=volcengine owns Ark language/VLM routes, while provider=doubao-speech owns Realtime speech. The user must not need to know YAML, endpoint URLs, tool names, or registry ownership. Whenever the user asks about 火山、方舟、豆包, available models, configuration, registration, or invocation, immediately call inspect_volcengine_provider. Stable provider facts are built in: Ark uses the official https://ark.cn-beijing.volces.com/api/v3 Responses endpoint and secure ARK_API_KEY; Doubao Realtime Duplex uses wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue and secure DOUBAO_API_KEY. Current account availability is not a static fact: inspect_volcengine_provider must query the authenticated Ark /models catalog and report credential state, selected language/VLM models, registered speech routes, and callability. Never invent a catalog or ask the user to paste a key into chat. After the user chooses language/VLM candidates, call select_volcengine_language_models with complete profiles; [] explicitly disables every Volcengine LLM route without fallback. Language/VLM models are used through the normal Agent model selector. Image/video/audio/speech/embedding routes belong to the task registry and may be invoked only through invoke_task_model when list_task_models says callable. A Platform deployment may require its exact ep-* endpoint id as the model id. Discovery never changes registration or selection by itself.

MODEL PORTRAIT AUTONOMY: The user only needs to state a short intent such as “整理初始画像”, “建立模型画像”, or “完善这些模型的画像”. Do not ask the user to enumerate fields, define the schema, or name tools. Immediately call prepare_model_portraits. Infer ids from models just registered, discovered, selected, or discussed; when recent context does not narrow them, use the tool's enabled candidates whose portraits are missing, partial, invalid, stale, or unvalidated. A portrait covers identity/provider model id; input and output modalities/formats; context and output limits; capabilities, operations, and execution mode; one sectioned Markdown description for qualitative routing knowledge; effective-dated price, currency, units, tiers, and caveats; normalized routing quality scores; measured speed, latency, throughput, and measurement context; evidence provenance and observation date; validation state; and separate observed usage. Use seed facts as-is, open the suggested official documentation, call ingest_portrait_research with http(s) source URLs, never guess unknown facts, never copy documentation latency into lastProbe, distinguish provider claims from benchmarks, probes, and usage, and immediately call validate_model_portrait with liveProbe=false. A live probe may create provider traffic or cost and therefore requires explicit user approval.

get_model_portrait supports both task route ids and llm:<provider>/<model> ids. Usage collection is automatic: ordinary LLM turns already persist native request/header, step/start, and assistant/message.usage events, while invoke_task_model appends privacy-safe multi-model/invocation events. summarize_model_usage aggregates those current-session events into counts, outcome, latency, tokens, and cost metadata. Never copy prompts, responses, media, or credentials into observations or portraits. Invoke non-language routes only with invoke_task_model after list_task_models reports callable. A task-model registration is metadata only until a compatible runtime adapter is installed, so never describe registered-only routes as callable; disabled routes also cannot be invoked. This plugin does not ship runtime adapters; its built-in catalog starts registered-only. Use select_default_model only for the primary language model used by newly created Agents, and only when list_model_routes shows that live language model in the catalog. Never ask the user to paste an API key into chat or place a secret in tool arguments or ordinary settings. Registration tools store only credential references; direct the user to the secure Settings credential field when a reference is not configured.`;
//#endregion
//#region lib/types/model/tool-surfaces.js
/**
* Model-visible surfaces of the sixteen model-management tools.
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
	description: "Create or update a non-language task-model registration and its reusable connection profile. Use it for image, speech, audio, video, embedding, reranking, and realtime routes; run list_task_models first to see what is already registered. Do not use it for language/chat models, which must go through configure_model_route so llm-pi-ai stays authoritative, and never describe a route registered this way as callable until a compatible runtime adapter is installed. It stores catalog metadata and credential references only and never accepts an API key value or another secret value.",
	parameters: {
		id: "Stable route id, for example openai/gpt-image-2.",
		connection: "Reusable connection id, for example openai.",
		provider: "Provider family; required when creating a new connection.",
		connectionDisplayName: "Human-readable connection name.",
		credentialRef: `Legacy single credential reference such as OPENAI_API_KEY. ${NEVER_A_SECRET}`,
		credentialRefs: `Named credential references for providers that require multiple credential slots. Values are reference names, not secrets. ${NEVER_A_SECRET}`,
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
	description: "Start the portrait-research workflow for registered LLM and task models. Use it immediately when the user says “整理初始画像”, “建立模型画像”, or equivalent—even if they do not list fields or tool steps—and infer model ids from the immediately preceding registration or discovery context. It returns seed facts, gaps, official documentation URLs, and the ingest/validate sequence. Do not use it to invent undocumented facts, write lastProbe from documentation, perform paid probes without approval, or ask the user to restate the portrait schema.",
	parameters: {
		ids: "Optional exact task route ids or LLM ids in llm:<provider>/<model> form. Infer these from recent context when possible; omit to find enabled models with missing or non-valid portraits.",
		includeDisabled: "Include disabled task routes when ids are omitted; defaults to false."
	},
	helpPointer: "prepare_model_portraits"
};
const INGEST_PORTRAIT_RESEARCH_SURFACE = {
	name: "ingest_portrait_research",
	description: "Merge Agent-researched portrait facts into a registered model after opening official documentation. Use it after prepare_model_portraits when prices, strengths, and limitations have http(s) source URLs. Do not use it to guess facts, write lastProbe from documentation, store secrets, or change registered input/output modalities.",
	parameters: {
		id: "Exact task-model route id, or llm:<provider>/<model> for a language model.",
		findings: "Researched non-secret facts. evidence is required; each source must be an http(s) URL; price rates must reference those evidence ids."
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
	description: "Validate and save the primary Agent language model from the registered live catalog. Use it when the user wants a different default going forward; run list_model_routes first to confirm the route is live and the model id is exact. Do not use it to switch the current session, which needs the session model selector, and do not use it for non-language task models.",
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
	INGEST_PORTRAIT_RESEARCH_SURFACE,
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
* This plugin has no CLI; its "commands" are the sixteen tools the model can call.
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
/** Discoverable summary of the tool set and the three plugin capabilities. */
const HELP = `multi-model-provider ${VERSION}

Three capabilities: register models, assist with portraits, and select the
Agent (primary) language model from that catalog. Language/chat models stay
owned by llm-pi-ai; non-language task models live in this plugin's catalog.

1. registration:
  list_model_routes        inspect routes, credential status, and model catalogs
  configure_model_route    create or update one llm-pi-ai provider profile
  inspect_volcengine_provider inspect Ark/Doubao credentials, live catalog, selections, and usage paths
  select_volcengine_language_models replace Ark language/VLM selection; [] disables all
  list_task_models         inspect registrations and whether they are callable
  discover_task_models     query an authenticated provider model catalog
  select_task_models       replace the enabled set; [] disables all
  register_task_model      create or update a registration and its connection

2. portraits:
  prepare_model_portraits  expand one short intent into seed facts, gaps, and a research plan
  ingest_portrait_research merge Agent-researched facts that have official source URLs
  get_model_portrait       inspect price, strengths, speed, I/O, and evidence
  upsert_model_portrait    save an evidence-backed model portrait
  validate_model_portrait  check registration, evidence, credentials, and adapter
  summarize_model_usage    aggregate current-session invocation observations

3. Agent model:
  select_default_model     save the default Agent language model from the live catalog

invoke_task_model executes one registered non-language operation through its
adapter. It is not Agent-model selection.

credentials:
  Registration tools accept only reference names such as OPENAI_API_KEY. A
  multi-credential provider may use named refs; Doubao Realtime uses the single
  DOUBAO_API_KEY reference. Tools never accept an API key value. When a reference is not configured, direct
  the user to the secure Settings credential field; never ask for a key in chat.

registration is not callability:
  A task-model registration is catalog metadata until a compatible runtime
  adapter is installed. list_task_models reports the two states separately.
  Disabled registrations remain inspectable but cannot be routed or invoked.
  This plugin does not ship runtime adapters. Built-in catalog entries such as
  openai/gpt-image-2 and Doubao speech start registered-only.

provider discovery and selection:
  Volcengine Ark and Doubao Speech are separate provider connections with
  separate protocols, catalogs, and API keys. Discovery is advisory and never
  auto-registers or auto-enables returned models. An empty enabled selection is
  preserved as all disabled; it never falls back to all models.

portrait workflow:
  “整理初始画像” is sufficient: the Agent calls prepare_model_portraits, opens the
  suggested official documentation, calls ingest_portrait_research with source URLs,
  and validates with liveProbe=false. lastProbe is measured, never copied from docs.
`;
//#endregion
//#region lib/types/operations.js
const PI_AI_SETTINGS_NAMESPACE = settingsNamespace("llm-pi-ai");
var ModelManagerError = class extends HarnessError {
	constructor(message, code, options) {
		super(message, code, options);
	}
};
function nonBlank$2(value, name) {
	const normalized = value.trim();
	if (normalized === "") throw new ModelManagerError(`${name} must not be blank`, "INVALID_MODEL_CONFIGURATION");
	return normalized;
}
function positiveInteger(value, name) {
	if (value === void 0) return void 0;
	if (!Number.isSafeInteger(value) || value <= 0) throw new ModelManagerError(`${name} must be a positive safe integer`, "INVALID_MODEL_CONFIGURATION");
	return value;
}
function optionalText$3(value) {
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
	const id = nonBlank$2(input.id, `models[${index}].id`);
	const name = optionalText$3(input.name);
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
	const apiKeyEnv = optionalText$3(input.apiKeyEnv);
	const displayName = optionalText$3(input.displayName);
	const baseURL = optionalText$3(input.baseURL);
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
	const provider = nonBlank$2(input.provider, "provider");
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
	const requestedProvider = optionalText$3(input.provider);
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
function optionalText$2(value, name) {
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
	const tier = optionalText$2(rate.tier, `pricing.rates[${index}].tier`);
	const effectiveFrom = optionalText$2(rate.effectiveFrom, `pricing.rates[${index}].effectiveFrom`);
	const effectiveTo = optionalText$2(rate.effectiveTo, `pricing.rates[${index}].effectiveTo`);
	const evidenceId = optionalText$2(rate.evidenceId, `pricing.rates[${index}].evidenceId`);
	return {
		operation: optionalText$2(rate.operation, `pricing.rates[${index}].operation`),
		unit: optionalText$2(rate.unit, `pricing.rates[${index}].unit`),
		amount: finiteNonNegative(rate.amount, `pricing.rates[${index}].amount`),
		currency: optionalText$2(rate.currency, `pricing.rates[${index}].currency`).toUpperCase(),
		...tier === void 0 ? {} : { tier },
		...effectiveFrom === void 0 ? {} : { effectiveFrom },
		...effectiveTo === void 0 ? {} : { effectiveTo },
		...evidenceId === void 0 ? {} : { evidenceId }
	};
}
function normalizeEvidence(item, index) {
	if (!EVIDENCE_KINDS.has(item.kind)) throw new ModelManagerError(`evidence[${index}].kind is unsupported`, "INVALID_MODEL_PORTRAIT");
	const observedAt = optionalText$2(item.observedAt, `evidence[${index}].observedAt`);
	if (Number.isNaN(Date.parse(observedAt))) throw new ModelManagerError(`evidence[${index}].observedAt must be an ISO date/time`, "INVALID_MODEL_PORTRAIT");
	return {
		id: optionalText$2(item.id, `evidence[${index}].id`),
		kind: item.kind,
		source: optionalText$2(item.source, `evidence[${index}].source`),
		observedAt,
		claims: stringList$1(item.claims, `evidence[${index}].claims`),
		...optionalText$2(item.notes, `evidence[${index}].notes`) === void 0 ? {} : { notes: item.notes.trim() }
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
		const normalized = optionalText$2(key, "qualityScores key");
		if (!Number.isFinite(value) || value < 0 || value > 1) throw new ModelManagerError(`qualityScores.${normalized} must be between 0 and 1`, "INVALID_MODEL_PORTRAIT");
		return [normalized, value];
	}));
	const draft = {
		schemaVersion: 1,
		...optionalText$2(input.description, "description") === void 0 ? {} : { description: input.description.trim() },
		...optionalText$2(input.summary, "summary") === void 0 ? {} : { summary: input.summary.trim() },
		specialties: stringList$1(input.specialties, "specialties"),
		limitations: stringList$1(input.limitations, "limitations"),
		bestFor: stringList$1(input.bestFor, "bestFor"),
		avoidFor: stringList$1(input.avoidFor, "avoidFor"),
		pricing: {
			rates: (input.pricing?.rates ?? []).map(normalizeRate),
			...optionalText$2(input.pricing?.notes, "pricing.notes") === void 0 ? {} : { notes: input.pricing.notes.trim() }
		},
		performance: {
			...speedClass === void 0 ? {} : { speedClass },
			...latency === void 0 ? {} : { typicalLatencyMs: {
				min: latency.min,
				max: latency.max
			} },
			...input.performance?.throughputPerMinute === void 0 ? {} : { throughputPerMinute: finiteNonNegative(input.performance.throughputPerMinute, "performance.throughputPerMinute") },
			...optionalText$2(input.performance?.notes, "performance.notes") === void 0 ? {} : { notes: input.performance.notes.trim() },
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
//#region lib/types/portraits/builtin-task.js
const OBSERVED_AT$1 = "2026-08-20T00:00:00.000Z";
const CURATED_TASK_MODEL_PORTRAIT_SELECTION = {
	observedAt: OBSERVED_AT$1,
	policy: "current-specialized-task-routes",
	providerCatalogs: [
		"https://developers.openai.com/api/docs/models",
		"https://ai.google.dev/gemini-api/docs/models",
		"https://www.minimax.io/blog/minimax-h3",
		"https://platform.minimax.io/docs/api-reference/api-overview",
		"https://platform.minimax.io/docs/guides/pricing-paygo"
	],
	rationale: "Represent materially different image, video, speech, and music routes as task models. Prefer current production models from major providers, retain legacy routes only when they remain callable and clearly mark them disabled, preserve input/output and execution boundaries, and never treat a task generator as an Agent LLM."
};
const SPECS$1 = [
	{
		provider: "google",
		model: "gemini-omni-flash-preview",
		task: "video-generation",
		description: "## Positioning\nGoogle’s current recommended default for fast video generation and conversational editing. It accepts multimodal context and supports iterative natural-language refinement through the Interactions API.\n\n## Routing\nUse for fast 720p creation, multi-input reasoning, or edit-and-refine workflows; use Veo 3.1 when native audio, 4K, last-frame control, or scene extension is required.",
		specialties: [
			"conversational video editing",
			"multi-input video generation",
			"character consistency",
			"fast iteration",
			"large multimodal context"
		],
		limitations: [
			"preview endpoint with a shorter stability horizon",
			"720p at 24 FPS",
			"3–10 second output",
			"paid tier only"
		],
		bestFor: [
			"iterative video editing",
			"rapid creative exploration",
			"multimodal reference composition"
		],
		avoidFor: [
			"4K delivery",
			"workflows requiring a stable model id",
			"native-audio-specific production"
		],
		speedClass: "fast",
		modelSource: "https://ai.google.dev/gemini-api/docs/models/gemini-omni-flash",
		additionalModelSources: ["https://ai.google.dev/gemini-api/docs/video"],
		pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
		rates: [{
			operation: "generate",
			unit: "output-video-second",
			amount: .1,
			currency: "USD",
			tier: "720p effective price"
		}],
		pricingNotes: "The effective video rate is derived by Google from $17.50/M output tokens at 5,792 tokens per second. Multimodal input is billed separately at $1.50/M tokens."
	},
	{
		provider: "google",
		model: "veo-3.1-generate-preview",
		task: "video-generation",
		description: "## Positioning\nGoogle’s current high-fidelity cinematic video model with native synchronized audio, 720p/1080p/4K output, scene extension, first/last-frame control, and image-based direction.\n\n## Routing\nUse for quality-first cinematic output and advanced creative control; use Fast or Lite for cost-sensitive volume, and Omni Flash for conversational editing.",
		specialties: [
			"cinematic video",
			"native synchronized audio",
			"4K output",
			"scene extension",
			"first-and-last-frame control"
		],
		limitations: [
			"preview endpoint with more restrictive rate limits",
			"8-second generation",
			"paid tier only",
			"higher per-second cost than Fast and Lite"
		],
		bestFor: [
			"quality-first campaigns",
			"cinematic shots",
			"frame-controlled video",
			"4K delivery"
		],
		avoidFor: ["cost-first bulk generation", "rapid conversational editing"],
		speedClass: "async",
		modelSource: "https://ai.google.dev/gemini-api/docs/models/veo-3.1-generate-preview",
		additionalModelSources: ["https://ai.google.dev/gemini-api/docs/video"],
		pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
		rates: [{
			operation: "generate",
			unit: "output-video-second",
			amount: .4,
			currency: "USD",
			tier: "720p or 1080p with audio"
		}, {
			operation: "generate",
			unit: "output-video-second",
			amount: .6,
			currency: "USD",
			tier: "4K with audio"
		}]
	},
	{
		provider: "google",
		model: "veo-3.1-fast-generate-preview",
		task: "video-generation",
		description: "## Positioning\nGoogle’s faster Veo 3.1 production route with native audio and 720p, 1080p, or 4K output.\n\n## Routing\nUse for ads, A/B variants, social content, and backend generation where Veo controls are useful but Standard pricing is unnecessary.",
		specialties: [
			"fast cinematic video",
			"native synchronized audio",
			"4K option",
			"creative variants",
			"production throughput"
		],
		limitations: [
			"preview endpoint",
			"paid tier only",
			"below Standard for quality-first routing"
		],
		bestFor: [
			"advertising variants",
			"social video",
			"high-volume generation"
		],
		avoidFor: ["maximum-fidelity hero shots", "lowest-cost 720p generation"],
		speedClass: "async",
		modelSource: "https://ai.google.dev/gemini-api/docs/video",
		pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
		rates: [
			{
				operation: "generate",
				unit: "output-video-second",
				amount: .1,
				currency: "USD",
				tier: "720p with audio"
			},
			{
				operation: "generate",
				unit: "output-video-second",
				amount: .12,
				currency: "USD",
				tier: "1080p with audio"
			},
			{
				operation: "generate",
				unit: "output-video-second",
				amount: .3,
				currency: "USD",
				tier: "4K with audio"
			}
		]
	},
	{
		provider: "google",
		model: "veo-3.1-lite-generate-preview",
		task: "video-generation",
		description: "## Positioning\nGoogle’s lowest-cost Veo 3.1 route for developer-first video generation and editing with native audio.\n\n## Routing\nUse for volume-sensitive 720p/1080p workloads; escalate to Fast for 4K or Standard for quality-first cinematic output.",
		specialties: [
			"low-cost video",
			"native synchronized audio",
			"developer-first generation",
			"bulk variants"
		],
		limitations: [
			"preview endpoint",
			"4K is unsupported",
			"paid tier only",
			"below Fast and Standard for quality-first routing"
		],
		bestFor: [
			"bulk short video",
			"cost-sensitive prototypes",
			"720p and 1080p variants"
		],
		avoidFor: ["4K output", "hero-quality cinematic shots"],
		speedClass: "async",
		modelSource: "https://ai.google.dev/gemini-api/docs/models/veo-3.1-lite-generate-preview",
		pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
		rates: [{
			operation: "generate",
			unit: "output-video-second",
			amount: .05,
			currency: "USD",
			tier: "720p with audio"
		}, {
			operation: "generate",
			unit: "output-video-second",
			amount: .08,
			currency: "USD",
			tier: "1080p with audio"
		}]
	},
	{
		provider: "openai",
		model: "sora-2",
		task: "video-generation",
		description: "## Positioning\nOpenAI’s synced-audio video API route for natural-language or image-guided clips. The current model catalog marks it Legacy, although the Videos API still accepts the exact id.\n\n## Routing\nRetain for existing Sora integrations; do not make it the default for a new cross-provider video stack.",
		specialties: [
			"synced-audio video",
			"text-to-video",
			"image-guided video",
			"dynamic short clips"
		],
		limitations: [
			"marked Legacy by OpenAI",
			"4/8/12-second clips",
			"720x1280 or 1280x720 output"
		],
		bestFor: ["maintaining an existing Sora 2 integration", "720p synced-audio clips"],
		avoidFor: [
			"new default routing",
			"higher-resolution delivery",
			"long-form video"
		],
		speedClass: "async",
		modelSource: "https://developers.openai.com/api/docs/models/sora-2",
		additionalModelSources: ["https://platform.openai.com/docs/api-reference/videos"],
		pricingSource: "https://developers.openai.com/api/docs/models/sora-2",
		rates: [{
			operation: "generate",
			unit: "output-video-second",
			amount: .1,
			currency: "USD",
			tier: "720x1280 or 1280x720"
		}]
	},
	{
		provider: "openai",
		model: "sora-2-pro",
		task: "video-generation",
		description: "## Positioning\nOpenAI’s more advanced synced-audio Sora 2 route with higher-resolution tiers. The current model catalog marks it Legacy.\n\n## Routing\nRetain for existing Sora integrations that need more detail or resolution; avoid selecting it as a new default without an explicit legacy-route requirement.",
		specialties: [
			"high-detail synced-audio video",
			"portrait and landscape video",
			"higher-resolution video",
			"image-guided generation"
		],
		limitations: [
			"marked Legacy by OpenAI",
			"higher price than Sora 2",
			"4/8/12-second clips"
		],
		bestFor: ["existing Sora Pro workflows", "higher-resolution synced-audio clips"],
		avoidFor: [
			"new default routing",
			"cost-sensitive bulk generation",
			"long-form video"
		],
		speedClass: "async",
		modelSource: "https://developers.openai.com/api/docs/models/sora-2-pro",
		additionalModelSources: ["https://platform.openai.com/docs/api-reference/videos"],
		pricingSource: "https://developers.openai.com/api/docs/models/sora-2-pro",
		rates: [
			{
				operation: "generate",
				unit: "output-video-second",
				amount: .3,
				currency: "USD",
				tier: "720x1280 or 1280x720"
			},
			{
				operation: "generate",
				unit: "output-video-second",
				amount: .5,
				currency: "USD",
				tier: "1024x1792 or 1792x1024"
			},
			{
				operation: "generate",
				unit: "output-video-second",
				amount: .7,
				currency: "USD",
				tier: "1080x1920 or 1920x1080"
			}
		]
	},
	{
		provider: "minimax",
		model: "MiniMax-H3",
		task: "video-generation",
		description: "## Positioning\nMiniMax H3 is the current open-weight omni-modal video generation system. It accepts text plus image, video, or audio references and generates 4–15 second video with native stereo audio at 768P or 2K.\n\n## Routing\nUse for production video, multimodal reference composition, motion transfer, advertising, product presentation, and video-to-video editing; keep cheaper Hailuo routes for simpler short clips.",
		specialties: [
			"omni-reference video generation",
			"native stereo audio",
			"2K video",
			"motion transfer",
			"video editing",
			"private deployment"
		],
		limitations: [
			"pay-as-you-go API only",
			"hosted Context-IR and 2K regeneration modules are not included in the initial open-weight release",
			"local H3-Base deployment is accelerator-intensive",
			"generation is asynchronous"
		],
		bestFor: [
			"advertising and branded content",
			"reference-driven video creation",
			"video-to-video motion transfer",
			"audio-synchronized short video"
		],
		avoidFor: [
			"latency-sensitive interactive UI",
			"simple low-cost image-to-video clips",
			"workloads requiring more than 15 seconds in one generation"
		],
		speedClass: "async",
		modelSource: "https://platform.minimax.io/docs/api-reference/video-generation-v2-create",
		additionalModelSources: ["https://www.minimax.io/blog/minimax-h3", "https://www.minimax.io/news/minimax-h3-open-source"],
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [{
			operation: "generate",
			unit: "output-video-second",
			amount: .08,
			currency: "USD",
			tier: "768P"
		}, {
			operation: "generate",
			unit: "output-video-second",
			amount: .13,
			currency: "USD",
			tier: "2K"
		}],
		pricingNotes: "Audio reference input is free. The first five reference images are free and additional images are $0.04 each. Reference-video input is billed by its duration at the selected output-resolution rate."
	},
	{
		provider: "minimax",
		model: "MiniMax-Hailuo-2.3",
		task: "video-generation",
		description: "## Positioning\nMiniMax’s established text-to-video and image-to-video production model with strong instruction following, physical motion, facial expression, and camera control.\n\n## Routing\nUse for conventional 6–10 second video generation when H3’s omni-reference inputs, native audio, or 2K output are unnecessary.",
		specialties: [
			"text-to-video",
			"image-to-video",
			"physical motion",
			"facial expression",
			"camera control"
		],
		limitations: [
			"no H3-style audio/video reference input",
			"maximum documented output is 1080P for 6 seconds or 768P for 10 seconds",
			"generation is asynchronous"
		],
		bestFor: [
			"short cinematic clips",
			"character motion",
			"prompt-controlled camera movement"
		],
		avoidFor: [
			"native-audio video",
			"2K output",
			"complex multi-reference composition"
		],
		speedClass: "async",
		modelSource: "https://platform.minimax.io/docs/api-reference/api-overview",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [
			{
				operation: "generate",
				unit: "video",
				amount: .28,
				currency: "USD",
				tier: "768P 6s"
			},
			{
				operation: "generate",
				unit: "video",
				amount: .56,
				currency: "USD",
				tier: "768P 10s"
			},
			{
				operation: "generate",
				unit: "video",
				amount: .49,
				currency: "USD",
				tier: "1080P 6s"
			}
		]
	},
	{
		provider: "minimax",
		model: "MiniMax-Hailuo-2.3-Fast",
		task: "video-generation",
		description: "## Positioning\nMiniMax’s lower-cost image-to-video route for efficient short-video production while retaining the Hailuo family’s motion and physical-coherence strengths.\n\n## Routing\nUse when an input image is available and price matters more than text-only generation or H3’s richer reference controls.",
		specialties: [
			"image-to-video",
			"cost-efficient video",
			"physical motion",
			"high-volume short clips"
		],
		limitations: [
			"image-to-video only",
			"no text-only generation",
			"no H3 native stereo audio or 2K output",
			"generation is asynchronous"
		],
		bestFor: [
			"animating product images",
			"social media variants",
			"high-volume image-to-video"
		],
		avoidFor: ["text-only video prompts", "multi-reference video editing"],
		speedClass: "async",
		modelSource: "https://platform.minimax.io/docs/api-reference/api-overview",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [
			{
				operation: "generate",
				unit: "video",
				amount: .19,
				currency: "USD",
				tier: "768P 6s"
			},
			{
				operation: "generate",
				unit: "video",
				amount: .32,
				currency: "USD",
				tier: "768P 10s"
			},
			{
				operation: "generate",
				unit: "video",
				amount: .33,
				currency: "USD",
				tier: "1080P 6s"
			}
		]
	},
	{
		provider: "minimax",
		model: "speech-2.8-hd",
		task: "speech-synthesis",
		description: "## Positioning\nMiniMax’s current quality-first speech synthesis model with ultra-realistic output, sound tags, 40-language coverage, emotion control, and streaming support.\n\n## Routing\nUse when realism and expressive detail matter more than the lowest character price.",
		specialties: [
			"high-fidelity speech",
			"sound tags",
			"multilingual synthesis",
			"emotion control",
			"voice cloning compatibility"
		],
		limitations: ["higher price than the Turbo route", "voice cloning and voice design incur separate fees"],
		bestFor: [
			"narration",
			"character voices",
			"expressive multilingual speech"
		],
		avoidFor: ["cost-first bulk speech", "latency-first conversational audio"],
		speedClass: "balanced",
		modelSource: "https://platform.minimax.io/docs/api-reference/api-overview",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [{
			operation: "synthesize",
			unit: "1m-characters",
			amount: 100,
			currency: "USD"
		}]
	},
	{
		provider: "minimax",
		model: "speech-2.8-turbo",
		task: "speech-synthesis",
		description: "## Positioning\nMiniMax’s current speed-and-cost speech route, retaining natural flow, sound tags, 40-language coverage, emotion control, and streaming support.\n\n## Routing\nUse as the default MiniMax TTS route for conversational and high-volume production; escalate quality-sensitive narration to HD.",
		specialties: [
			"fast speech synthesis",
			"multilingual synthesis",
			"sound tags",
			"voice agents",
			"cost-efficient TTS"
		],
		limitations: ["below the HD route for maximum realism and detail", "voice cloning and voice design incur separate fees"],
		bestFor: [
			"voice agents",
			"high-volume TTS",
			"responsive multilingual speech"
		],
		avoidFor: ["quality-first studio narration"],
		speedClass: "fast",
		modelSource: "https://platform.minimax.io/docs/api-reference/api-overview",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [{
			operation: "synthesize",
			unit: "1m-characters",
			amount: 60,
			currency: "USD"
		}]
	},
	{
		provider: "minimax",
		model: "music-3.0",
		task: "audio-generation",
		description: "## Positioning\nMiniMax’s current music-generation route for full-song creation from musical direction and lyrics.\n\n## Routing\nUse for music and song generation, not speech synthesis or sound-effect-only tasks.",
		specialties: [
			"song generation",
			"music composition",
			"lyrics-to-music",
			"vocal music"
		],
		limitations: [
			"not a speech-synthesis model",
			"from 2026-08-20 the paid API is unavailable to new users and the free API is discontinued; existing paying users may continue",
			"new deployments should prefer MiniMax Audio or the open-source MiniMax Music 3 model"
		],
		bestFor: [
			"original songs",
			"music demos",
			"lyric-driven composition"
		],
		avoidFor: [
			"new paid API integrations",
			"spoken narration",
			"deterministic audio editing"
		],
		speedClass: "async",
		modelSource: "https://platform.minimax.io/docs/api-reference/api-overview",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [{
			operation: "generate",
			unit: "up-to-5-minutes-music",
			amount: .15,
			currency: "USD",
			tier: "existing paying users only"
		}],
		pricingNotes: "The API is retained only for existing paying users as of 2026-08-20; this rate does not imply availability to new users."
	},
	{
		provider: "minimax",
		model: "image-01",
		task: "image-generation",
		description: "## Positioning\nMiniMax’s production image route for text-to-image and subject-reference image-to-image generation, with custom sizes, multiple aspect ratios, seeds, and up to nine outputs per request.\n\n## Routing\nUse for MiniMax-native image generation and subject-preserving variants; use H3 or Hailuo when the desired output is video.",
		specialties: [
			"text-to-image",
			"subject-reference image generation",
			"custom image sizes",
			"seeded generation",
			"batch variants"
		],
		limitations: [
			"not a video model",
			"subject reference is character-oriented",
			"the current public documentation does not expose an unambiguous pay-as-you-go image rate"
		],
		bestFor: [
			"product and character variants",
			"batch image generation",
			"custom aspect ratios"
		],
		avoidFor: ["video generation", "general-purpose image editing without a subject-reference workflow"],
		speedClass: "balanced",
		modelSource: "https://platform.minimax.io/docs/guides/image-generation",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [{
			operation: "generate",
			unit: "image",
			amount: .0035,
			currency: "USD"
		}]
	}
];
const PORTRAITS$1 = new Map(SPECS$1.map((spec) => [identity(spec.provider, spec.model, spec.task), researchedTaskPortrait(spec)]));
const H3_SPEC = SPECS$1.find((spec) => spec.provider === "minimax" && spec.model === "MiniMax-H3" && spec.task === "video-generation");
const PORTABLE_H3 = portableH3Portrait();
const CURATED_TASK_MODEL_PORTRAIT_IDS = SPECS$1.map((spec) => `${spec.task}:${spec.provider}/${spec.model}`);
/** Return a cloned task portrait only for an exact provider/model/task identity. */
function builtinTaskPortrait(provider, model, task) {
	const normalizedModel = model.trim();
	const portrait = PORTRAITS$1.get(identity(provider.trim(), normalizedModel, task)) ?? (task === "video-generation" && ["MiniMaxAI/MiniMax-H3", "MiniMax-H3"].includes(normalizedModel) ? PORTABLE_H3 : void 0);
	return portrait === void 0 ? void 0 : structuredClone(portrait);
}
function identity(provider, model, task) {
	return `${task}:${provider}/${model}`;
}
function researchedTaskPortrait(spec) {
	const stem = `${spec.provider}-${spec.model}-${spec.task}`.replaceAll(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
	const modelEvidenceId = `${stem}-model`;
	const pricingEvidenceId = `${stem}-pricing`;
	const rates = spec.rates ?? [];
	const evidence = [spec.modelSource, ...spec.additionalModelSources ?? []].map((source, index) => ({
		id: index === 0 ? modelEvidenceId : `${modelEvidenceId}-${index + 1}`,
		kind: "provider-doc",
		source,
		observedAt: OBSERVED_AT$1,
		claims: [
			"model capabilities",
			"input/output boundaries",
			"routing limitations"
		]
	}));
	if (spec.pricingSource !== void 0) evidence.push({
		id: pricingEvidenceId,
		kind: "provider-doc",
		source: spec.pricingSource,
		observedAt: OBSERVED_AT$1,
		claims: ["provider pricing and billing tiers"]
	});
	const portrait = normalizePortrait({
		description: spec.description,
		specialties: spec.specialties,
		limitations: spec.limitations,
		bestFor: spec.bestFor,
		avoidFor: spec.avoidFor,
		pricing: {
			rates: rates.map((rate) => ({
				...rate,
				effectiveFrom: rate.effectiveFrom ?? "2026-08-20",
				evidenceId: pricingEvidenceId
			})),
			...spec.pricingNotes === void 0 ? {} : { notes: spec.pricingNotes }
		},
		performance: {
			speedClass: spec.speedClass,
			notes: "Execution class and provider positioning only; measured duration belongs in lastProbe and usage observations."
		},
		qualityScores: {},
		evidence
	});
	return {
		...portrait,
		validation: {
			...portrait.validation,
			checkedAt: OBSERVED_AT$1
		}
	};
}
function portableH3Portrait() {
	const { pricingSource: _pricingSource, rates: _rates, ...capabilitySpec } = H3_SPEC;
	return researchedTaskPortrait({
		...capabilitySpec,
		provider: "portable",
		model: "MiniMaxAI/MiniMax-H3",
		pricingNotes: "Provider-independent open-weight H3 capability portrait. Local infrastructure cost and hosted API price depend on the selected deployment."
	});
}
//#endregion
//#region lib/types/doubao-speech-catalog.js
/** Stable provider id for the Doubao speech product and its task routes. */
const DOUBAO_SPEECH_PROVIDER = "doubao-speech";
/**
* Legacy batch-speech routes retained only so existing settings remain valid
* until the Realtime provider is saved or removed. They are deliberately not
* shown by the Models provider editor: their Access Token contract is a
* different product surface from Realtime Duplex.
*/
const DOUBAO_SPEECH_LEGACY_CATALOG = [{
	id: "doubao/volc.bigasr.sauc.duration",
	summary: "Doubao/Volcengine large-model speech transcription resource.",
	registration: {
		enabled: false,
		connection: DOUBAO_SPEECH_PROVIDER,
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
		profile: { resourceIdRole: "asr" }
	}
}, {
	id: "doubao/seed-tts-1.0",
	summary: "Doubao/Volcengine short-text speech synthesis resource.",
	registration: {
		enabled: false,
		connection: DOUBAO_SPEECH_PROVIDER,
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
		profile: { resourceIdRole: "tts" }
	}
}];
/**
* Public voices documented for the Realtime S2S-O and SC 2.0 products.
*
* The Realtime wire protocol itself has no ListModels endpoint and fixes
* `session.model` to 1.2.6.1. Voice is the actual selectable upstream
* capability, so the generic provider picker presents these profiles and the
* runtime maps each one back to the fixed protocol model plus its voice id.
*/
const DOUBAO_REALTIME_VOICES = [
	{
		variant: "s2s-o",
		name: "vivi",
		voice: "zh_female_vv_jupiter_bigtts"
	},
	{
		variant: "s2s-o",
		name: "小何",
		voice: "zh_female_xiaohe_jupiter_bigtts"
	},
	{
		variant: "s2s-o",
		name: "云舟",
		voice: "zh_male_yunzhou_jupiter_bigtts"
	},
	{
		variant: "s2s-o",
		name: "小天",
		voice: "zh_male_xiaotian_jupiter_bigtts"
	},
	{
		variant: "sc-2.0",
		name: "傲娇女友",
		voice: "saturn_zh_female_aojiaonvyou_tob"
	},
	{
		variant: "sc-2.0",
		name: "病娇姐姐",
		voice: "saturn_zh_female_bingjiaojiejie_tob"
	},
	{
		variant: "sc-2.0",
		name: "成熟姐姐",
		voice: "saturn_zh_female_chengshujiejie_tob"
	},
	{
		variant: "sc-2.0",
		name: "可爱女生",
		voice: "saturn_zh_female_keainvsheng_tob"
	},
	{
		variant: "sc-2.0",
		name: "暖心学姐",
		voice: "saturn_zh_female_nuanxinxuejie_tob"
	},
	{
		variant: "sc-2.0",
		name: "贴心女友",
		voice: "saturn_zh_female_tiexinnvyou_tob"
	},
	{
		variant: "sc-2.0",
		name: "温柔文雅",
		voice: "saturn_zh_female_wenrouwenya_tob"
	},
	{
		variant: "sc-2.0",
		name: "妩媚御姐",
		voice: "saturn_zh_female_wumeiyujie_tob"
	},
	{
		variant: "sc-2.0",
		name: "性感御姐",
		voice: "saturn_zh_female_xingganyujie_tob"
	},
	{
		variant: "sc-2.0",
		name: "傲气凌人",
		voice: "saturn_zh_male_aiqilingren_tob"
	},
	{
		variant: "sc-2.0",
		name: "傲娇公子",
		voice: "saturn_zh_male_aojiaogongzi_tob"
	},
	{
		variant: "sc-2.0",
		name: "傲娇精英",
		voice: "saturn_zh_male_aojiaojingying_tob"
	},
	{
		variant: "sc-2.0",
		name: "傲慢少爷",
		voice: "saturn_zh_male_aomanshaoye_tob"
	},
	{
		variant: "sc-2.0",
		name: "霸道少爷",
		voice: "saturn_zh_male_badaoshaoye_tob"
	},
	{
		variant: "sc-2.0",
		name: "病娇白莲",
		voice: "saturn_zh_male_bingjiaobailian_tob"
	},
	{
		variant: "sc-2.0",
		name: "不羁青年",
		voice: "saturn_zh_male_bujiqingnian_tob"
	},
	{
		variant: "sc-2.0",
		name: "成熟总裁",
		voice: "saturn_zh_male_chengshuzongcai_tob"
	},
	{
		variant: "sc-2.0",
		name: "磁性男嗓",
		voice: "saturn_zh_male_cixingnansang_tob"
	},
	{
		variant: "sc-2.0",
		name: "醋精男友",
		voice: "saturn_zh_male_cujingnanyou_tob"
	},
	{
		variant: "sc-2.0",
		name: "风发少年",
		voice: "saturn_zh_male_fengfashaonian_tob"
	},
	{
		variant: "sc-2.0",
		name: "腹黑公子",
		voice: "saturn_zh_male_fuheigongzi_tob"
	}
];
const variantName = (variant) => variant === "s2s-o" ? "S2S-O" : "SC 2.0";
/** Realtime voice-backed profiles shown by the Doubao Speech provider. */
const DOUBAO_SPEECH_CATALOG = DOUBAO_REALTIME_VOICES.map((entry) => ({
	id: `doubao/realtime/${entry.voice}`,
	summary: `Volcengine Realtime Duplex 3.0 ${variantName(entry.variant)} profile using the ${entry.name} voice.`,
	registration: {
		enabled: false,
		connection: DOUBAO_SPEECH_PROVIDER,
		model: "1.2.6.1",
		displayName: `豆包 ${variantName(entry.variant)} · ${entry.name}`,
		task: "realtime-speech",
		runtimeAdapter: "doubao-realtime-duplex",
		credentialNames: ["apiKey"],
		input: ["text", "audio"],
		output: ["text", "audio"],
		execution: "realtime",
		capabilities: ["speech.realtime_session"],
		operations: ["realtime-session"],
		roles: ["voice-deliberation"],
		profile: {
			protocol: "doubao-realtime-duplex",
			endpoint: "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue",
			protocolModel: "1.2.6.1",
			variant: entry.variant,
			voice: entry.voice,
			inputSampleRate: 16e3,
			outputSampleRate: 24e3,
			nativeFunctionCalling: true
		}
	}
}));
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
	apiKeyEnv: z.string().role("credential-ref").description("Conventional single API-key reference used by the Models UI."),
	credentialRef: z.string().role("credential-ref").description("Secure credential reference; never the credential value."),
	credentialRefs: z.dict(z.string().role("credential-ref")).description("Named secure credential references for multi-credential providers."),
	baseURL: z.string().description("Optional absolute API base URL."),
	models: z.array(z.object({
		id: z.string().required(),
		name: z.string(),
		contextWindow: z.number(),
		maxTokens: z.number()
	})).default([]).description("Provider-local model directory."),
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
		minimax: {
			provider: "minimax",
			displayName: "MiniMax",
			apiKeyEnv: "MINIMAX_API_KEY",
			credentialRef: "MINIMAX_API_KEY",
			baseURL: "https://api.minimax.io",
			profile: { product: "minimax-multimodal-api" }
		},
		google: {
			provider: "google",
			displayName: "Google Gemini API",
			apiKeyEnv: "GEMINI_API_KEY",
			credentialRef: "GEMINI_API_KEY",
			baseURL: "https://generativelanguage.googleapis.com",
			profile: { product: "gemini-generative-media" }
		},
		[DOUBAO_SPEECH_PROVIDER]: {
			provider: DOUBAO_SPEECH_PROVIDER,
			displayName: "豆包语音",
			apiKeyEnv: "DOUBAO_API_KEY",
			credentialRef: "DOUBAO_API_KEY",
			credentialRefs: {
				apiKey: "DOUBAO_API_KEY",
				speechAppId: "DOUBAO_APPID",
				speechToken: "DOUBAO_TOKEN",
				realtimeApiKey: "DOUBAO_API_KEY"
			},
			profile: {
				product: "doubao-speech",
				speechResources: "documented-resource-ids"
			},
			baseURL: "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue",
			models: []
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
		"openai/sora-2": {
			enabled: false,
			connection: "openai",
			model: "sora-2",
			displayName: "Sora 2 (Legacy)",
			task: "video-generation",
			runtimeAdapter: "openai-videos",
			input: ["text", "image"],
			output: ["video", "audio"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate"],
			roles: ["legacy-synced-audio-video"],
			profile: {
				maxDurationSeconds: 12,
				resolutions: ["720x1280", "1280x720"]
			}
		},
		"openai/sora-2-pro": {
			enabled: false,
			connection: "openai",
			model: "sora-2-pro",
			displayName: "Sora 2 Pro (Legacy)",
			task: "video-generation",
			runtimeAdapter: "openai-videos",
			input: ["text", "image"],
			output: ["video", "audio"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate"],
			roles: ["legacy-high-detail-synced-audio-video"],
			profile: {
				maxDurationSeconds: 12,
				resolutions: [
					"720x1280",
					"1280x720",
					"1024x1792",
					"1792x1024",
					"1080x1920",
					"1920x1080"
				]
			}
		},
		"google/gemini-omni-flash-preview": {
			connection: "google",
			model: "gemini-omni-flash-preview",
			displayName: "Gemini Omni Flash Preview",
			task: "video-generation",
			runtimeAdapter: "google-interactions-video",
			input: [
				"text",
				"image",
				"video",
				"audio"
			],
			output: ["video"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate", "edit"],
			roles: ["default-video-generator", "conversational-video-editor"],
			profile: {
				preview: true,
				maxDurationSeconds: 10,
				resolution: "720p",
				frameRate: 24,
				contextWindow: 1048576
			}
		},
		"google/veo-3.1-generate-preview": {
			connection: "google",
			model: "veo-3.1-generate-preview",
			displayName: "Veo 3.1 Preview",
			task: "video-generation",
			runtimeAdapter: "google-veo",
			input: [
				"text",
				"image",
				"video"
			],
			output: ["video"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate", "extend"],
			roles: ["quality-first-video", "frame-controlled-video"],
			profile: {
				preview: true,
				durationSeconds: 8,
				nativeAudio: true,
				resolutions: [
					"720p",
					"1080p",
					"4K"
				]
			}
		},
		"google/veo-3.1-fast-generate-preview": {
			connection: "google",
			model: "veo-3.1-fast-generate-preview",
			displayName: "Veo 3.1 Fast Preview",
			task: "video-generation",
			runtimeAdapter: "google-veo",
			input: [
				"text",
				"image",
				"video"
			],
			output: ["video"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate", "extend"],
			roles: ["fast-video", "production-video"],
			profile: {
				preview: true,
				durationSeconds: 8,
				nativeAudio: true,
				resolutions: [
					"720p",
					"1080p",
					"4K"
				]
			}
		},
		"google/veo-3.1-lite-generate-preview": {
			connection: "google",
			model: "veo-3.1-lite-generate-preview",
			displayName: "Veo 3.1 Lite Preview",
			task: "video-generation",
			runtimeAdapter: "google-veo",
			input: [
				"text",
				"image",
				"video"
			],
			output: ["video"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate", "edit"],
			roles: ["cost-efficient-video", "bulk-video"],
			profile: {
				preview: true,
				nativeAudio: true,
				resolutions: ["720p", "1080p"]
			}
		},
		"minimax/MiniMax-H3": {
			connection: "minimax",
			model: "MiniMax-H3",
			displayName: "MiniMax H3",
			task: "video-generation",
			runtimeAdapter: "minimax-video-v2",
			input: [
				"text",
				"image",
				"video",
				"audio"
			],
			output: ["video", "audio"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate"],
			roles: ["omni-reference-video-generator", "video-editor"],
			profile: {
				apiVersion: "v2",
				nativeAudio: true,
				maxDurationSeconds: 15,
				resolutions: ["768P", "2K"]
			}
		},
		"minimax/MiniMax-Hailuo-2.3": {
			connection: "minimax",
			model: "MiniMax-Hailuo-2.3",
			displayName: "MiniMax Hailuo 2.3",
			task: "video-generation",
			runtimeAdapter: "minimax-video",
			input: ["text", "image"],
			output: ["video"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate"],
			roles: ["text-to-video", "image-to-video"],
			profile: {
				apiVersion: "v1",
				maxDurationSeconds: 10,
				resolutions: ["768P", "1080P"]
			}
		},
		"minimax/MiniMax-Hailuo-2.3-Fast": {
			connection: "minimax",
			model: "MiniMax-Hailuo-2.3-Fast",
			displayName: "MiniMax Hailuo 2.3 Fast",
			task: "video-generation",
			runtimeAdapter: "minimax-video",
			input: ["text", "image"],
			output: ["video"],
			execution: "async-job",
			capabilities: ["video.generate"],
			operations: ["generate"],
			roles: ["image-to-video", "cost-efficient-video"],
			profile: {
				apiVersion: "v1",
				requiresImage: true,
				maxDurationSeconds: 10,
				resolutions: ["768P", "1080P"]
			}
		},
		"minimax/speech-2.8-hd": {
			connection: "minimax",
			model: "speech-2.8-hd",
			displayName: "MiniMax Speech 2.8 HD",
			task: "speech-synthesis",
			runtimeAdapter: "minimax-speech",
			input: ["text"],
			output: ["audio"],
			execution: "streaming",
			capabilities: ["speech.synthesize.short"],
			operations: ["synthesize"],
			roles: ["quality-first-tts"],
			profile: {
				languages: 40,
				soundTags: true,
				maxCharacters: 1e4
			}
		},
		"minimax/speech-2.8-turbo": {
			connection: "minimax",
			model: "speech-2.8-turbo",
			displayName: "MiniMax Speech 2.8 Turbo",
			task: "speech-synthesis",
			runtimeAdapter: "minimax-speech",
			input: ["text"],
			output: ["audio"],
			execution: "streaming",
			capabilities: ["speech.synthesize.short"],
			operations: ["synthesize"],
			roles: ["fast-tts", "voice-agent-tts"],
			profile: {
				languages: 40,
				soundTags: true,
				maxCharacters: 1e4
			}
		},
		"minimax/music-3.0": {
			enabled: false,
			connection: "minimax",
			model: "music-3.0",
			displayName: "MiniMax Music 3.0",
			task: "audio-generation",
			runtimeAdapter: "minimax-music",
			input: ["text"],
			output: ["audio"],
			execution: "async-job",
			capabilities: ["audio.generate"],
			operations: ["generate"],
			roles: ["music-generator", "song-generator"],
			profile: {}
		},
		"minimax/image-01": {
			connection: "minimax",
			model: "image-01",
			displayName: "MiniMax Image 01",
			task: "image-generation",
			runtimeAdapter: "minimax-images",
			input: ["text", "image"],
			output: ["image"],
			execution: "request-response",
			capabilities: ["image.generate"],
			operations: ["generate"],
			roles: ["image-generator", "subject-reference-image-generator"],
			profile: {
				maxImages: 9,
				customSize: true,
				seeded: true
			}
		},
		"openai/gpt-realtime": {
			connection: "openai",
			model: "gpt-realtime",
			displayName: "GPT Realtime",
			task: "realtime-speech",
			runtimeAdapter: "openai-webrtc",
			input: ["text", "audio"],
			output: ["text", "audio"],
			execution: "realtime",
			capabilities: ["speech.realtime_session"],
			operations: ["realtime-session"],
			roles: ["voice-deliberation"],
			profile: {
				protocol: "openai-webrtc",
				voice: "marin"
			},
			portrait: initialPortrait("OpenAI full-duplex Realtime speech model.")
		},
		...Object.fromEntries([...DOUBAO_SPEECH_LEGACY_CATALOG, ...DOUBAO_SPEECH_CATALOG].map((entry) => [entry.id, {
			...entry.registration,
			portrait: initialPortrait(entry.summary)
		}]))
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
function nonBlank$1(value, name) {
	const normalized = value.trim();
	if (normalized === "") throw new ModelManagerError(`${name} must not be blank`, "INVALID_TASK_MODEL_CONFIGURATION");
	return normalized;
}
function optionalText$1(value) {
	if (value === void 0) return void 0;
	const normalized = value.trim();
	return normalized === "" ? void 0 : normalized;
}
function absoluteHttpUrl(value, name) {
	const normalized = optionalText$1(value);
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
function absoluteConnectionUrl(value, name) {
	const normalized = optionalText$1(value);
	if (normalized === void 0) return void 0;
	let parsed;
	try {
		parsed = new URL(normalized);
	} catch (cause) {
		throw new ModelManagerError(`${name} must be an absolute URL`, "INVALID_TASK_MODEL_CONFIGURATION", { cause });
	}
	if (![
		"http:",
		"https:",
		"ws:",
		"wss:"
	].includes(parsed.protocol)) throw new ModelManagerError(`${name} must use http, https, ws, or wss`, "INVALID_TASK_MODEL_CONFIGURATION");
	return normalized;
}
function stringList(values, name) {
	if (values === void 0) return void 0;
	const normalized = values.map((value, index) => nonBlank$1(value, `${name}[${index}]`));
	return [...new Set(normalized)];
}
function namedCredentialRefs(values, name) {
	if (values === void 0) return void 0;
	const refs = {};
	for (const [rawKey, rawRef] of Object.entries(values)) {
		const key = nonBlank$1(rawKey, `${name} key`);
		if (!CREDENTIAL_NAME.test(key)) throw new ModelManagerError(`${name} key '${key}' must start with a letter and contain only letters, digits, dot, underscore, or hyphen`, "INVALID_TASK_MODEL_CONFIGURATION");
		if (typeof rawRef !== "string") throw new ModelManagerError(`${name}.${key} must be a credential reference name`, "INVALID_TASK_MODEL_CONFIGURATION");
		const ref = nonBlank$1(rawRef, `${name}.${key}`);
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
	const routeId = nonBlank$1(id, "id");
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
	nonBlank$1(id, "connection id");
	nonBlank$1(connection.provider, `connections.${id}.provider`);
	absoluteConnectionUrl(connection.baseURL, `connections.${id}.baseURL`);
	absoluteHttpUrl(connection.catalogEndpoint, `connections.${id}.catalogEndpoint`);
	if (connection.credentialRef !== void 0) credentialRef(nonBlank$1(connection.credentialRef, `connections.${id}.credentialRef`));
	const refs = namedCredentialRefs(connection.credentialRefs, `connections.${id}.credentialRefs`);
	const catalogCredentialName = optionalText$1(connection.catalogCredentialName);
	if (catalogCredentialName !== void 0 && catalogCredentialName !== "default" && refs?.[catalogCredentialName] === void 0) throw new ModelManagerError(`connections.${id}.catalogCredentialName references unknown credential slot '${catalogCredentialName}'`, "INVALID_TASK_MODEL_CONFIGURATION");
}
function validateTaskModelRegistry(config) {
	for (const [id, connection] of Object.entries(config.connections)) validateConnection(id, connection);
	for (const [id, model] of Object.entries(config.models)) {
		nonBlank$1(id, "model route id");
		nonBlank$1(model.connection, `models.${id}.connection`);
		nonBlank$1(model.model, `models.${id}.model`);
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
		nonBlank$1(binding.provider, `portraits.${id}.provider`);
		nonBlank$1(binding.model, `portraits.${id}.model`);
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
	const id = nonBlank$1(input.id, "id");
	const connectionId = nonBlank$1(input.connection, "connection");
	const modelId = nonBlank$1(input.model, "model");
	const descriptor = requiredDescriptor(ctx);
	const config = resolvedConfig(descriptor);
	const existingConnection = config.connections[connectionId];
	const provider = optionalText$1(input.provider) ?? existingConnection?.provider;
	if (provider === void 0) throw new ModelManagerError(`provider is required when creating connection '${connectionId}'`, "INVALID_TASK_MODEL_CONFIGURATION");
	const credential = optionalText$1(input.credentialRef);
	if (credential !== void 0) await credentialStatus(ctx, credential);
	const credentialRefs = namedCredentialRefs(input.credentialRefs, "credentialRefs");
	if (credentialRefs !== void 0) await namedCredentialStatuses(ctx, credentialRefs);
	const baseURL = absoluteConnectionUrl(input.baseURL, "baseURL");
	const catalogEndpoint = absoluteHttpUrl(input.catalogEndpoint, "catalogEndpoint");
	const catalogCredentialName = optionalText$1(input.catalogCredentialName);
	const defaults = TASK_DEFAULTS[input.task];
	const existingModel = config.models[id];
	const connectionFields = {
		provider: nonBlank$1(provider, "provider"),
		...input.connectionDisplayName === void 0 ? {} : { displayName: optionalText$1(input.connectionDisplayName) },
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
		...input.displayName === void 0 ? {} : { displayName: optionalText$1(input.displayName) },
		...input.runtimeAdapter === void 0 ? {} : { runtimeAdapter: optionalText$1(input.runtimeAdapter) },
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
	const requiredAdapter = optionalText$1(input.runtimeAdapter) ?? existingModel?.runtimeAdapter;
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
	const protocol = new URL(connection.baseURL).protocol;
	if (protocol !== "http:" && protocol !== "https:") throw new ModelManagerError("connection baseURL is not an HTTP model catalog", "TASK_MODEL_CATALOG_UNAVAILABLE");
	return `${connection.baseURL.replace(/\/+$/, "")}/models`;
}
async function discoverTaskModels(ctx, input, signal = AbortSignal.timeout(15e3)) {
	const connectionId = nonBlank$1(input.connection, "connection");
	const config = resolvedConfig(requiredDescriptor(ctx));
	const connection = config.connections[connectionId];
	if (connection === void 0) throw new ModelManagerError(`unknown connection '${connectionId}'`, "UNKNOWN_TASK_MODEL_CONNECTION");
	const endpoint = catalogURL(connection);
	const credentialName = optionalText$1(connection.catalogCredentialName);
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
	const connectionId = nonBlank$1(input.connection, "connection");
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
	const requestedId = optionalText$1(input.id);
	const provider = optionalText$1(input.provider);
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
		const realtimeRuntime = ctx.realtimeModelRuntime;
		const route = {
			id,
			connection,
			registration: model
		};
		const adapterAvailable = model.execution === "realtime" ? realtimeRuntime?.hasAdapter(model.runtimeAdapter) ?? false : runtime?.hasAdapter(model.runtimeAdapter, route) ?? false;
		const enabled = model.enabled !== false;
		const callable = enabled && adapterAvailable && credentialReady;
		const bundledPortrait = builtinTaskPortrait(connection.provider, model.model, model.task);
		const portrait = model.portrait ?? bundledPortrait;
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
			...portrait === void 0 ? {} : {
				portraitSource: model.portrait === void 0 ? "bundled" : "stored",
				portrait: {
					summary: portrait.summary,
					specialties: portrait.specialties,
					speedClass: portrait.performance.speedClass,
					pricingRates: portrait.pricing.rates.length,
					validation: portrait.validation
				}
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
	doubaoApiKey: "DOUBAO_API_KEY"
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
			credentialRef: CREDENTIALS.doubaoApiKey,
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
//#region lib/types/portraits/builtin.js
const OBSERVED_AT = "2026-08-20T00:00:00.000Z";
const CURATED_LLM_PORTRAIT_SELECTION = {
	observedAt: OBSERVED_AT,
	policy: "latest-mainstream-first",
	usageSource: "https://openrouter.ai/rankings?view=month",
	providerCatalogs: [
		"https://developers.openai.com/api/docs/models",
		"https://platform.claude.com/docs/en/about-claude/models/choosing-a-model",
		"https://ai.google.dev/gemini-api/docs/models",
		"https://api-docs.deepseek.com/quick_start/pricing/",
		"https://www.kimi.ai/help/kimi-api/api-model-selection",
		"https://docs.z.ai/guides/overview/pricing",
		"https://docs.x.ai/developers/models",
		"https://help.aliyun.com/zh/model-studio/text-generation-model",
		"https://www.minimax.io/models/text/m3",
		"https://docs.mistral.ai/models"
	],
	rationale: "Cover widely adopted providers and their current flagship, mainstream workhorse, or materially distinct modality, specialization, and deployment routes. There is no fixed model count. Usage and private-deployment adoption are secondary signals within the current generation."
};
const SPECS = [
	{
		provider: "openai",
		model: "gpt-5.6-sol",
		description: "## Positioning\nOpenAI’s current flagship for complex professional work, reasoning, coding, and long-context tasks.\n\n## Routing\nPrefer when correctness and reasoning depth matter more than minimum price or latency.",
		specialties: [
			"complex professional work",
			"coding",
			"deep reasoning",
			"long-context tasks",
			"tool-heavy agent work"
		],
		limitations: ["higher token price than GPT-5.6 Terra and Luna", "not the economical default for simple high-volume classification"],
		bestFor: [
			"architecture and difficult coding",
			"high-stakes analysis",
			"complex long-horizon agent work"
		],
		avoidFor: ["routine classification", "latency-first bulk extraction"],
		speedClass: "balanced",
		modelSource: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
		pricingSource: "https://developers.openai.com/api/docs/models/gpt-5.6-sol",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 5,
				currency: "USD"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .5,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 30,
				currency: "USD"
			}
		]
	},
	{
		provider: "openai",
		model: "gpt-5.6-terra",
		description: "## Positioning\nOpenAI’s current balanced model for workloads that need strong intelligence with lower cost than the flagship.\n\n## Routing\nUse as the mainstream OpenAI workhorse for coding, tools, and general agent tasks; escalate the hardest work to Sol.",
		specialties: [
			"coding",
			"tool use",
			"general agent work",
			"long-context tasks"
		],
		limitations: ["below GPT-5.6 Sol on the hardest reasoning work", "more expensive than GPT-5.6 Luna for simple high-volume tasks"],
		bestFor: [
			"general coding and review",
			"tool-using agents",
			"bounded multi-step work"
		],
		avoidFor: ["the hardest high-stakes reasoning tasks"],
		speedClass: "balanced",
		modelSource: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
		pricingSource: "https://developers.openai.com/api/docs/models/gpt-5.6-terra",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 2,
				currency: "USD"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .2,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 12,
				currency: "USD"
			}
		]
	},
	{
		provider: "anthropic",
		model: "claude-opus-5",
		description: "## Positioning\nAnthropic’s current Opus model for complex agentic coding, enterprise work, deep reasoning, vision, and long-horizon tasks.\n\n## Routing\nPrefer for difficult work where quality justifies premium cost and moderate comparative latency.",
		specialties: [
			"complex reasoning",
			"agentic coding",
			"long-horizon work",
			"vision"
		],
		limitations: ["premium token price", "moderate comparative latency rather than the fastest Claude tier"],
		bestFor: [
			"high-autonomy coding",
			"deep technical investigation",
			"high-cost-of-error tasks"
		],
		avoidFor: ["simple high-volume requests", "strict latency-first workloads"],
		speedClass: "balanced",
		modelSource: "https://platform.claude.com/docs/en/about-claude/models/choosing-a-model",
		pricingSource: "https://platform.claude.com/docs/en/about-claude/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 5,
				currency: "USD"
			},
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .5,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 25,
				currency: "USD"
			}
		]
	},
	{
		provider: "anthropic",
		model: "claude-sonnet-5",
		description: "## Positioning\nAnthropic’s current Sonnet model and mainstream workhorse, combining frontier intelligence with fast performance for coding, agents, analysis, and visual understanding.\n\n## Routing\nUse for broad production workloads; escalate the most demanding long-horizon tasks to Opus 5.",
		specialties: [
			"coding",
			"analysis",
			"agentic tool use",
			"vision"
		],
		limitations: ["not Anthropic’s preferred tier for the most complex long-horizon work", "uses adaptive thinking by default and rejects non-default sampling parameters"],
		bestFor: [
			"general agent work",
			"coding and review",
			"analysis with tools"
		],
		avoidFor: ["tasks explicitly requiring the strongest available Claude model"],
		speedClass: "fast",
		modelSource: "https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5",
		pricingSource: "https://platform.claude.com/docs/en/about-claude/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 2,
				currency: "USD"
			},
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .2,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 10,
				currency: "USD"
			}
		]
	},
	{
		provider: "google",
		model: "gemini-3.1-pro-preview",
		description: "## Positioning\nGoogle preview model for advanced reasoning, coding, agentic work, and multimodal understanding.\n\n## Routing\nPrefer for complex multimodal or very long-context tasks; account for preview lifecycle and long-prompt pricing tiers.",
		specialties: [
			"advanced reasoning",
			"multimodal understanding",
			"coding",
			"agentic workflows"
		],
		limitations: ["preview lifecycle", "higher prices above 200k prompt tokens"],
		bestFor: [
			"complex multimodal analysis",
			"large-context reasoning",
			"difficult coding"
		],
		avoidFor: ["simple high-volume processing", "workloads requiring a stable GA endpoint"],
		speedClass: "balanced",
		modelSource: "https://ai.google.dev/gemini-api/docs/models",
		pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 2,
				currency: "USD",
				tier: "prompt <=200k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 12,
				currency: "USD",
				tier: "prompt <=200k tokens"
			},
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 4,
				currency: "USD",
				tier: "prompt >200k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 18,
				currency: "USD",
				tier: "prompt >200k tokens"
			}
		]
	},
	{
		provider: "google",
		model: "gemini-3.7-flash",
		description: "## Positioning\nGoogle’s latest and most capable Flash workhorse for complex coding, agentic workflows, reliable multi-step execution, and multimodal reasoning.\n\n## Routing\nUse as the mainstream Gemini route for agentic and multimodal tasks.",
		specialties: [
			"complex coding",
			"agentic workflows",
			"multimodal reasoning",
			"search and grounding"
		],
		limitations: ["not the preferred tier when maximum Pro reasoning depth is the only objective"],
		bestFor: [
			"high-volume agent work",
			"multimodal processing",
			"tool-heavy workflows"
		],
		avoidFor: ["tasks requiring the deepest available Gemini Pro reasoning"],
		speedClass: "fast",
		modelSource: "https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash",
		pricingSource: "https://ai.google.dev/gemini-api/docs/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: .75,
				currency: "USD",
				effectiveTo: "2026-12-31"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .075,
				currency: "USD",
				effectiveTo: "2026-12-31"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 3.75,
				currency: "USD",
				effectiveTo: "2026-12-31"
			}
		],
		pricingNotes: "Promotional standard pricing documented through 2026-12-31; re-research after that date."
	},
	{
		provider: "xai",
		model: "grok-4.5",
		description: "## Positioning\nxAI’s current frontier model for coding, agentic software, engineering, and knowledge work.\n\n## Routing\nPrefer for difficult agentic coding and engineering workflows; use Grok 4.3 when lower price and a larger context window matter more.",
		specialties: [
			"agentic coding",
			"software engineering",
			"reasoning",
			"tool use",
			"vision"
		],
		limitations: ["higher token price than Grok 4.3", "long-context requests at or above 200k tokens use doubled token rates"],
		bestFor: [
			"complex software engineering",
			"agentic workflow automation",
			"difficult technical knowledge work"
		],
		avoidFor: ["simple high-volume requests", "cost-sensitive very-long-context processing"],
		speedClass: "balanced",
		modelSource: "https://docs.x.ai/developers/models/grok-4.5",
		pricingSource: "https://docs.x.ai/developers/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 2,
				currency: "USD",
				tier: "context <200k tokens"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .3,
				currency: "USD",
				tier: "context <200k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 6,
				currency: "USD",
				tier: "context <200k tokens"
			},
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 4,
				currency: "USD",
				tier: "context >=200k tokens"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .6,
				currency: "USD",
				tier: "context >=200k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 12,
				currency: "USD",
				tier: "context >=200k tokens"
			}
		]
	},
	{
		provider: "xai",
		model: "grok-4.3",
		description: "## Positioning\nxAI’s current fast, reliable general workhorse with strong tool calling, instruction following, configurable reasoning, vision, and a 1M-token context window.\n\n## Routing\nUse for broad agent workloads where speed, price, and very long context are more important than Grok 4.5’s frontier coding capability.",
		specialties: [
			"tool calling",
			"instruction following",
			"long context",
			"configurable reasoning",
			"vision"
		],
		limitations: ["below Grok 4.5 for the hardest coding and engineering work", "long-context requests at or above 200k tokens use doubled token rates"],
		bestFor: [
			"general agent work",
			"tool-heavy workflows",
			"large-context analysis"
		],
		avoidFor: ["tasks explicitly requiring xAI’s strongest coding model"],
		speedClass: "fast",
		modelSource: "https://docs.x.ai/developers/models/grok-4.3",
		pricingSource: "https://docs.x.ai/developers/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 1.25,
				currency: "USD",
				tier: "context <200k tokens"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .2,
				currency: "USD",
				tier: "context <200k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 2.5,
				currency: "USD",
				tier: "context <200k tokens"
			},
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 2.5,
				currency: "USD",
				tier: "context >=200k tokens"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .4,
				currency: "USD",
				tier: "context >=200k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 5,
				currency: "USD",
				tier: "context >=200k tokens"
			}
		]
	},
	{
		provider: "deepseek",
		model: "deepseek-v4-pro",
		description: "## Positioning\nDeepSeek’s higher-capability V4 route for agentic coding, reasoning, STEM, and long-context work.\n\n## Routing\nPrefer over Flash when the task is difficult enough that added reasoning capability outweighs cost and concurrency.",
		specialties: [
			"agentic coding",
			"reasoning",
			"math and STEM",
			"long context"
		],
		limitations: ["higher price and lower documented concurrency than V4 Flash"],
		bestFor: [
			"complex coding",
			"difficult reasoning",
			"high-correctness-cost work"
		],
		avoidFor: ["simple high-volume agent tasks", "maximum-concurrency workloads"],
		speedClass: "balanced",
		modelSource: "https://api-docs.deepseek.com/news/news260424/",
		pricingSource: "https://api-docs.deepseek.com/quick_start/pricing/",
		rates: [
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .022,
				currency: "USD",
				tier: "off-peak"
			},
			{
				operation: "cache-miss-input",
				unit: "1m-tokens",
				amount: .66,
				currency: "USD",
				tier: "off-peak"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 1.98,
				currency: "USD",
				tier: "off-peak"
			},
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .044,
				currency: "USD",
				tier: "peak"
			},
			{
				operation: "cache-miss-input",
				unit: "1m-tokens",
				amount: 1.32,
				currency: "USD",
				tier: "peak"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 3.96,
				currency: "USD",
				tier: "peak"
			}
		],
		pricingNotes: "Peak hours are 01:00–04:00 and 06:00–10:00 UTC; all other hours are off-peak."
	},
	{
		provider: "deepseek",
		model: "deepseek-v4-flash",
		description: "## Positioning\nDeepSeek’s fast, efficient V4 route with reasoning close to Pro and parity on simple agent tasks.\n\n## Routing\nUse as the default DeepSeek workhorse for routine agent tasks, high volume, and cost-sensitive work.",
		specialties: [
			"simple agent tasks",
			"cost-efficient reasoning",
			"high-throughput work",
			"long context"
		],
		limitations: ["below V4 Pro on the hardest reasoning and agentic coding tasks"],
		bestFor: [
			"routine agent work",
			"summaries and bounded edits",
			"cost-sensitive routing"
		],
		avoidFor: ["the hardest high-stakes reasoning tasks"],
		speedClass: "fast",
		modelSource: "https://api-docs.deepseek.com/news/news260424/",
		pricingSource: "https://api-docs.deepseek.com/quick_start/pricing/",
		rates: [
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .007,
				currency: "USD",
				tier: "off-peak"
			},
			{
				operation: "cache-miss-input",
				unit: "1m-tokens",
				amount: .22,
				currency: "USD",
				tier: "off-peak"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: .66,
				currency: "USD",
				tier: "off-peak"
			},
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .014,
				currency: "USD",
				tier: "peak"
			},
			{
				operation: "cache-miss-input",
				unit: "1m-tokens",
				amount: .44,
				currency: "USD",
				tier: "peak"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 1.32,
				currency: "USD",
				tier: "peak"
			}
		],
		pricingNotes: "Peak hours are 01:00–04:00 and 06:00–10:00 UTC; all other hours are off-peak."
	},
	{
		provider: "moonshotai",
		model: "kimi-k3",
		description: "## Positioning\nKimi’s current flagship for long-horizon coding, end-to-end knowledge work, reasoning, native vision, and 1M-token context.\n\n## Routing\nPrefer for the hardest Kimi workloads and very large contexts; use K2.6 when lower cost or switchable thinking is more important.",
		specialties: [
			"long-horizon coding",
			"knowledge work",
			"reasoning",
			"native vision",
			"long context"
		],
		limitations: [
			"highest-priced current Kimi API route",
			"always runs in thinking mode",
			"model switching within an existing session harms cache reuse and is discouraged by the provider"
		],
		bestFor: [
			"large-repository engineering",
			"long-document reasoning",
			"complex multimodal knowledge work"
		],
		avoidFor: ["simple high-volume requests", "workloads that require non-thinking mode"],
		speedClass: "balanced",
		modelSource: "https://www.kimi.ai/help/kimi-api/api-model-selection",
		pricingSource: "https://www.kimi.ai/resources/kimi-k3-pricing",
		rates: [
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .3,
				currency: "USD"
			},
			{
				operation: "cache-miss-input",
				unit: "1m-tokens",
				amount: 3,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 15,
				currency: "USD"
			}
		]
	},
	{
		provider: "moonshotai",
		model: "kimi-k2.6",
		description: "## Positioning\nKimi’s current cost-efficient multimodal workhorse for conversation, coding, vision, video understanding, and agent tasks, with switchable thinking and a 256K context window.\n\n## Routing\nUse for broad Kimi workloads when K3-level capability or 1M context is unnecessary.",
		specialties: [
			"coding",
			"agent tasks",
			"visual understanding",
			"video understanding",
			"switchable reasoning"
		],
		limitations: ["smaller context and lower capability ceiling than Kimi K3"],
		bestFor: [
			"general agent work",
			"multimodal analysis",
			"cost-sensitive coding and conversation"
		],
		avoidFor: ["the hardest long-horizon work", "inputs requiring more than 256K context"],
		speedClass: "fast",
		modelSource: "https://www.kimi.ai/help/kimi-api/api-model-selection",
		pricingSource: "https://platform.kimi.ai/docs/pricing/chat-k26",
		rates: [
			{
				operation: "cache-hit-input",
				unit: "1m-tokens",
				amount: .16,
				currency: "USD"
			},
			{
				operation: "cache-miss-input",
				unit: "1m-tokens",
				amount: .95,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 4,
				currency: "USD"
			}
		]
	},
	{
		provider: "zai",
		model: "glm-5.3",
		description: "## Positioning\nZ.ai’s latest flagship for complex software engineering, long-horizon agents, and deep reasoning, with a 1M-token context window.\n\n## Routing\nPrefer for the hardest GLM coding and agent work; choose GLM-5-Turbo for routine work or GLM-5V-Turbo when image input is required.",
		specialties: [
			"complex software engineering",
			"long-horizon agents",
			"deep reasoning",
			"long context"
		],
		limitations: ["text-only input", "reasoning is always enabled and cannot be disabled"],
		bestFor: [
			"large-scale coding",
			"terminal and tool workflows",
			"complex long-running agent tasks"
		],
		avoidFor: ["vision tasks", "latency-first non-reasoning requests"],
		speedClass: "balanced",
		modelSource: "https://docs.z.ai/guides/llm/glm-5.3",
		pricingSource: "https://docs.z.ai/guides/overview/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 1.4,
				currency: "USD"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .26,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 4.4,
				currency: "USD"
			}
		]
	},
	{
		provider: "zai",
		model: "glm-5-turbo",
		description: "## Positioning\nZ.ai’s mainstream GLM workhorse for reasoning, coding, and agent tasks at lower cost than the flagship.\n\n## Routing\nUse for routine production agent and coding workloads that do not require GLM-5.3’s maximum capability or 1M context.",
		specialties: [
			"coding",
			"reasoning",
			"agent tasks",
			"cost-efficient production work"
		],
		limitations: ["below GLM-5.3 on complex long-horizon software engineering", "text-only input"],
		bestFor: [
			"general coding",
			"bounded agent work",
			"cost-sensitive reasoning"
		],
		avoidFor: ["vision tasks", "the hardest long-horizon coding tasks"],
		speedClass: "fast",
		modelSource: "https://docs.z.ai/guides/llm/glm-5-turbo",
		pricingSource: "https://docs.z.ai/guides/overview/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 1.2,
				currency: "USD"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .24,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 4,
				currency: "USD"
			}
		]
	},
	{
		provider: "zai",
		model: "glm-5v-turbo",
		description: "## Positioning\nZ.ai’s current multimodal coding foundation model for vision-based coding and multimodal agent tasks.\n\n## Routing\nUse when screenshots, UI states, diagrams, or other visual inputs are central to a coding or agent workflow.",
		specialties: [
			"vision-based coding",
			"multimodal agents",
			"visual understanding",
			"tool use"
		],
		limitations: ["specialized multimodal route rather than the strongest text-only GLM reasoning model"],
		bestFor: [
			"UI implementation from screenshots",
			"visual debugging",
			"multimodal agent workflows"
		],
		avoidFor: ["text-only tasks that need GLM-5.3’s maximum reasoning capability"],
		speedClass: "fast",
		modelSource: "https://docs.z.ai/guides/vlm/glm-5v-turbo",
		pricingSource: "https://docs.z.ai/guides/overview/pricing",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: 1.2,
				currency: "USD"
			},
			{
				operation: "cached-input",
				unit: "1m-tokens",
				amount: .24,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 4,
				currency: "USD"
			}
		]
	},
	{
		provider: "minimax",
		model: "MiniMax-M3",
		description: "## Positioning\nMiniMax’s current open-weight frontier model for coding, long-horizon agents, native image/video understanding, and contexts up to 1M tokens.\n\n## Routing\nPrefer for repository-scale coding, computer-use workflows, and multimodal long-context work; do not confuse open weights with lightweight local deployment.",
		specialties: [
			"agentic coding",
			"computer use",
			"native multimodality",
			"long context",
			"private deployment"
		],
		limitations: [
			"very large 428B-total / 23B-active MoE footprint",
			"self-hosting requires substantial accelerator capacity",
			"longer than 512K inputs use a higher API price tier"
		],
		bestFor: [
			"large-repository engineering",
			"multimodal computer-use agents",
			"long-video and long-document analysis"
		],
		avoidFor: ["low-VRAM local inference", "simple latency-first requests"],
		speedClass: "balanced",
		modelSource: "https://www.minimax.io/blog/minimax-m3",
		pricingSource: "https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: .3,
				currency: "USD",
				tier: "input <=512k tokens"
			},
			{
				operation: "cache-read-input",
				unit: "1m-tokens",
				amount: .06,
				currency: "USD",
				tier: "input <=512k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 1.2,
				currency: "USD",
				tier: "input <=512k tokens"
			},
			{
				operation: "input",
				unit: "1m-tokens",
				amount: .6,
				currency: "USD",
				tier: "input >512k tokens"
			},
			{
				operation: "cache-read-input",
				unit: "1m-tokens",
				amount: .12,
				currency: "USD",
				tier: "input >512k tokens"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 2.4,
				currency: "USD",
				tier: "input >512k tokens"
			}
		]
	},
	{
		provider: "minimax",
		model: "MiniMax-M2.7",
		description: "## Positioning\nMiniMax’s widely deployed open-weight workhorse for real-world software engineering, professional office delivery, and character-rich interaction.\n\n## Routing\nUse when its low API price, self-hosting option, and strong coding/office profile matter more than M3 multimodality or 1M context.",
		specialties: [
			"software engineering",
			"office productivity",
			"tool use",
			"role interaction",
			"private deployment"
		],
		limitations: [
			"text-only model",
			"204.8K context is smaller than M3",
			"large 229B-parameter checkpoint is not a low-VRAM model"
		],
		bestFor: [
			"cost-sensitive coding agents",
			"office document workflows",
			"self-hosted enterprise agents"
		],
		avoidFor: ["image or video understanding", "edge-device inference"],
		speedClass: "fast",
		modelSource: "https://platform.minimax.io/docs/guides/text-generation",
		pricingSource: "https://platform.minimax.io/docs/guides/pricing-paygo",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: .3,
				currency: "USD"
			},
			{
				operation: "cache-read-input",
				unit: "1m-tokens",
				amount: .06,
				currency: "USD"
			},
			{
				operation: "cache-write-input",
				unit: "1m-tokens",
				amount: .375,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: 1.2,
				currency: "USD"
			}
		]
	},
	{
		provider: "mistral",
		model: "mistral-small-2603",
		description: "## Positioning\nMistral Small 4 is an Apache-2.0 open-weight MoE that unifies general instruction following, configurable reasoning, vision, and agentic coding with 6B active parameters.\n\n## Routing\nUse as Mistral’s efficient generalist API route or for customizable on-prem deployments with multi-accelerator infrastructure.",
		specialties: [
			"configurable reasoning",
			"agentic coding",
			"vision",
			"multilingual work",
			"private deployment"
		],
		limitations: ["119B total parameters", "official minimum self-hosting configurations use datacenter-class multi-GPU systems"],
		bestFor: [
			"cost-efficient multimodal agents",
			"customized enterprise assistants",
			"open-weight reasoning and coding"
		],
		avoidFor: ["single consumer-GPU deployment", "tasks needing the strongest Mistral Medium capability"],
		speedClass: "fast",
		modelSource: "https://mistral.ai/news/mistral-small-4/",
		pricingSource: "https://docs.mistral.ai/models/model-selection-guide?models=mistral-small-4-0-26-03",
		rates: [
			{
				operation: "input",
				unit: "1m-tokens",
				amount: .15,
				currency: "USD"
			},
			{
				operation: "cache-read-input",
				unit: "1m-tokens",
				amount: .015,
				currency: "USD"
			},
			{
				operation: "output",
				unit: "1m-tokens",
				amount: .6,
				currency: "USD"
			}
		]
	},
	{
		provider: "mistral",
		model: "ministral-8b-latest",
		description: "## Positioning\nMinistral 3 8B is Mistral’s current small multimodal model for edge and local deployment, with function calling, structured output, and a 256K context.\n\n## Routing\nPrefer for privacy-sensitive local assistants and modest-hardware text/vision workloads; escalate harder reasoning to a larger model.",
		specialties: [
			"edge deployment",
			"low-VRAM inference",
			"vision",
			"function calling",
			"multilingual work"
		],
		limitations: ["8B capability ceiling", "the API latest alias can advance and should be re-researched periodically"],
		bestFor: [
			"private local assistants",
			"document and image extraction",
			"high-volume bounded tool calls"
		],
		avoidFor: ["frontier reasoning", "complex long-horizon software engineering"],
		speedClass: "fast",
		modelSource: "https://docs.mistral.ai/models/model-cards/ministral-3-8b-25-12",
		pricingSource: "https://docs.mistral.ai/models/model-cards/ministral-3-8b-25-12",
		rates: [{
			operation: "input",
			unit: "1m-tokens",
			amount: .15,
			currency: "USD"
		}, {
			operation: "output",
			unit: "1m-tokens",
			amount: .15,
			currency: "USD"
		}]
	}
];
const PORTABLE_SPECS = [
	{
		canonicalModel: "qwen3.8-max-preview",
		modelIds: ["qwen3.8-max-preview"],
		description: "## Positioning\nQwen’s preview frontier route for always-on reasoning, multimodal understanding, coding, and long-running professional tasks.\n\n## Routing\nUse only when preview lifecycle risk is acceptable; select Qwen 3.7 Plus for a stable cost-balanced workhorse.",
		specialties: [
			"deep reasoning",
			"coding",
			"image and video understanding",
			"long-running professional tasks"
		],
		limitations: [
			"preview endpoint may change or be replaced",
			"thinking cannot be disabled",
			"not an open-weight private-deployment model"
		],
		bestFor: ["hard Qwen reasoning tasks", "complex multimodal agent work"],
		avoidFor: ["stable long-lived integrations", "latency-first non-reasoning work"],
		modelSource: "https://help.aliyun.com/zh/model-studio/token-plan-personal-overview"
	},
	{
		canonicalModel: "qwen3.7-plus",
		modelIds: ["qwen3.7-plus", "qwen/qwen3.7-plus"],
		description: "## Positioning\nQwen’s current cost-balanced production workhorse for coding, tools, image/video understanding, and 1M-token contexts.\n\n## Routing\nUse as the default Qwen cloud route; escalate only the hardest work to Max or move privacy-sensitive workloads to an open-weight Qwen checkpoint.",
		specialties: [
			"coding",
			"tool use",
			"image and video understanding",
			"long context",
			"production agents"
		],
		limitations: ["closed cloud model", "provider-specific built-in tools and prices vary by route"],
		bestFor: [
			"general coding agents",
			"large-context document work",
			"multimodal production workflows"
		],
		avoidFor: ["air-gapped deployment", "very small local hardware"],
		modelSource: "https://help.aliyun.com/zh/model-studio/qwen3-7-plus"
	},
	{
		canonicalModel: "Qwen/Qwen3.5-4B",
		modelIds: [
			"Qwen/Qwen3.5-4B",
			"Qwen3.5-4B",
			"qwen/qwen3.5-4b",
			"qwen3.5-4b"
		],
		description: "## Positioning\nA 4B Apache-2.0 Qwen checkpoint with native text/image/video understanding, hybrid reasoning, and a native 262K context for low-footprint private deployment.\n\n## Routing\nUse for local extraction, classification, lightweight visual understanding, and fast preliminary routing; escalate complex generation and reasoning.",
		specialties: [
			"small private deployment",
			"multimodal understanding",
			"classification",
			"information extraction",
			"multilingual work"
		],
		limitations: ["4B capability ceiling", "quality falls behind larger Qwen checkpoints on complex coding and long-horizon reasoning"],
		bestFor: [
			"on-device or single-GPU assistants",
			"fast router-side analysis",
			"privacy-sensitive bounded tasks"
		],
		avoidFor: ["complex autonomous coding", "high-stakes deep reasoning"],
		modelSource: "https://huggingface.co/Qwen/Qwen3.5-4B"
	},
	{
		canonicalModel: "Qwen/Qwen3.5-9B",
		modelIds: [
			"Qwen/Qwen3.5-9B",
			"Qwen3.5-9B",
			"qwen/qwen3.5-9b",
			"qwen3.5-9b"
		],
		description: "## Positioning\nA popular 9B Apache-2.0 Qwen checkpoint balancing local deployability with native multimodality, reasoning, agents, and a native 262K context.\n\n## Routing\nUse as a stronger private generalist than the 4B model when memory permits.",
		specialties: [
			"private deployment",
			"multimodal understanding",
			"reasoning",
			"agents",
			"multilingual work"
		],
		limitations: ["below 27B and 35B-A3B variants on difficult work", "actual speed and context capacity depend on quantization and serving hardware"],
		bestFor: [
			"private general assistants",
			"local document and image work",
			"cost-controlled self-hosting"
		],
		avoidFor: ["frontier coding and reasoning", "extremely constrained edge devices"],
		modelSource: "https://huggingface.co/Qwen/Qwen3.5-9B"
	},
	{
		canonicalModel: "Qwen/Qwen3.5-27B",
		modelIds: [
			"Qwen/Qwen3.5-27B",
			"Qwen3.5-27B",
			"qwen/qwen3.5-27b",
			"qwen3.5-27b"
		],
		description: "## Positioning\nA 27B dense Qwen open-weight generalist for stronger private multimodal reasoning, coding, and agent work than the small 4B/9B tiers.\n\n## Routing\nUse when a private deployment can afford a larger dense checkpoint and predictable dense-model behavior matters.",
		specialties: [
			"private deployment",
			"multimodal reasoning",
			"coding",
			"agents",
			"long context"
		],
		limitations: ["materially higher memory and compute than 4B/9B", "less inference-efficient than a sparse model with a similar stored footprint"],
		bestFor: ["higher-quality on-prem assistants", "private coding and document analysis"],
		avoidFor: ["low-VRAM hardware", "latency-first lightweight classification"],
		modelSource: "https://huggingface.co/Qwen/Qwen3.5-27B"
	},
	{
		canonicalModel: "Qwen/Qwen3.6-35B-A3B",
		modelIds: [
			"Qwen/Qwen3.6-35B-A3B",
			"Qwen3.6-35B-A3B",
			"qwen/qwen3.6-35b-a3b",
			"qwen3.6-35b-a3b"
		],
		description: "## Positioning\nQwen’s current efficient open-weight MoE generalist: 35B stored parameters but only 3B active per token, with strong agentic coding and native multimodality.\n\n## Routing\nPrefer over dense 27B when throughput after loading the full checkpoint and strong coding are the main priorities.",
		specialties: [
			"agentic coding",
			"private deployment",
			"Mixture-of-Experts efficiency",
			"multimodal reasoning",
			"tool use"
		],
		limitations: ["full 35B checkpoint must still fit storage and memory", "MoE serving support and tuning are more demanding than a small dense model"],
		bestFor: [
			"efficient on-prem coding agents",
			"multimodal enterprise assistants",
			"high-throughput private inference"
		],
		avoidFor: ["devices that cannot fit the full checkpoint", "simple deployments without MoE-capable runtimes"],
		modelSource: "https://qwen.ai/blog?id=qwen3.6-35b-a3b"
	},
	{
		canonicalModel: "Qwen/Qwen3-Coder-Next",
		modelIds: [
			"Qwen/Qwen3-Coder-Next",
			"Qwen3-Coder-Next",
			"qwen/qwen3-coder-next",
			"qwen3-coder-next"
		],
		description: "## Positioning\nQwen’s open-weight model specialized for coding agents and local development, with 3B active parameters and a 256K context.\n\n## Routing\nChoose for private repository work and coding agents; use a general Qwen checkpoint for visual or broad office tasks.",
		specialties: [
			"agentic coding",
			"repository exploration",
			"tool use",
			"private deployment",
			"local development"
		],
		limitations: ["coding specialization narrows its general-purpose value", "requires the documented Qwen tool parser for reliable function calling"],
		bestFor: [
			"self-hosted coding assistants",
			"multi-file edits",
			"terminal agents"
		],
		avoidFor: ["vision tasks", "general creative or office workloads"],
		modelSource: "https://github.com/QwenLM/Qwen3-Coder"
	},
	{
		canonicalModel: "MiniMaxAI/MiniMax-M3",
		modelIds: ["MiniMaxAI/MiniMax-M3", "MiniMax-M3"],
		description: "## Positioning\nThe open-weight MiniMax M3 checkpoint for frontier coding, cowork agents, native multimodality, and 1M-token contexts.\n\n## Routing\nUse for private large-cluster deployments where M3’s capabilities justify its 428B-total / 23B-active footprint.",
		specialties: [
			"agentic coding",
			"native multimodality",
			"long context",
			"private deployment"
		],
		limitations: [
			"not a small model",
			"requires substantial serving infrastructure",
			"community license terms must be reviewed for the intended deployment"
		],
		bestFor: ["large private AI clusters", "repository-scale and multimodal agents"],
		avoidFor: ["single-GPU or low-VRAM inference", "simple high-volume tasks"],
		modelSource: "https://huggingface.co/MiniMaxAI/MiniMax-M3"
	},
	{
		canonicalModel: "MiniMaxAI/MiniMax-M2.7",
		modelIds: ["MiniMaxAI/MiniMax-M2.7", "MiniMax-M2.7"],
		description: "## Positioning\nThe open-weight MiniMax M2.7 checkpoint for software engineering, professional office delivery, and long-running agent work.\n\n## Routing\nUse for established private MiniMax deployments that do not need M3 vision or 1M context.",
		specialties: [
			"software engineering",
			"office productivity",
			"agents",
			"private deployment"
		],
		limitations: [
			"229B-parameter checkpoint",
			"text-only",
			"not suitable for low-VRAM edge deployment"
		],
		bestFor: ["private enterprise coding agents", "office workflow automation"],
		avoidFor: ["vision tasks", "small local machines"],
		modelSource: "https://huggingface.co/MiniMaxAI/MiniMax-M2.7"
	},
	{
		canonicalModel: "mistralai/Mistral-Small-4-119B-2603",
		modelIds: [
			"mistralai/Mistral-Small-4-119B-2603",
			"Mistral-Small-4-119B-2603",
			"mistral-small-2603"
		],
		description: "## Positioning\nMistral Small 4’s Apache-2.0 open-weight checkpoint combines instruction following, reasoning, coding, and vision with 6B active parameters.\n\n## Routing\nUse for customizable enterprise deployments with datacenter-class multi-GPU capacity.",
		specialties: [
			"configurable reasoning",
			"agentic coding",
			"vision",
			"private deployment",
			"customization"
		],
		limitations: ["119B total parameters", "official minimum infrastructure is multi-GPU datacenter hardware"],
		bestFor: ["on-prem multimodal agents", "fine-tuned enterprise assistants"],
		avoidFor: ["consumer single-GPU deployment", "tiny edge workloads"],
		modelSource: "https://mistral.ai/news/mistral-small-4/"
	},
	{
		canonicalModel: "mistralai/Ministral-3-8B-Instruct-2512",
		modelIds: [
			"mistralai/Ministral-3-8B-Instruct-2512",
			"Ministral-3-8B-Instruct-2512",
			"ministral-8b-2512",
			"ministral-8b-latest"
		],
		description: "## Positioning\nAn Apache-2.0 8B text-and-vision instruct model built for edge and local deployment; the official FP8 checkpoint can fit in about 12GB VRAM.\n\n## Routing\nUse for privacy-sensitive bounded tasks on modest hardware, including local document vision and tool calling.",
		specialties: [
			"low-VRAM inference",
			"edge deployment",
			"vision",
			"function calling",
			"private deployment"
		],
		limitations: ["8B capability ceiling", "reasoning-heavy work should be escalated"],
		bestFor: [
			"local multimodal assistants",
			"private extraction and classification",
			"bounded tool use"
		],
		avoidFor: ["frontier reasoning", "complex autonomous coding"],
		modelSource: "https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512"
	}
];
const PORTRAITS = new Map(SPECS.map((spec) => [`${spec.provider}/${spec.model}`, researchedPortrait(spec)]));
const PORTABLE_PORTRAITS = new Map(PORTABLE_SPECS.flatMap((spec) => {
	const portrait = portablePortrait(spec);
	return spec.modelIds.map((model) => [model, portrait]);
}));
const CURATED_LLM_PORTRAIT_IDS = [...PORTRAITS.keys()].map((id) => `llm:${id}`);
const CURATED_PORTABLE_LLM_MODEL_IDS = PORTABLE_SPECS.map((spec) => spec.canonicalModel);
/** Return a cloned route portrait, or an exact-id portable capability portrait. */
function builtinLlmPortrait(provider, model) {
	const normalizedModel = model.trim();
	const portrait = PORTRAITS.get(`${provider.trim()}/${normalizedModel}`) ?? PORTABLE_PORTRAITS.get(normalizedModel);
	return portrait === void 0 ? void 0 : structuredClone(portrait);
}
function researchedPortrait(spec) {
	const modelEvidenceId = `${spec.provider}-${spec.model}-model`;
	const pricingEvidenceId = `${spec.provider}-${spec.model}-pricing`;
	const portrait = normalizePortrait({
		description: spec.description,
		specialties: spec.specialties,
		limitations: spec.limitations,
		bestFor: spec.bestFor,
		avoidFor: spec.avoidFor,
		pricing: {
			rates: spec.rates.map((rate) => ({
				...rate,
				effectiveFrom: rate.effectiveFrom ?? "2026-08-20",
				evidenceId: pricingEvidenceId
			})),
			...spec.pricingNotes === void 0 ? {} : { notes: spec.pricingNotes }
		},
		performance: {
			speedClass: spec.speedClass,
			notes: "Qualitative provider positioning only; measured latency belongs in lastProbe and usage observations."
		},
		qualityScores: {},
		evidence: [{
			id: modelEvidenceId,
			kind: "provider-doc",
			source: spec.modelSource,
			observedAt: OBSERVED_AT,
			claims: [
				"provider positioning",
				"specialties",
				"routing limitations"
			]
		}, {
			id: pricingEvidenceId,
			kind: "provider-doc",
			source: spec.pricingSource,
			observedAt: OBSERVED_AT,
			claims: ["token pricing and tiers"]
		}]
	});
	return {
		...portrait,
		validation: {
			...portrait.validation,
			checkedAt: OBSERVED_AT
		}
	};
}
function portablePortrait(spec) {
	const evidenceId = `portable-${spec.canonicalModel.replaceAll("/", "-").toLowerCase()}-model`;
	const portrait = normalizePortrait({
		description: spec.description,
		specialties: spec.specialties,
		limitations: spec.limitations,
		bestFor: spec.bestFor,
		avoidFor: spec.avoidFor,
		pricing: {
			rates: [],
			notes: "Provider-independent capability portrait: API price and self-hosted infrastructure cost depend on the selected route and deployment, so no universal price is asserted."
		},
		performance: { notes: "Provider and hardware independent: speed must come from a live route probe or privacy-safe usage observations." },
		qualityScores: {},
		evidence: [{
			id: evidenceId,
			kind: "provider-doc",
			source: spec.modelSource,
			observedAt: OBSERVED_AT,
			claims: [
				"model capabilities",
				"specialization",
				"deployment characteristics"
			]
		}]
	});
	return {
		...portrait,
		validation: {
			...portrait.validation,
			checkedAt: OBSERVED_AT
		}
	};
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
		const bundled = builtinTaskPortrait(route.connection.provider, route.registration.model, route.registration.task);
		return {
			kind: "task",
			id: route.id,
			portrait: route.registration.portrait ?? bundled,
			portraitSource: route.registration.portrait !== void 0 ? "stored" : bundled !== void 0 ? "bundled" : void 0,
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
	const bundled = builtinLlmPortrait(parsed.provider, parsed.model);
	return {
		kind: "llm",
		id: targetId,
		provider: parsed.provider,
		model: parsed.model,
		portrait: binding?.portrait ?? bundled,
		portraitSource: binding !== void 0 ? "stored" : bundled !== void 0 ? "bundled" : void 0,
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
		...target.portraitSource === void 0 ? {} : { portraitSource: target.portraitSource },
		declared: target.declared,
		portrait: visiblePortrait,
		...input.includeUsage === true ? { observed: summarizeModelUsage({ id: target.id }, events) } : {}
	};
}
//#endregion
//#region lib/types/catalog.js
const CATALOG_NOTE = "Peer plugins should inject ctx.modelCatalog and call snapshot() to read every registered model. selectAgentModel chooses the Agent model from that catalog. Do not scrape settings.yaml or call Agent tools to read this catalog. Secrets are never included.";
/**
* Build a secret-free catalog snapshot for peer plugins and Agent-model selection.
*
* Args:
*   ctx: Host context that already has settings, credentials, llm, and taskModelRuntime.
*
* Returns:
*   Every task-model row and live language model, with stored or curated portraits when available. Credential values are never included.
*/
async function snapshotModelCatalog(ctx) {
	const listed = await listTaskModels(ctx);
	const rows = Array.isArray(listed.models) ? listed.models : [];
	const taskModels = [];
	for (const row of rows) {
		const detail = await getModelPortrait(ctx, {
			id: row.id,
			includeEvidence: true
		});
		taskModels.push({
			...row,
			portrait: detail.portrait,
			declared: detail.declared
		});
	}
	const languagePortraits = [];
	const unresolvedLanguagePortraitIds = [];
	const configuredPortraitIds = new Set(Object.keys(portraitRegistry(ctx).portraits ?? {}));
	for (const id of configuredPortraitIds) try {
		languagePortraits.push(await getModelPortrait(ctx, {
			id,
			includeEvidence: true
		}));
	} catch {
		unresolvedLanguagePortraitIds.push(id);
	}
	const portraitsById = new Map(languagePortraits.map((row) => [asString(row.id), row]));
	const routes = await listModelRoutes(ctx);
	const languageModels = [];
	for (const providerRow of asRecordList(routes.providers)) {
		const provider = asString(providerRow.provider);
		const status = asString(providerRow.status);
		for (const modelRow of asRecordList(providerRow.models)) {
			const model = asString(modelRow.id);
			if (provider === "" || model === "") continue;
			const id = `llm:${provider}/${model}`;
			let portraitRow = portraitsById.get(id);
			if (portraitRow === void 0 && !configuredPortraitIds.has(id)) {
				const bundled = builtinLlmPortrait(provider, model);
				if (bundled !== void 0) {
					portraitRow = {
						id,
						kind: "llm",
						provider,
						model,
						portrait: bundled,
						portraitSource: "bundled"
					};
					portraitsById.set(id, portraitRow);
					languagePortraits.push(portraitRow);
				}
			}
			languageModels.push({
				id,
				kind: "llm",
				provider,
				model,
				displayName: asString(modelRow.name) || model,
				status,
				...portraitRow === void 0 ? {} : {
					portrait: portraitRow.portrait,
					portraitSource: portraitRow.portraitSource ?? "stored",
					...portraitRow.declared === void 0 ? {} : { declared: portraitRow.declared }
				}
			});
		}
	}
	return {
		taskModels,
		languageModels,
		languagePortraits,
		unresolvedLanguagePortraitIds,
		defaults: asRecord(listed.defaults),
		settingsNs: String(listed.settingsNs),
		note: CATALOG_NOTE
	};
}
/**
* Save the Agent (primary) model from the registered language catalog.
*
* `select_default_model` calls this. The model must already appear as a live
* language model in `snapshot()`. Task models cannot be Agent models.
*
* Args:
*   ctx: Host context with the catalog, llm runtime, and agentDefaultModel.
*   input: Provider, model id, and optional advertised reasoning effort.
*   signal: Optional abort signal for model-info resolution.
*
* Returns:
*   The saved selection plus the matching catalog row. Never includes secrets.
*/
async function selectAgentModel(ctx, input, signal) {
	const provider = nonBlank(input.provider, "provider");
	const model = nonBlank(input.model, "model");
	const reasoningEffort = optionalText(input.reasoningEffort);
	const snapshot = await snapshotModelCatalog(ctx);
	const taskId = `${provider}/${model}`;
	if (snapshot.taskModels.some((row) => asString(row.id) === taskId)) throw new ModelManagerError(`'${taskId}' is a registered task model, not an Agent language model`, "NOT_AN_AGENT_MODEL");
	const catalogRow = snapshot.languageModels.find((row) => asString(row.provider) === provider && asString(row.model) === model);
	if (catalogRow === void 0) throw new ModelManagerError(`language model '${provider}/${model}' is not in the catalog`, "UNKNOWN_AGENT_MODEL");
	if (asString(catalogRow.status) !== "live") throw new ModelManagerError(`language model '${provider}/${model}' is not a live Agent-model candidate`, "AGENT_MODEL_NOT_LIVE");
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
		catalog: catalogRow,
		appliesTo: "new-agents",
		currentSessionChanged: false
	};
}
/**
* Tool-facing alias for `selectAgentModel`.
*
* Args:
*   ctx: Host context with the catalog, llm runtime, and agentDefaultModel.
*   input: Provider, model id, and optional advertised reasoning effort.
*   signal: Optional abort signal for model-info resolution.
*
* Returns:
*   The saved selection plus the matching catalog row. Never includes secrets.
*/
function selectDefaultModel(ctx, input, signal) {
	return selectAgentModel(ctx, input, signal);
}
/**
* Read-only model directory plus Agent-model selection.
*
* Registration and portraits fill this catalog. `snapshot()` returns every
* registered model. `selectAgentModel()` saves the Agent (primary) model from
* the live language entries in that snapshot.
*/
var ModelCatalog = class extends Service {
	constructor(ctx) {
		super(ctx, "modelCatalog");
	}
	/**
	* List non-language task-model routes without credential values.
	*
	* Args:
	*   input: Optional id, provider, task, or includeProfile filters.
	*
	* Returns:
	*   The same secret-free listing that `list_task_models` returns.
	*/
	listTaskModels(input = {}) {
		return listTaskModels(this.ctx, input);
	}
	/**
	* List llm-pi-ai language-model routes without credential values.
	*
	* Args:
	*   input: Optional provider filter and dormant/model inclusion flags.
	*
	* Returns:
	*   The same secret-free listing that `list_model_routes` returns.
	*/
	listLanguageRoutes(input = {}) {
		return listModelRoutes(this.ctx, input);
	}
	/**
	* Read one evidence-backed portrait plus declared capabilities.
	*
	* Args:
	*   input: Task route id or `llm:<provider>/<model>`, with optional evidence/usage flags.
	*
	* Returns:
	*   Portrait payload used by `get_model_portrait`. Never includes secrets.
	*/
	getPortrait(input) {
		return getModelPortrait(this.ctx, input);
	}
	/**
	* Return every registered model this plugin knows about.
	*
	* Returns:
	*   Task models, live language models, and stored LLM portraits. Unresolvable LLM ids are listed separately.
	*/
	snapshot() {
		return snapshotModelCatalog(this.ctx);
	}
	/**
	* Save the Agent (primary) model from the registered language catalog.
	*
	* Args:
	*   input: Provider, model id, and optional advertised reasoning effort.
	*   signal: Optional abort signal for model-info resolution.
	*
	* Returns:
	*   The saved selection plus the matching catalog row. Never includes secrets.
	*/
	selectAgentModel(input, signal) {
		return selectAgentModel(this.ctx, input, signal);
	}
};
/**
* Reject blank identifiers used in Agent-model selection.
*
* Args:
*   value: Raw provider or model string.
*   name: Field name for the error message.
*
* Returns:
*   The trimmed value.
*/
function nonBlank(value, name) {
	const normalized = value.trim();
	if (normalized === "") throw new ModelManagerError(`${name} must not be blank`, "INVALID_MODEL_CONFIGURATION");
	return normalized;
}
/**
* Treat blank optional strings as omitted.
*
* Args:
*   value: Optional reasoning-effort id.
*
* Returns:
*   The trimmed value, or undefined.
*/
function optionalText(value) {
	if (value === void 0) return void 0;
	const normalized = value.trim();
	return normalized === "" ? void 0 : normalized;
}
/**
* Return a plain object, or an empty object when the value is not one.
*
* Args:
*   value: Unknown snapshot field.
*
* Returns:
*   A record view of the value.
*/
function asRecord(value) {
	if (typeof value === "object" && value !== null && !Array.isArray(value)) return value;
	return {};
}
/**
* Return object rows from an unknown array field.
*
* Args:
*   value: Unknown snapshot field.
*
* Returns:
*   The object items, or an empty list.
*/
function asRecordList(value) {
	return Array.isArray(value) ? value.map(asRecord) : [];
}
/**
* Return a string, or an empty string when the value is not one.
*
* Args:
*   value: Unknown snapshot field.
*
* Returns:
*   The string value, or `''`.
*/
function asString(value) {
	return typeof value === "string" ? value : "";
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
		const credentials = await this.credentials(route);
		return adapter.invoke({
			route,
			operation,
			request,
			credentials
		}, signal);
	}
	async probe(route, signal) {
		const adapter = this.requiredAdapter(route);
		const credentials = await this.credentials(route);
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
	async credentials(route) {
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
//#region lib/types/realtime.js
function normalizedTools(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((tool) => typeof tool?.name === "string" && tool.name.trim() !== "");
}
function profileMetadata(route) {
	const value = route.registration.profile;
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text(value) {
	return typeof value === "string" ? value : "";
}
/**
* Provider-neutral runtime for registered full-duplex model sessions.
*
* The multi-model plugin owns route selection and credential resolution.
* Provider plugins register wire adapters; product plugins register role
* profiles. Neither side needs to inspect the other's settings schema.
*/
var RealtimeModelRuntime = class extends Service {
	adapters = /* @__PURE__ */ new Map();
	profiles = /* @__PURE__ */ new Map();
	maxContextChars;
	constructor(ctx, options = {}) {
		super(ctx, "realtimeModelRuntime");
		this.maxContextChars = Math.max(1e3, Math.min(5e4, Number(options.maxContextChars ?? 12e3)));
	}
	registerAdapter(adapter) {
		const id = String(adapter?.id ?? "").trim();
		if (id === "") throw new ModelManagerError("realtime adapter id must not be blank", "INVALID_REALTIME_ADAPTER");
		if (this.adapters.has(id)) throw new ModelManagerError(`realtime adapter '${id}' is already registered`, "DUPLICATE_REALTIME_ADAPTER");
		if (typeof adapter.session !== "function") throw new ModelManagerError(`realtime adapter '${id}' must implement session()`, "INVALID_REALTIME_ADAPTER");
		this.adapters.set(id, adapter);
		return () => this.adapters.delete(id);
	}
	hasAdapter(id) {
		return id !== void 0 && this.adapters.has(id);
	}
	registerProfile(profile) {
		const id = String(profile?.id ?? "").trim();
		if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(id)) throw new ModelManagerError("realtime profile id must be lower-case hyphen-case", "INVALID_REALTIME_PROFILE");
		if (this.profiles.has(id)) throw new ModelManagerError(`realtime profile '${id}' is already registered`, "DUPLICATE_REALTIME_PROFILE");
		if (typeof profile.instructions !== "function" && typeof profile.instructions !== "string") throw new ModelManagerError(`realtime profile '${id}' requires instructions`, "INVALID_REALTIME_PROFILE");
		const stored = {
			id,
			instructions: profile.instructions,
			tools: normalizedTools(profile.tools),
			voice: profile.voice ?? {}
		};
		this.profiles.set(id, stored);
		return () => this.profiles.delete(id);
	}
	profile(id) {
		const profile = this.profiles.get(String(id ?? ""));
		if (profile === void 0) throw new ModelManagerError(`unknown realtime profile '${String(id ?? "")}'`, "UNKNOWN_REALTIME_PROFILE");
		return profile;
	}
	async models() {
		const listed = await listTaskModels(this.ctx, {
			task: "realtime-speech",
			includeProfile: true
		});
		const rows = Array.isArray(listed.models) ? listed.models : [];
		const routes = [];
		for (const row of rows) {
			if (row.enabled === false || typeof row.id !== "string") continue;
			const resolved = resolveTaskModelRoute(this.ctx, row.id);
			const adapterId = resolved.registration.runtimeAdapter;
			const adapter = adapterId === void 0 ? void 0 : this.adapters.get(adapterId);
			if (adapter === void 0) continue;
			const metadata = profileMetadata(resolved);
			routes.push({
				id: resolved.id,
				model: resolved.registration.model,
				displayName: resolved.registration.displayName ?? resolved.registration.model,
				provider: resolved.connection.provider,
				adapter: adapter.id,
				protocol: adapter.protocol,
				baseURL: resolved.connection.baseURL ?? "",
				endpoint: text(metadata.endpoint) || resolved.connection.baseURL || "",
				voice: text(metadata.voice),
				source: "task-model",
				resolved
			});
		}
		return routes;
	}
	async model(routeId, protocol = "") {
		const routes = await this.models();
		const candidates = protocol === "" ? routes : routes.filter((route) => route.protocol === protocol);
		const selected = String(routeId ?? "");
		return candidates.find((route) => route.id === selected) ?? candidates.find((route) => route.model === selected) ?? candidates[0];
	}
	async credential(route) {
		const refs = {
			...route.resolved.connection.credentialRef === void 0 ? {} : { default: route.resolved.connection.credentialRef },
			...route.resolved.connection.credentialRefs ?? {}
		};
		try {
			const credentials = await this.ctx.taskModelRuntime.credentials(route.resolved);
			return {
				value: credentials.apiKey ?? credentials.realtimeApiKey ?? credentials.default ?? Object.values(credentials)[0] ?? "",
				credentialRef: refs.apiKey ?? refs.realtimeApiKey ?? refs.default ?? Object.values(refs)[0] ?? ""
			};
		} catch {
			return {
				value: "",
				credentialRef: refs.apiKey ?? refs.realtimeApiKey ?? refs.default ?? Object.values(refs)[0] ?? ""
			};
		}
	}
	async publicModels() {
		const rows = [];
		for (const route of await this.models()) {
			const credential = await this.credential(route);
			rows.push({
				id: route.id,
				model: route.model,
				displayName: route.displayName,
				provider: route.provider,
				source: route.source,
				protocol: route.protocol,
				available: credential.value !== "",
				missingCredential: credential.value === "" ? credential.credentialRef : ""
			});
		}
		return rows;
	}
	instructions(profile, context) {
		const bounded = String(context ?? "").replaceAll("\0", "").trim().slice(0, this.maxContextChars);
		return typeof profile.instructions === "function" ? String(profile.instructions(bounded) ?? "") : [String(profile.instructions ?? ""), bounded].filter(Boolean).join("\n\n");
	}
	session(input) {
		const profile = this.profile(input.profileId);
		const adapter = this.adapters.get(input.route.adapter);
		if (adapter === void 0) throw new ModelManagerError(`realtime adapter '${input.route.adapter}' is unavailable`, "REALTIME_ADAPTER_UNAVAILABLE");
		return adapter.session({
			route: input.route,
			profile,
			instructions: this.instructions(profile, input.context ?? "")
		});
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
//#region lib/types/portraits/research-sources.js
/**
* Official documentation entry points an Agent can open while researching a portrait.
*
* These are starting URLs, not a complete catalog. The Agent must still extract
* current facts from the live pages and record the exact page as evidence.source.
*/
const VOLCENGINE_ARK_DOCS = "https://www.volcengine.com/docs/82379";
const DOUBAO_SPEECH_DOCS = "https://www.volcengine.com/docs/6561";
const OPENAI_MODELS_DOCS = "https://platform.openai.com/docs/models";
const OPENAI_PRICING_DOCS = "https://platform.openai.com/docs/pricing";
const OPENAI_IMAGE_DOCS = "https://platform.openai.com/docs/guides/image-generation";
const OPENAI_VIDEO_DOCS = "https://platform.openai.com/docs/api-reference/videos";
const ANTHROPIC_MODELS_DOCS = "https://platform.claude.com/docs/en/about-claude/models/overview";
const ANTHROPIC_PRICING_DOCS = "https://platform.claude.com/docs/en/about-claude/pricing";
const GOOGLE_MODELS_DOCS = "https://ai.google.dev/gemini-api/docs/models";
const GOOGLE_PRICING_DOCS = "https://ai.google.dev/gemini-api/docs/pricing";
const GOOGLE_VIDEO_DOCS = "https://ai.google.dev/gemini-api/docs/video";
const DEEPSEEK_MODELS_DOCS = "https://api-docs.deepseek.com/news/news260424/";
const DEEPSEEK_PRICING_DOCS = "https://api-docs.deepseek.com/quick_start/pricing/";
const KIMI_MODELS_DOCS = "https://www.kimi.ai/help/kimi-api/api-model-selection";
const KIMI_PRICING_DOCS = "https://www.kimi.ai/help/kimi-api/api-pricing";
const ZAI_MODELS_DOCS = "https://docs.z.ai/guides/llm/glm-5.3";
const ZAI_PRICING_DOCS = "https://docs.z.ai/guides/overview/pricing";
const XAI_MODELS_DOCS = "https://docs.x.ai/developers/models";
const XAI_PRICING_DOCS = "https://docs.x.ai/developers/pricing";
const QWEN_MODELS_DOCS = "https://help.aliyun.com/zh/model-studio/text-generation-model";
const QWEN_PRICING_DOCS = "https://help.aliyun.com/en/model-studio/model-pricing";
const QWEN_OPEN_WEIGHTS_DOCS = "https://huggingface.co/Qwen/models";
const MINIMAX_MODELS_DOCS = "https://www.minimax.io/models/text/m3";
const MINIMAX_PRICING_DOCS = "https://platform.minimax.io/docs/guides/pricing-paygo";
const MINIMAX_LOCAL_DEPLOY_DOCS = "https://platform.minimax.io/docs/guides/local-deploy";
const MINIMAX_H3_DOCS = "https://platform.minimax.io/docs/api-reference/video-generation-v2-create";
const MINIMAX_H3_OPEN_SOURCE_DOCS = "https://www.minimax.io/news/minimax-h3-open-source";
const MINIMAX_MULTIMODAL_DOCS = "https://platform.minimax.io/docs/api-reference/api-overview";
const MINIMAX_IMAGE_DOCS = "https://platform.minimax.io/docs/guides/image-generation";
const MISTRAL_MODELS_DOCS = "https://docs.mistral.ai/models";
const MISTRAL_PRICING_DOCS = "https://docs.mistral.ai/models/model-selection-guide";
/**
* Return official documentation URLs for a provider id.
*
* Args:
*   provider: Connection or llm-pi-ai provider id such as `volcengine` or `openai`.
*
* Returns:
*   HTTPS documentation entry points. Empty when the provider has no bundled sources.
*/
function officialResearchSources(provider) {
	switch (provider) {
		case "volcengine": return [VOLCENGINE_ARK_DOCS];
		case "doubao":
		case "doubao-speech": return [DOUBAO_SPEECH_DOCS];
		case "openai": return [
			OPENAI_MODELS_DOCS,
			OPENAI_PRICING_DOCS,
			OPENAI_IMAGE_DOCS,
			OPENAI_VIDEO_DOCS
		];
		case "anthropic": return [ANTHROPIC_MODELS_DOCS, ANTHROPIC_PRICING_DOCS];
		case "google":
		case "google-vertex": return [
			GOOGLE_MODELS_DOCS,
			GOOGLE_PRICING_DOCS,
			GOOGLE_VIDEO_DOCS
		];
		case "deepseek": return [DEEPSEEK_MODELS_DOCS, DEEPSEEK_PRICING_DOCS];
		case "moonshotai":
		case "moonshotai-cn": return [KIMI_MODELS_DOCS, KIMI_PRICING_DOCS];
		case "zai":
		case "zai-coding-cn": return [ZAI_MODELS_DOCS, ZAI_PRICING_DOCS];
		case "xai": return [XAI_MODELS_DOCS, XAI_PRICING_DOCS];
		case "qwen-token-plan":
		case "qwen-token-plan-cn": return [
			QWEN_MODELS_DOCS,
			QWEN_PRICING_DOCS,
			QWEN_OPEN_WEIGHTS_DOCS
		];
		case "minimax":
		case "minimax-cn": return [
			MINIMAX_MODELS_DOCS,
			MINIMAX_H3_DOCS,
			MINIMAX_H3_OPEN_SOURCE_DOCS,
			MINIMAX_MULTIMODAL_DOCS,
			MINIMAX_IMAGE_DOCS,
			MINIMAX_PRICING_DOCS,
			MINIMAX_LOCAL_DEPLOY_DOCS
		];
		case "mistral": return [MISTRAL_MODELS_DOCS, MISTRAL_PRICING_DOCS];
		default: return [];
	}
}
//#endregion
//#region lib/types/portraits/research.js
const RESEARCH_EVIDENCE_KINDS = /* @__PURE__ */ new Set(["provider-doc", "benchmark"]);
const RESEARCHABLE_GAPS = [
	"description",
	"pricing",
	"specialties",
	"limitations",
	"evidence"
];
/**
* List portrait fields that still need research or a live probe.
*
* Args:
*   portrait: Stored portrait, or undefined when none exists.
*
* Returns:
*   Gap ids. `lastProbe` is measured, not researched.
*/
function portraitGaps(portrait) {
	const gaps = [];
	if (portrait === void 0 || portrait.description === void 0 && portrait.summary === void 0) gaps.push("description");
	if (portrait === void 0 || portrait.pricing.rates.length === 0) gaps.push("pricing");
	if (portrait === void 0 || portrait.specialties.length === 0) gaps.push("specialties");
	if (portrait === void 0 || portrait.limitations.length === 0) gaps.push("limitations");
	if (portrait === void 0 || portrait.evidence.length === 0) gaps.push("evidence");
	if (portrait?.performance.lastProbe === void 0) gaps.push("lastProbe");
	return gaps;
}
/**
* Build a research plan from gaps and bundled official documentation URLs.
*
* Args:
*   provider: Provider id used to look up official documentation entry points.
*   gaps: Gap ids from `portraitGaps`.
*
* Returns:
*   Suggested sources and questions. lastProbe is never a research question.
*/
function researchPlanFor(provider, gaps) {
	const suggestedSources = [...officialResearchSources(provider)];
	return {
		suggestedSources,
		questions: RESEARCHABLE_GAPS.filter((field) => gaps.includes(field)).map((field) => ({
			field,
			question: questionFor(field),
			suggestedSources
		})),
		lastProbe: gaps.includes("lastProbe") ? "Run the Settings speed test or an approved live probe. Do not copy documentation latency into lastProbe." : void 0
	};
}
/**
* Merge Agent-researched, source-backed facts into a stored portrait.
*
* Registration I/O stays on the route. lastProbe is preserved from the stored
* portrait and cannot be written from research findings.
*
* Args:
*   ctx: Host context with settings, credentials, and llm.
*   input: Target id plus researched findings. Evidence sources must be http(s) URLs.
*
* Returns:
*   The upserted portrait. Never includes secrets.
*/
async function ingestPortraitResearch(ctx, input) {
	const target = await resolvePortraitTarget(ctx, input.id);
	const findings = input.findings;
	if (findings.performance !== void 0 && Object.prototype.hasOwnProperty.call(findings.performance, "lastProbe")) throw new ModelManagerError("ingest_portrait_research cannot write lastProbe; use the Settings speed test or an approved live probe", "RESEARCH_CANNOT_WRITE_PROBE");
	const incomingEvidence = findings.evidence ?? [];
	if (incomingEvidence.length === 0) throw new ModelManagerError("ingest_portrait_research requires at least one evidence record with a source URL", "RESEARCH_EVIDENCE_REQUIRED");
	for (const [index, item] of incomingEvidence.entries()) {
		if (!RESEARCH_EVIDENCE_KINDS.has(item.kind)) throw new ModelManagerError(`evidence[${index}].kind must be provider-doc or benchmark`, "RESEARCH_EVIDENCE_KIND_INVALID");
		if (!httpUrl(item.source)) throw new ModelManagerError(`evidence[${index}].source must be an http(s) URL`, "RESEARCH_EVIDENCE_SOURCE_INVALID");
	}
	const existing = target.portrait ?? initialPortrait();
	const evidence = mergeEvidence(existing.evidence, incomingEvidence);
	const rates = findings.pricing?.rates ?? existing.pricing.rates;
	const evidenceIds = new Set(evidence.map((item) => item.id));
	for (const [index, rate] of rates.entries()) if (rate.evidenceId === void 0 || !evidenceIds.has(rate.evidenceId)) throw new ModelManagerError(`pricing.rates[${index}] must reference an evidence id gathered during research`, "RESEARCH_PRICE_EVIDENCE_REQUIRED");
	const portrait = {
		...findings.description === void 0 && existing.description === void 0 ? {} : { description: findings.description ?? existing.description },
		...findings.summary === void 0 && existing.summary === void 0 ? {} : { summary: findings.summary ?? existing.summary },
		specialties: findings.specialties ?? existing.specialties,
		limitations: findings.limitations ?? existing.limitations,
		bestFor: findings.bestFor ?? existing.bestFor,
		avoidFor: findings.avoidFor ?? existing.avoidFor,
		pricing: {
			rates,
			...findings.pricing?.notes === void 0 && existing.pricing.notes === void 0 ? {} : { notes: findings.pricing?.notes ?? existing.pricing.notes }
		},
		performance: {
			...findings.performance?.speedClass === void 0 && existing.performance.speedClass === void 0 ? {} : { speedClass: findings.performance?.speedClass ?? existing.performance.speedClass },
			...findings.performance?.typicalLatencyMs === void 0 && existing.performance.typicalLatencyMs === void 0 ? {} : { typicalLatencyMs: findings.performance?.typicalLatencyMs ?? existing.performance.typicalLatencyMs },
			...findings.performance?.throughputPerMinute === void 0 && existing.performance.throughputPerMinute === void 0 ? {} : { throughputPerMinute: findings.performance?.throughputPerMinute ?? existing.performance.throughputPerMinute },
			...findings.performance?.notes === void 0 && existing.performance.notes === void 0 ? {} : { notes: findings.performance?.notes ?? existing.performance.notes },
			...existing.performance.lastProbe === void 0 ? {} : { lastProbe: existing.performance.lastProbe }
		},
		qualityScores: findings.qualityScores ?? existing.qualityScores,
		evidence
	};
	return {
		...await upsertModelPortrait(ctx, {
			id: target.id,
			portrait
		}),
		mergedFrom: "research",
		preservedLastProbe: existing.performance.lastProbe !== void 0,
		next: `Call validate_model_portrait for '${target.id}' with liveProbe=false.`
	};
}
/**
* Write a research question for one missing portrait field.
*
* Args:
*   field: Researchable gap id.
*
* Returns:
*   An instruction the Agent can follow on official documentation.
*/
function questionFor(field) {
	switch (field) {
		case "description": return "Write a short Markdown description from current official documentation. Do not invent capabilities.";
		case "pricing": return "Extract current official price rates with unit, amount, currency, and the exact documentation URL as evidence.";
		case "specialties": return "List documented strengths only. Cite the page in evidence.";
		case "limitations": return "List documented limits, quotas, or unsupported cases. Cite the page in evidence.";
		case "evidence": return "Record every used documentation URL as provider-doc evidence with observedAt and the claims it supports.";
	}
}
/**
* Merge stored evidence with newly researched records, replacing the same id.
*
* Args:
*   existing: Evidence already on the portrait.
*   incoming: Evidence gathered during this research pass.
*
* Returns:
*   Combined evidence, with incoming ids taking precedence.
*/
function mergeEvidence(existing, incoming) {
	const byId = new Map(existing.map((item) => [item.id, item]));
	for (const item of incoming) byId.set(item.id, item);
	return [...byId.values()];
}
/**
* Return whether a string is an http or https URL.
*
* Args:
*   value: Evidence source field.
*
* Returns:
*   True when the source can be opened as a web page.
*/
function httpUrl(value) {
	try {
		const url = new URL(value);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}
//#endregion
//#region lib/types/portraits/workflow.js
/**
* Start the portrait workflow: seed known facts, list gaps, and give a research plan.
*
* The Agent should open suggestedSources, then call ingest_portrait_research.
* lastProbe is never filled from documentation.
*
* Args:
*   ctx: Host context with settings, credentials, and llm.
*   input: Optional exact ids. Omit to find enabled models whose portraits are not valid.
*   signal: Optional abort signal used while listing language-model catalogs.
*
* Returns:
*   Candidates with seed, gaps, and a research plan. Never includes secrets.
*/
async function prepareModelPortraits(ctx, input, signal) {
	const config = portraitRegistry(ctx);
	const requested = input.ids === void 0 ? void 0 : new Set(input.ids.map((id) => id.trim()).filter(Boolean));
	const candidates = [];
	for (const [id, registration] of Object.entries(config.models)) {
		if (requested !== void 0 && !requested.has(id)) continue;
		if (requested === void 0 && input.includeDisabled !== true && registration.enabled === false) continue;
		const provider = config.connections[registration.connection]?.provider ?? registration.connection;
		const storedPortrait = registration.portrait;
		const bundledPortrait = builtinTaskPortrait(provider, registration.model, registration.task);
		const portrait = storedPortrait ?? bundledPortrait;
		const gaps = portraitGaps(portrait);
		candidates.push({
			id,
			kind: "task",
			provider,
			model: registration.model,
			displayName: registration.displayName,
			declared: {
				task: registration.task,
				input: registration.input,
				output: registration.output,
				execution: registration.execution,
				capabilities: registration.capabilities ?? []
			},
			portraitState: portrait?.validation.state ?? "missing",
			...portrait === void 0 ? {} : { portraitSource: storedPortrait === void 0 ? "bundled" : "stored" },
			needsInitialPortrait: portrait === void 0 || portrait.validation.state !== "valid",
			seed: taskSeed(provider, registration.model, registration, portrait),
			gaps,
			researchPlan: researchPlanFor(provider, gaps)
		});
	}
	const warnings = [];
	for (const provider of ctx.llm.listProviders()) try {
		for (const model of await ctx.llm.listModels(provider.id)) {
			const id = llmTargetId(provider.id, model.id);
			if (requested !== void 0 && !requested.has(id)) continue;
			const storedPortrait = config.portraits?.[id]?.portrait;
			const bundledPortrait = builtinLlmPortrait(provider.id, model.id);
			const portrait = storedPortrait ?? bundledPortrait;
			const gaps = portraitGaps(portrait);
			let contextWindow;
			let defaultMaxTokens;
			try {
				const info = await ctx.llm.resolveModelInfo(provider.id, model.id, signal);
				contextWindow = info.context?.contextWindow;
				defaultMaxTokens = info.defaultMaxTokens;
			} catch {
				warnings.push(`${id}: model info unavailable`);
			}
			candidates.push({
				id,
				kind: "llm",
				provider: provider.id,
				model: model.id,
				displayName: model.name,
				declared: {
					input: model.inputModalities ?? [],
					output: ["text"],
					...contextWindow === void 0 ? {} : { contextWindow },
					...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens }
				},
				portraitState: portrait?.validation.state ?? "missing",
				...portrait === void 0 ? {} : { portraitSource: storedPortrait === void 0 ? "bundled" : "stored" },
				needsInitialPortrait: portrait === void 0 || portrait.validation.state !== "valid",
				seed: {
					kind: "llm",
					provider: provider.id,
					model: model.id,
					input: model.inputModalities ?? [],
					output: ["text"],
					...contextWindow === void 0 ? {} : { contextWindow },
					...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
					...portrait?.performance.lastProbe === void 0 ? {} : { lastProbe: portrait.performance.lastProbe }
				},
				gaps,
				researchPlan: researchPlanFor(provider.id, gaps)
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
			"Use seed facts as-is; do not rewrite registered input, output, capabilities, or lastProbe.",
			"Open researchPlan.suggestedSources and extract only facts the pages currently state.",
			"Call ingest_portrait_research with http(s) evidence URLs. Price rates must reference those evidence ids.",
			"Do not write lastProbe from documentation; use the Settings speed test or an approved live probe.",
			"Immediately call validate_model_portrait with liveProbe=false; only perform a paid/provider-traffic probe with explicit user approval.",
			"Use summarize_model_usage to incorporate native Harness LLM observations and task-model invocation observations; never copy request or response content into the portrait."
		],
		warnings,
		signalAborted: signal?.aborted === true
	};
}
/**
* Copy registration facts the Agent must not invent during research.
*
* Args:
*   provider: Connection provider id.
*   model: Provider model id.
*   registration: Stored task-model registration.
*   portrait: Stored portrait, if any.
*
* Returns:
*   Seed facts plus lastProbe when a live test already exists.
*/
function taskSeed(provider, model, registration, portrait) {
	return {
		kind: "task",
		provider,
		model,
		task: registration.task,
		input: [...registration.input],
		output: [...registration.output],
		execution: registration.execution,
		capabilities: [...registration.capabilities ?? []],
		operations: [...registration.operations],
		...portrait?.performance.lastProbe === void 0 ? {} : { lastProbe: portrait.performance.lastProbe }
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
const priceRateSchema = {
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
					items: priceRateSchema,
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
			name: INGEST_PORTRAIT_RESEARCH_SURFACE.name,
			description: INGEST_PORTRAIT_RESEARCH_SURFACE.description,
			parameters: {
				id: {
					type: "string",
					required: true,
					description: INGEST_PORTRAIT_RESEARCH_SURFACE.parameters.id
				},
				findings: {
					type: "object",
					required: true,
					additionalProperties: false,
					description: INGEST_PORTRAIT_RESEARCH_SURFACE.parameters.findings,
					properties: {
						description: {
							type: "string",
							description: "Markdown description taken from official documentation."
						},
						summary: {
							type: "string",
							description: "Optional short summary taken from official documentation."
						},
						specialties: {
							type: "array",
							items: { type: "string" },
							description: "Documented strengths."
						},
						limitations: {
							type: "array",
							items: { type: "string" },
							description: "Documented limits."
						},
						bestFor: {
							type: "array",
							items: { type: "string" },
							description: "Documented suitable uses."
						},
						avoidFor: {
							type: "array",
							items: { type: "string" },
							description: "Documented unsuitable uses."
						},
						pricing: {
							type: "object",
							additionalProperties: false,
							properties: {
								rates: {
									type: "array",
									items: priceRateSchema,
									description: "Official price rates; each rate needs an evidence id."
								},
								notes: {
									type: "string",
									description: "Pricing caveats copied from the source page."
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
									description: "Coarse speed class only when the source states it."
								},
								typicalLatencyMs: {
									type: "object",
									additionalProperties: false,
									properties: {
										min: {
											type: "number",
											required: true,
											description: "Documented lower latency bound."
										},
										max: {
											type: "number",
											required: true,
											description: "Documented upper latency bound."
										}
									}
								},
								throughputPerMinute: {
									type: "number",
									description: "Documented throughput, if stated."
								},
								notes: {
									type: "string",
									description: "Measurement context from the source page."
								}
							}
						},
						qualityScores: {
							type: "object",
							additionalProperties: true,
							description: "Optional 0..1 scores only when the source supports them."
						},
						evidence: {
							type: "array",
							required: true,
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
										enum: ["provider-doc", "benchmark"],
										description: "Research evidence class."
									},
									source: {
										type: "string",
										required: true,
										description: "http(s) URL of the page that stated the claims."
									},
									observedAt: {
										type: "string",
										required: true,
										description: "ISO date/time when the page was read."
									},
									claims: {
										type: "array",
										required: true,
										items: { type: "string" },
										description: "Claims copied from that page."
									},
									notes: {
										type: "string",
										description: "Optional limitations of the source."
									}
								}
							},
							description: "Required source URLs. lastProbe evidence is not accepted here."
						}
					}
				}
			},
			output: jsonOutput,
			execute: async (args) => asJsonValue(await ingestPortraitResearch(ctx, args))
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
/** HTTP path for the paid Settings availability probe. */
const MODEL_PROBE_PATH = "/dsh-multi-model-provider/probe";
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
/**
* Decide whether a browser request is same-origin with the Host header.
*
* Args:
*   req: Incoming HTTP request, or a headers-only stand-in used by tests.
*
* Returns:
*   True when Origin uses http(s) and its host matches the Host header.
*/
function isSameOriginHttpRequest(req) {
	const origin = String(req.headers.origin ?? "");
	const host = String(req.headers.host ?? "");
	if (!origin || !host) return false;
	try {
		const parsed = new URL(origin);
		return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host === host;
	} catch {
		return false;
	}
}
/**
* Refuse a paid LLM probe unless it looks like the local Settings UI.
*
* A static marker header is not enough: any client that can set it could
* stream against the user's configured models. Same-origin Origin matching,
* plus Sec-Fetch-Site when the browser sends it, keeps the bill on this page.
*
* Args:
*   req: Incoming HTTP request, or a headers-only stand-in used by tests.
*
* Returns:
*   `{ ok: true }` when the probe may run, otherwise a 403 payload to send.
*/
function authorizePaidModelProbe(req) {
	if (req.headers["x-dsh-model-probe"] !== "1") return {
		ok: false,
		status: 403,
		error: "missing model probe request marker"
	};
	const fetchSite = req.headers["sec-fetch-site"];
	if (typeof fetchSite === "string" && fetchSite !== "same-origin") return {
		ok: false,
		status: 403,
		error: "model probe must be same-origin"
	};
	if (!isSameOriginHttpRequest(req)) return {
		ok: false,
		status: 403,
		error: "model probe must be a same-origin Settings request"
	};
	return { ok: true };
}
/**
* Stream one eight-token ping so Settings can record reachability and latency.
*
* Args:
*   llm: Host language-model runtime used for the billed ping.
*   provider: llm-pi-ai provider route id.
*   model: Exact model id on that route.
*
* Returns:
*   Reachability payload with latency; throws when the model stream fails.
*/
async function runPaidModelProbe(llm, provider, model) {
	await llm.resolveModelInfo(provider, model);
	const started = performance.now();
	let firstTokenAt;
	let finish;
	const signal = AbortSignal.timeout(2e4);
	for await (const chunk of llm.stream({
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
	return {
		ok: true,
		provider,
		model,
		observedAt: (/* @__PURE__ */ new Date()).toISOString(),
		latencyMs: Math.round(ended - started),
		...firstTokenAt === void 0 ? {} : { timeToFirstTokenMs: Math.round(firstTokenAt - started) }
	};
}
/** Mount the explicit, minimally billed per-model availability/latency probe. */
function registerModelProbeRoute(ctx) {
	ctx.inject(["webServer"], (scope) => {
		scope.webServer.register({
			kind: "exact",
			path: MODEL_PROBE_PATH,
			handler: async (req, res) => {
				if (req.method !== "POST") {
					res.writeHead(405, { allow: "POST" });
					res.end();
					return;
				}
				const auth = authorizePaidModelProbe(req);
				if (!auth.ok) {
					sendJson(res, auth.status, {
						ok: false,
						error: auth.error
					});
					return;
				}
				try {
					const body = await readJson(req);
					const provider = routeId(body.provider, "provider");
					const model = routeId(body.model, "model");
					sendJson(res, 200, await runPaidModelProbe(scope.llm, provider, model));
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
	const existingProviders = new Set(ctx.llm.listConfigurableProviders().map((entry) => entry.provider));
	if (!existingProviders.has("volcengine")) ctx.llm.registerConfigurableProviders([{
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
		declared: false
	}]);
	if (!existingProviders.has("doubao-speech")) ctx.llm.registerConfigurableProviders([{
		provider: DOUBAO_SPEECH_PROVIDER,
		displayName: "豆包语音",
		settingsNs: "multi-model-provider",
		settingsPath: ["connections", DOUBAO_SPEECH_PROVIDER],
		settingsEditor: "provider",
		profileDefaults: {
			provider: DOUBAO_SPEECH_PROVIDER,
			displayName: "豆包语音",
			apiKeyEnv: "DOUBAO_API_KEY",
			credentialRef: "DOUBAO_API_KEY",
			credentialRefs: {
				apiKey: "DOUBAO_API_KEY",
				realtimeApiKey: "DOUBAO_API_KEY"
			},
			baseURL: "wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue",
			models: [],
			profile: { product: "doubao-realtime-speech" }
		},
		cleanupPaths: [...DOUBAO_SPEECH_LEGACY_CATALOG, ...DOUBAO_SPEECH_CATALOG].map((entry) => ["models", entry.id]),
		credentialRefs: [
			"DOUBAO_API_KEY",
			"DOUBAO_APPID",
			"DOUBAO_TOKEN",
			"DOUBAO_REALTIME_API_KEY"
		],
		userConfigured: true,
		declared: false
	}]);
	ctx.llm.registerModelDiscovery("multi-model-provider", async (request) => {
		if (request.provider !== "doubao-speech") return [];
		return DOUBAO_SPEECH_CATALOG.map((entry) => ({
			id: String(entry.registration.profile?.voice ?? entry.id),
			...entry.registration.displayName === void 0 ? {} : { name: entry.registration.displayName }
		}));
	});
	new TaskModelRuntime(ctx);
	new RealtimeModelRuntime(ctx);
	new ModelCatalog(ctx);
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
export { ANTHROPIC_MODELS_DOCS, ANTHROPIC_PRICING_DOCS, BUILTIN_TASK_MODEL_REGISTRY, CONFIGURE_MODEL_ROUTE_SURFACE, CURATED_LLM_PORTRAIT_IDS, CURATED_LLM_PORTRAIT_SELECTION, CURATED_PORTABLE_LLM_MODEL_IDS, CURATED_TASK_MODEL_PORTRAIT_IDS, CURATED_TASK_MODEL_PORTRAIT_SELECTION, DEEPSEEK_MODELS_DOCS, DEEPSEEK_PRICING_DOCS, DISCOVER_TASK_MODELS_SURFACE, DOUBAO_SPEECH_DOCS, GET_MODEL_PORTRAIT_SURFACE, GOOGLE_MODELS_DOCS, GOOGLE_PRICING_DOCS, GOOGLE_VIDEO_DOCS, HELP, INGEST_PORTRAIT_RESEARCH_SURFACE, INSPECT_VOLCENGINE_PROVIDER_SURFACE, INVOKE_TASK_MODEL_SURFACE, KIMI_MODELS_DOCS, KIMI_PRICING_DOCS, LIST_MODEL_ROUTES_SURFACE, LIST_TASK_MODELS_SURFACE, MINIMAX_H3_DOCS, MINIMAX_H3_OPEN_SOURCE_DOCS, MINIMAX_IMAGE_DOCS, MINIMAX_LOCAL_DEPLOY_DOCS, MINIMAX_MODELS_DOCS, MINIMAX_MULTIMODAL_DOCS, MINIMAX_PRICING_DOCS, MISTRAL_MODELS_DOCS, MISTRAL_PRICING_DOCS, MODEL_EXECUTION_MODES, MODEL_MANAGER_GUIDANCE, MODEL_MANAGER_TOOL_SURFACES, MODEL_MODALITIES, ModelCatalog, ModelManagerError, OPENAI_IMAGE_DOCS, OPENAI_MODELS_DOCS, OPENAI_PRICING_DOCS, OPENAI_VIDEO_DOCS, PI_AI_SETTINGS_NAMESPACE, PREPARE_MODEL_PORTRAITS_SURFACE, QWEN_MODELS_DOCS, QWEN_OPEN_WEIGHTS_DOCS, QWEN_PRICING_DOCS, REGISTER_TASK_MODEL_SURFACE, RealtimeModelRuntime, SELECT_DEFAULT_MODEL_SURFACE, SELECT_TASK_MODELS_SURFACE, SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE, SUMMARIZE_MODEL_USAGE_SURFACE, TASK_MODEL_CAPABILITIES, TASK_MODEL_REGISTRY_SCHEMA, TASK_MODEL_SETTINGS_NAMESPACE, TASK_MODEL_TASKS, TOOL_NAMES, TaskModelRuntime, UPSERT_MODEL_PORTRAIT_SURFACE, VALIDATE_MODEL_PORTRAIT_SURFACE, VERSION, VOLCENGINE_ARK_API, VOLCENGINE_ARK_BASE_URL, VOLCENGINE_ARK_DOCS, VOLCENGINE_PROVIDER, XAI_MODELS_DOCS, XAI_PRICING_DOCS, ZAI_MODELS_DOCS, ZAI_PRICING_DOCS, apply, builtinLlmPortrait, builtinTaskPortrait, configureModelRoute, discoverTaskModels, getModelPortrait, ingestPortraitResearch, initialPortrait, inject, inspectVolcengineProvider, invokeTaskModel, listModelRoutes, listTaskModels, llmObservations, modelManagerTools, mutatePortraitSettings, name, normalizePortrait, officialResearchSources, portraitChecks, portraitGaps, portraitRegistry, portraitSettings, prepareModelPortraits, recordTaskModelObservation, registerTaskModel, registerTaskModelSettings, researchPlanFor, resolvePortraitTarget, resolveTaskModelRoute, selectAgentModel, selectDefaultModel, selectTaskModels, selectVolcengineLanguageModels, snapshotModelCatalog, summarizeModelUsage, taskModelObservations, upsertModelPortrait, validateModelPortrait, validateTaskModelRegistry };
