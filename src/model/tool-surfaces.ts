/**
 * Model-visible surfaces of the model-management tools.
 *
 * Names, descriptions, and parameter descriptions live here; `../tools.ts` only
 * assembles them with their execute bodies. Each description states both when to
 * use the tool and when not to, and points at the tool that lists current state,
 * so the model can discover reality instead of guessing.
 *
 * @module dsh-multi-model-provider
 */

/** Shared parameter fragments so one wording change lands in one place. */
const NEVER_A_SECRET = 'Never pass a secret; pass a reference name only.'

/** Tool that lists language/chat provider routes. */
export const LIST_MODEL_ROUTES_SURFACE = {
  name: 'list_model_routes',
  description: 'Inspect registered LLM provider routes, safe credential status, and supported models. Use it before configure_model_route or select_default_model to learn which routes and model ids actually exist. Do not use it for image, speech, audio, video, embedding, or reranking routes; those live in list_task_models. Returns live routes by default and never returns credential values.',
  parameters: {
    provider: 'Optional exact provider route to inspect.',
    includeDormant: 'Include configurable catalog routes that are not active.',
    includeModels: 'Include model catalogs for live routes; defaults to true.',
  },
  helpPointer: 'list_model_routes',
} as const

/** Tool that creates or updates a language/chat provider route. */
export const CONFIGURE_MODEL_ROUTE_SURFACE = {
  name: 'configure_model_route',
  description: 'Create or update one llm-pi-ai provider profile without deleting fields that were not supplied. Use it when a language/chat route is missing, its endpoint changed, or its credential reference must be set; run list_model_routes first to see the current state. Do not use it to register non-language routes, and do not use it to change the model of an existing session. It accepts only a credential reference such as OPENAI_API_KEY and never an API key value. For the built-in openai route, normally provide only provider=openai and apiKeyEnv=OPENAI_API_KEY; omit endpoint and models to inherit the pi-ai catalog.',
  parameters: {
    provider: 'Unique route id, for example openai or team-openai.',
    apiKeyEnv: `Credential reference in POSIX environment-variable form. ${NEVER_A_SECRET}`,
    displayName: 'Human-readable provider name.',
    api: 'Wire protocol. Omit on a built-in catalog route.',
    baseURL: 'Absolute provider endpoint. Omit on a built-in catalog route.',
    models: 'Complete served catalog for a declared route. On a built-in route, a non-empty list replaces its catalog. Omit requestMaxTokens unless every request must send that explicit output limit.',
    defaultContextWindow: 'Fallback context capacity for unsized declared models.',
    defaultMaxTokens: 'Fallback per-request output limit for unsized declared models. Omit to let the runtime and endpoint choose a safe value.',
  },
  helpPointer: 'list_model_routes',
} as const

export const INSPECT_VOLCENGINE_PROVIDER_SURFACE = {
  name: 'inspect_volcengine_provider',
  description: 'Inspect the unified Volcengine provider configuration, safe credential status, the authenticated Ark model catalog, selected language/VLM models, registered task routes, and the correct invocation path for each class. Use it immediately whenever the user asks which 火山/方舟/豆包 models are available, how to configure them, or how to call them; installation is expected to make this workflow discoverable without YAML knowledge. Do not use it to expose credential values, assume catalog entries are all language models, or claim registered-only task routes are callable.',
  parameters: {},
  helpPointer: 'inspect_volcengine_provider',
} as const

export const SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE = {
  name: 'select_volcengine_language_models',
  description: 'Replace the selected Ark language/VLM model catalog and configure the llm-pi-ai provider=volcengine route with the official openai-completions endpoint. Use it after inspect_volcengine_provider and authoritative model metadata review; pass an empty models array to disable every Volcengine LLM without fallback. Do not use it for image/video generation, speech, audio, embedding, or other task routes, and verify the result with inspect_volcengine_provider.',
  parameters: {
    models: 'Complete selected language/VLM model profiles from Ark discovery. Pass [] to remove the Volcengine LLM route and select nothing.',
  },
  helpPointer: 'inspect_volcengine_provider',
} as const

/** Tool that lists non-language task-model routes. */
export const LIST_TASK_MODELS_SURFACE = {
  name: 'list_task_models',
  description: 'Inspect registered non-language task models such as image, speech, audio, video, embedding, and reranking routes. Use it before register_task_model, and use it to check declared cross-provider capabilities and whether a route is merely registered or actually callable. Do not use it for language/chat models; those live in list_model_routes. Registration and runtime callability are reported separately, and no credential values are returned.',
  parameters: {
    id: 'Optional exact registry id, for example openai/gpt-image-2.',
    provider: 'Optional provider-family filter.',
    task: 'Optional semantic-task filter.',
    includeProfile: 'Include provider-specific non-secret model profile metadata.',
  },
  helpPointer: 'list_task_models',
} as const

export const DISCOVER_TASK_MODELS_SURFACE = {
  name: 'discover_task_models',
  description: 'Query one provider connection\'s authenticated model catalog and show which upstream ids are already registered and enabled. Use it before registering provider models or refreshing an available-model selector. Do not use it as proof that every catalog item is callable, and do not assume discovery changes registration or selection; inspect the result with list_task_models.',
  parameters: {
    connection: 'Exact reusable connection id, for example volcengine.',
  },
  helpPointer: 'list_task_models',
} as const

export const SELECT_TASK_MODELS_SURFACE = {
  name: 'select_task_models',
  description: 'Replace the enabled task-model set for one connection. Use it when the user changes which registered multimodal models are available; an empty ids array intentionally disables all models and never falls back to selecting everything. Do not use it to register new upstream ids or select the primary language model; verify the result with list_task_models.',
  parameters: {
    connection: 'Exact reusable connection id whose registered routes will be updated.',
    ids: 'Complete set of registered route ids to enable. Pass [] to disable every route on the connection.',
  },
  helpPointer: 'list_task_models',
} as const

/** Tool that creates or updates a non-language task-model registration. */
export const REGISTER_TASK_MODEL_SURFACE = {
  name: 'register_task_model',
  description: 'Create or update a non-language task-model registration and its reusable connection profile. Use it for image, speech, audio, video, embedding, reranking, and realtime routes; run list_task_models first to see what is already registered. Do not use it for language/chat models, which must go through configure_model_route so llm-pi-ai stays authoritative, and never describe a route registered this way as callable until a compatible runtime adapter is installed. It stores catalog metadata and credential references only and never accepts an API key value or another secret value.',
  parameters: {
    id: 'Stable route id, for example openai/gpt-image-2.',
    connection: 'Reusable connection id, for example openai.',
    provider: 'Provider family; required when creating a new connection.',
    connectionDisplayName: 'Human-readable connection name.',
    credentialRef: `Legacy single credential reference such as OPENAI_API_KEY. ${NEVER_A_SECRET}`,
    credentialRefs: `Named credential references for providers that require multiple credential slots. Values are reference names, not secrets. ${NEVER_A_SECRET}`,
    baseURL: 'Optional absolute API base URL.',
    catalogEndpoint: 'Optional absolute model-catalog URL; when omitted discovery uses baseURL/models.',
    catalogCredentialName: 'Credential slot used for catalog discovery, for example arkApiKey or default.',
    connectionProfile: 'Optional provider-level non-secret metadata such as region, defaultVoice, or catalog-discovery mode.',
    model: 'Exact provider model id.',
    displayName: 'Human-readable model name.',
    task: 'Semantic task served by the model.',
    runtimeAdapter: 'Adapter contract expected to execute this route.',
    enabled: 'Whether routing and direct invocation may use this route; defaults to true.',
    credentialNames: 'Connection credential slots required by this route, allowing one provider to expose products with different authentication.',
    input: 'Accepted modalities; sensible task defaults are used when omitted.',
    output: 'Produced modalities or data shapes; sensible task defaults are used when omitted.',
    execution: 'Invocation lifecycle.',
    capabilities: 'Stable cross-provider capability ids such as speech.transcribe.file, speech.synthesize.short, or speech.realtime_session.',
    operations: 'Supported operations, for example generate, edit, transcribe, or synthesize.',
    roles: 'Routing roles such as image-generator or speech-to-text.',
    profile: 'Optional provider-specific non-secret capability metadata.',
    portrait: 'Optional initial router-facing portrait; use upsert_model_portrait for evidence-backed price, speed, and strengths.',
  },
  helpPointer: 'list_task_models',
} as const

export const PREPARE_MODEL_PORTRAITS_SURFACE = {
  name: 'prepare_model_portraits',
  description: 'Start the on-demand portrait-research workflow for models already configured in the current profile. Use it immediately when the user asks to organize, create, or improve portraits for configured models—even if they do not list fields or tool steps—and infer model ids only from the immediately preceding registration or selection context. It returns seed facts, gaps, official documentation URLs, and the ingest/validate sequence. Do not use it for discovered, discussed, or built-in catalog models that the user has not configured; do not invent undocumented facts, write lastProbe from documentation, perform paid probes without approval, or ask the user to restate the portrait schema.',
  parameters: {
    ids: 'Optional exact configured task route ids or live LLM ids in llm:<provider>/<model> form. Infer these from recent registration or selection context when possible; omit to find configured models with missing or non-valid portraits.',
    includeDisabled: 'Include explicitly user-registered disabled task routes when ids are omitted; defaults to false. It never exposes unconfigured built-in catalog entries.',
  },
  helpPointer: 'prepare_model_portraits',
} as const

export const FETCH_PORTRAIT_SOURCE_SURFACE = {
  name: 'fetch_portrait_source',
  description: 'Open one exact first-party documentation URL approved by prepare_model_portraits for one configured model. Use it while following the collect-model-portraits skill when the normal Web tools are unavailable or an allowlisted source is sufficient. The id and URL must match the current research plan. Do not use it for arbitrary URLs, redirects, non-text responses, or oversized responses; they are rejected.',
  parameters: {
    id: 'Exact configured portrait target id returned by prepare_model_portraits.',
    url: 'Exact HTTP(S) URL copied from that target\'s researchPlan.suggestedSources.',
  },
  helpPointer: 'prepare_model_portraits',
} as const

export const INGEST_PORTRAIT_RESEARCH_SURFACE = {
  name: 'ingest_portrait_research',
  description: 'Merge Agent-researched portrait facts into a registered model after opening official documentation. Use it after prepare_model_portraits when prices, strengths, and limitations have http(s) source URLs. Do not use it to guess facts, write lastProbe from documentation, store secrets, or change registered input/output modalities.',
  parameters: {
    id: 'Exact task-model route id, or llm:<provider>/<model> for a language model.',
    findings: 'Researched non-secret facts. evidence is required; each source must be an http(s) URL; price rates must reference those evidence ids.',
  },
  helpPointer: 'prepare_model_portraits',
} as const

export const GET_MODEL_PORTRAIT_SURFACE = {
  name: 'get_model_portrait',
  description: 'Inspect one router-facing portrait for either an LLM or task model together with registered capabilities, input/output types, validation state, and optional current-session observations. Use it before choosing or comparing a model. Do not use it to invoke a model or edit its portrait.',
  parameters: {
    id: 'Exact task-model route id, or llm:<provider>/<model> for a language model.',
    includeEvidence: 'Include evidence records; defaults to true.',
    includeUsage: 'Include invocation observations aggregated from the current session.',
  },
  helpPointer: 'get_model_portrait',
} as const

export const UPSERT_MODEL_PORTRAIT_SURFACE = {
  name: 'upsert_model_portrait',
  description: 'Create or replace the evidence-backed portrait for a registered LLM or task model. Use it after the Harness Agent has gathered authoritative documentation or benchmark evidence for price, strengths, limitations, speed, modalities, and routing quality scores; then immediately call validate_model_portrait and inspect the result with get_model_portrait. Do not use it for secrets, raw request content, guessed facts, or unregistered models.',
  parameters: {
    id: 'Exact task-model route id, or llm:<provider>/<model> for a language model.',
    portrait: 'Complete non-secret portrait facts. Price and performance claims should reference evidence ids; quality scores are normalized from 0 to 1.',
  },
  helpPointer: 'get_model_portrait',
} as const

export const VALIDATE_MODEL_PORTRAIT_SURFACE = {
  name: 'validate_model_portrait',
  description: 'Validate a saved portrait against registration, credential status, adapter availability, evidence links, and optionally a live adapter probe. Use it after upsert_model_portrait or when get_model_portrait shows a portrait may be stale. Do not use it to create claims or to treat a missing adapter as proof that the provider model is invalid.',
  parameters: {
    id: 'Exact task-model route id, or llm:<provider>/<model> for a language model.',
    liveProbe: 'Ask the installed runtime adapter to perform a provider-safe live probe; may incur provider traffic or cost.',
  },
  helpPointer: 'get_model_portrait',
} as const

export const INVOKE_TASK_MODEL_SURFACE = {
  name: 'invoke_task_model',
  description: 'Invoke a registered non-realtime multimodal task model through its installed runtime adapter and record privacy-safe timing, outcome, modality, and cost metrics. Use it for request/response image, speech, audio, video, embedding, or reranking operations after list_task_models reports the route callable. Do not use it for realtime-speech routes; those require realtimeModelRuntime. Also do not use it for primary language/chat turns, unregistered operations, credential values, or inline binary data.',
  parameters: {
    id: 'Exact registered task-model route id.',
    operation: 'One operation declared by the route, for example synthesize or transcribe-file.',
    request: 'Adapter-neutral non-secret request metadata. Refer to URLs, attachment ids, or file handles instead of embedding binary data.',
  },
  helpPointer: 'list_task_models',
} as const

export const SUMMARIZE_MODEL_USAGE_SURFACE = {
  name: 'summarize_model_usage',
  description: 'Aggregate native Harness LLM calls and task-model calls in the current durable session into counts, success rate, latency percentiles, token usage, and estimated cost. Use it as measured evidence when reviewing a model portrait; collection is automatic during normal calls. Do not use it as a cross-session analytics database or as proof of quality without representative samples.',
  parameters: {
    id: 'Optional exact task route id or llm:<provider>/<model>; omit to summarize every observed model call in the current session.',
  },
  helpPointer: 'summarize_model_usage',
} as const

/** Tool that saves the default language model for newly created Agents. */
export const SELECT_DEFAULT_MODEL_SURFACE = {
  name: 'select_default_model',
  description: 'Validate and save the primary Agent language model from the registered live catalog. Use it when the user wants a different default going forward; run list_model_routes first to confirm the route is live and the model id is exact. Do not use it to switch the current session, which needs the session model selector, and do not use it for non-language task models.',
  parameters: {
    provider: 'Live provider route.',
    model: 'Exact model id on that route.',
    reasoningEffort: 'Optional effort id advertised by the selected model.',
  },
  helpPointer: 'list_model_routes',
} as const

/** Every model-visible tool surface, in registration order. */
export const MODEL_MANAGER_TOOL_SURFACES = [
  LIST_MODEL_ROUTES_SURFACE,
  CONFIGURE_MODEL_ROUTE_SURFACE,
  INSPECT_VOLCENGINE_PROVIDER_SURFACE,
  SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE,
  LIST_TASK_MODELS_SURFACE,
  DISCOVER_TASK_MODELS_SURFACE,
  SELECT_TASK_MODELS_SURFACE,
  REGISTER_TASK_MODEL_SURFACE,
  PREPARE_MODEL_PORTRAITS_SURFACE,
  FETCH_PORTRAIT_SOURCE_SURFACE,
  INGEST_PORTRAIT_RESEARCH_SURFACE,
  GET_MODEL_PORTRAIT_SURFACE,
  UPSERT_MODEL_PORTRAIT_SURFACE,
  VALIDATE_MODEL_PORTRAIT_SURFACE,
  INVOKE_TASK_MODEL_SURFACE,
  SUMMARIZE_MODEL_USAGE_SURFACE,
  SELECT_DEFAULT_MODEL_SURFACE,
] as const
