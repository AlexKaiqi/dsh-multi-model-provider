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
/** Tool that lists language/chat provider routes. */
export declare const LIST_MODEL_ROUTES_SURFACE: {
    readonly name: "list_model_routes";
    readonly description: "Inspect registered LLM provider routes, safe credential status, and supported models. Use it before configure_model_route or select_default_model to learn which routes and model ids actually exist. Do not use it for image, speech, audio, video, embedding, or reranking routes; those live in list_task_models. Returns live routes by default and never returns credential values.";
    readonly parameters: {
        readonly provider: "Optional exact provider route to inspect.";
        readonly includeDormant: "Include configurable catalog routes that are not active.";
        readonly includeModels: "Include model catalogs for live routes; defaults to true.";
    };
    readonly helpPointer: "list_model_routes";
};
/** Tool that creates or updates a language/chat provider route. */
export declare const CONFIGURE_MODEL_ROUTE_SURFACE: {
    readonly name: "configure_model_route";
    readonly description: "Create or update one llm-pi-ai provider profile without deleting fields that were not supplied. Use it when a language/chat route is missing, its endpoint changed, or its credential reference must be set; run list_model_routes first to see the current state. Do not use it to register non-language routes, and do not use it to change the model of an existing session. It accepts only a credential reference such as OPENAI_API_KEY and never an API key value. For the built-in openai route, normally provide only provider=openai and apiKeyEnv=OPENAI_API_KEY; omit endpoint and models to inherit the pi-ai catalog.";
    readonly parameters: {
        readonly provider: "Unique route id, for example openai or team-openai.";
        readonly apiKeyEnv: "Credential reference in POSIX environment-variable form. Never pass a secret; pass a reference name only.";
        readonly displayName: "Human-readable provider name.";
        readonly api: "Wire protocol. Omit on a built-in catalog route.";
        readonly baseURL: "Absolute provider endpoint. Omit on a built-in catalog route.";
        readonly models: "Complete served catalog for a declared route. On a built-in route, a non-empty list replaces its catalog. Omit requestMaxTokens unless every request must send that explicit output limit.";
        readonly defaultContextWindow: "Fallback context capacity for unsized declared models.";
        readonly defaultMaxTokens: "Fallback per-request output limit for unsized declared models. Omit to let the runtime and endpoint choose a safe value.";
    };
    readonly helpPointer: "list_model_routes";
};
export declare const INSPECT_VOLCENGINE_PROVIDER_SURFACE: {
    readonly name: "inspect_volcengine_provider";
    readonly description: "Inspect the unified Volcengine provider configuration, safe credential status, the authenticated Ark model catalog, selected language/VLM models, registered task routes, and the correct invocation path for each class. Use it immediately whenever the user asks which 火山/方舟/豆包 models are available, how to configure them, or how to call them; installation is expected to make this workflow discoverable without YAML knowledge. Do not use it to expose credential values, assume catalog entries are all language models, or claim registered-only task routes are callable.";
    readonly parameters: {};
    readonly helpPointer: "inspect_volcengine_provider";
};
export declare const SELECT_VOLCENGINE_LANGUAGE_MODELS_SURFACE: {
    readonly name: "select_volcengine_language_models";
    readonly description: "Replace one Ark language/VLM billing route: mode=payg configures provider=volcengine on /api/v3, while mode=agent-plan configures provider=volcengine-agent-plan on /api/plan/v3. The two routes coexist and never silently fall back to each other. Use it after inspect_volcengine_provider and authoritative model metadata review; an empty models array disables only the selected route. Do not use it for image/video generation, speech, audio, embedding, or other task routes, and verify the result with inspect_volcengine_provider.";
    readonly parameters: {
        readonly mode: "Billing route to replace: payg or agent-plan. Defaults to payg for compatibility.";
        readonly models: "Complete selected language/VLM profiles. Pass [] to remove only the selected billing route.";
    };
    readonly helpPointer: "inspect_volcengine_provider";
};
/** Tool that lists non-language task-model routes. */
export declare const LIST_TASK_MODELS_SURFACE: {
    readonly name: "list_task_models";
    readonly description: "Inspect registered non-language task models such as image, speech, audio, video, embedding, and reranking routes. Use it before register_task_model, and use it to check declared cross-provider capabilities and whether a route is merely registered or actually callable. Do not use it for language/chat models; those live in list_model_routes. Registration and runtime callability are reported separately, and no credential values are returned.";
    readonly parameters: {
        readonly id: "Optional exact registry id, for example openai/gpt-image-2.";
        readonly provider: "Optional provider-family filter.";
        readonly task: "Optional semantic-task filter.";
        readonly includeProfile: "Include provider-specific non-secret model profile metadata.";
    };
    readonly helpPointer: "list_task_models";
};
export declare const DISCOVER_TASK_MODELS_SURFACE: {
    readonly name: "discover_task_models";
    readonly description: "Query one provider connection's authenticated model catalog and show which upstream ids are already registered and enabled. Use it before registering provider models or refreshing an available-model selector. Do not use it as proof that every catalog item is callable, and do not assume discovery changes registration or selection; inspect the result with list_task_models.";
    readonly parameters: {
        readonly connection: "Exact reusable connection id, for example volcengine.";
    };
    readonly helpPointer: "list_task_models";
};
export declare const SELECT_TASK_MODELS_SURFACE: {
    readonly name: "select_task_models";
    readonly description: "Replace the enabled task-model set for one connection. Use it when the user changes which registered multimodal models are available; an empty ids array intentionally disables all models and never falls back to selecting everything. Do not use it to register new upstream ids or select the primary language model; verify the result with list_task_models.";
    readonly parameters: {
        readonly connection: "Exact reusable connection id whose registered routes will be updated.";
        readonly ids: "Complete set of registered route ids to enable. Pass [] to disable every route on the connection.";
    };
    readonly helpPointer: "list_task_models";
};
/** Tool that creates or updates a non-language task-model registration. */
export declare const REGISTER_TASK_MODEL_SURFACE: {
    readonly name: "register_task_model";
    readonly description: "Create or update a non-language task-model registration and its reusable connection profile. Use it for image, speech, audio, video, embedding, reranking, and realtime routes; run list_task_models first to see what is already registered. Do not use it for language/chat models, which must go through configure_model_route so llm-pi-ai stays authoritative, and never describe a route registered this way as callable until a compatible runtime adapter is installed. It stores catalog metadata and credential references only and never accepts an API key value or another secret value.";
    readonly parameters: {
        readonly id: "Stable route id, for example openai/gpt-image-2.";
        readonly connection: "Reusable connection id, for example openai.";
        readonly provider: "Provider family; required when creating a new connection.";
        readonly connectionDisplayName: "Human-readable connection name.";
        readonly credentialRef: "Legacy single credential reference such as OPENAI_API_KEY. Never pass a secret; pass a reference name only.";
        readonly credentialRefs: "Named credential references for providers that require multiple credential slots. Values are reference names, not secrets. Never pass a secret; pass a reference name only.";
        readonly baseURL: "Optional absolute API base URL.";
        readonly catalogEndpoint: "Optional absolute model-catalog URL; when omitted discovery uses baseURL/models.";
        readonly catalogCredentialName: "Credential slot used for catalog discovery, for example arkApiKey or default.";
        readonly connectionProfile: "Optional provider-level non-secret metadata such as region, defaultVoice, or catalog-discovery mode.";
        readonly model: "Exact provider model id.";
        readonly displayName: "Human-readable model name.";
        readonly task: "Semantic task served by the model.";
        readonly runtimeAdapter: "Adapter contract expected to execute this route.";
        readonly enabled: "Whether routing and direct invocation may use this route; defaults to true.";
        readonly credentialNames: "Connection credential slots required by this route, allowing one provider to expose products with different authentication.";
        readonly input: "Accepted modalities; sensible task defaults are used when omitted.";
        readonly output: "Produced modalities or data shapes; sensible task defaults are used when omitted.";
        readonly execution: "Invocation lifecycle.";
        readonly capabilities: "Stable cross-provider capability ids such as speech.transcribe.file, speech.synthesize.short, or speech.realtime_session.";
        readonly operations: "Supported operations, for example generate, edit, transcribe, or synthesize.";
        readonly roles: "Routing roles such as image-generator or speech-to-text.";
        readonly profile: "Optional provider-specific non-secret capability metadata.";
        readonly portrait: "Optional initial router-facing portrait; use upsert_model_portrait for evidence-backed price, speed, and strengths.";
    };
    readonly helpPointer: "list_task_models";
};
export declare const PREPARE_MODEL_PORTRAITS_SURFACE: {
    readonly name: "prepare_model_portraits";
    readonly description: "Start the on-demand portrait-research workflow for models already configured in the current profile. Use it immediately when the user asks to organize, create, or improve portraits for configured models—even if they do not list fields or tool steps—and infer model ids only from the immediately preceding registration or selection context. It returns seed facts, gaps, official documentation URLs, and the ingest/validate sequence. Do not use it for discovered, discussed, or built-in catalog models that the user has not configured; do not invent undocumented facts, write lastProbe from documentation, perform paid probes without approval, or ask the user to restate the portrait schema.";
    readonly parameters: {
        readonly ids: "Optional exact configured task route ids or live LLM ids in llm:<provider>/<model> form. Infer these from recent registration or selection context when possible; omit to find configured models with missing or non-valid portraits.";
        readonly includeDisabled: "Include explicitly user-registered disabled task routes when ids are omitted; defaults to false. It never exposes unconfigured built-in catalog entries.";
    };
    readonly helpPointer: "prepare_model_portraits";
};
export declare const FETCH_PORTRAIT_SOURCE_SURFACE: {
    readonly name: "fetch_portrait_source";
    readonly description: "Open one exact first-party documentation URL approved by prepare_model_portraits for one configured model. Use it while following the collect-model-portraits skill when the normal Web tools are unavailable or an allowlisted source is sufficient. The id and URL must match the current research plan. Do not use it for arbitrary URLs, redirects, non-text responses, or oversized responses; they are rejected.";
    readonly parameters: {
        readonly id: "Exact configured portrait target id returned by prepare_model_portraits.";
        readonly url: "Exact HTTP(S) URL copied from that target's researchPlan.suggestedSources.";
    };
    readonly helpPointer: "prepare_model_portraits";
};
export declare const INGEST_PORTRAIT_RESEARCH_SURFACE: {
    readonly name: "ingest_portrait_research";
    readonly description: "Merge Agent-researched portrait facts into a registered model after opening official documentation. Use it after prepare_model_portraits when prices, strengths, and limitations have http(s) source URLs. Do not use it to guess facts, write lastProbe from documentation, store secrets, or change registered input/output modalities.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly findings: "Researched non-secret facts. evidence is required; each source must be an http(s) URL; price rates must reference those evidence ids.";
    };
    readonly helpPointer: "prepare_model_portraits";
};
export declare const GET_MODEL_PORTRAIT_SURFACE: {
    readonly name: "get_model_portrait";
    readonly description: "Inspect one router-facing portrait for either an LLM or task model together with registered capabilities, input/output types, validation state, and optional current-session observations. Use it before choosing or comparing a model. Do not use it to invoke a model or edit its portrait.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly includeEvidence: "Include evidence records; defaults to true.";
        readonly includeUsage: "Include invocation observations aggregated from the current session.";
    };
    readonly helpPointer: "get_model_portrait";
};
export declare const UPSERT_MODEL_PORTRAIT_SURFACE: {
    readonly name: "upsert_model_portrait";
    readonly description: "Create or replace the evidence-backed portrait for a registered LLM or task model. Use it after the Harness Agent has gathered authoritative documentation or benchmark evidence for price, strengths, limitations, speed, modalities, and routing quality scores; then immediately call validate_model_portrait and inspect the result with get_model_portrait. Do not use it for secrets, raw request content, guessed facts, or unregistered models.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly portrait: "Complete non-secret portrait facts. Price and performance claims should reference evidence ids; quality scores are normalized from 0 to 1.";
    };
    readonly helpPointer: "get_model_portrait";
};
export declare const VALIDATE_MODEL_PORTRAIT_SURFACE: {
    readonly name: "validate_model_portrait";
    readonly description: "Validate a saved portrait against registration, credential status, adapter availability, evidence links, and optionally a live adapter probe. Use it after upsert_model_portrait or when get_model_portrait shows a portrait may be stale. Do not use it to create claims or to treat a missing adapter as proof that the provider model is invalid.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly liveProbe: "Ask the installed runtime adapter to perform a provider-safe live probe; may incur provider traffic or cost.";
    };
    readonly helpPointer: "get_model_portrait";
};
export declare const INVOKE_TASK_MODEL_SURFACE: {
    readonly name: "invoke_task_model";
    readonly description: "Invoke a registered non-realtime multimodal task model through its installed runtime adapter and record privacy-safe timing, outcome, modality, and cost metrics. Use it for request/response image, speech, audio, video, embedding, or reranking operations after list_task_models reports the route callable. Do not use it for realtime-speech routes; those require realtimeModelRuntime. Also do not use it for primary language/chat turns, unregistered operations, credential values, or inline binary data.";
    readonly parameters: {
        readonly id: "Exact registered task-model route id.";
        readonly operation: "One operation declared by the route, for example synthesize or transcribe-file.";
        readonly request: "Adapter-neutral non-secret request metadata. Refer to URLs, attachment ids, or file handles instead of embedding binary data.";
    };
    readonly helpPointer: "list_task_models";
};
export declare const SUMMARIZE_MODEL_USAGE_SURFACE: {
    readonly name: "summarize_model_usage";
    readonly description: "Aggregate native Harness LLM calls and task-model calls in the current durable session into counts, success rate, latency percentiles, token usage, and estimated cost. Use it as measured evidence when reviewing a model portrait; collection is automatic during normal calls. Do not use it as a cross-session analytics database or as proof of quality without representative samples.";
    readonly parameters: {
        readonly id: "Optional exact task route id or llm:<provider>/<model>; omit to summarize every observed model call in the current session.";
    };
    readonly helpPointer: "summarize_model_usage";
};
/** Tool that saves the default language model for newly created Agents. */
export declare const SELECT_DEFAULT_MODEL_SURFACE: {
    readonly name: "select_default_model";
    readonly description: "Validate and save the primary Agent language model from the registered live catalog. Use it when the user wants a different default going forward; run list_model_routes first to confirm the route is live and the model id is exact. Do not use it to switch the current session, which needs the session model selector, and do not use it for non-language task models.";
    readonly parameters: {
        readonly provider: "Live provider route.";
        readonly model: "Exact model id on that route.";
        readonly reasoningEffort: "Optional effort id advertised by the selected model.";
    };
    readonly helpPointer: "list_model_routes";
};
/** Every model-visible tool surface, in registration order. */
export declare const MODEL_MANAGER_TOOL_SURFACES: readonly [{
    readonly name: "list_model_routes";
    readonly description: "Inspect registered LLM provider routes, safe credential status, and supported models. Use it before configure_model_route or select_default_model to learn which routes and model ids actually exist. Do not use it for image, speech, audio, video, embedding, or reranking routes; those live in list_task_models. Returns live routes by default and never returns credential values.";
    readonly parameters: {
        readonly provider: "Optional exact provider route to inspect.";
        readonly includeDormant: "Include configurable catalog routes that are not active.";
        readonly includeModels: "Include model catalogs for live routes; defaults to true.";
    };
    readonly helpPointer: "list_model_routes";
}, {
    readonly name: "configure_model_route";
    readonly description: "Create or update one llm-pi-ai provider profile without deleting fields that were not supplied. Use it when a language/chat route is missing, its endpoint changed, or its credential reference must be set; run list_model_routes first to see the current state. Do not use it to register non-language routes, and do not use it to change the model of an existing session. It accepts only a credential reference such as OPENAI_API_KEY and never an API key value. For the built-in openai route, normally provide only provider=openai and apiKeyEnv=OPENAI_API_KEY; omit endpoint and models to inherit the pi-ai catalog.";
    readonly parameters: {
        readonly provider: "Unique route id, for example openai or team-openai.";
        readonly apiKeyEnv: "Credential reference in POSIX environment-variable form. Never pass a secret; pass a reference name only.";
        readonly displayName: "Human-readable provider name.";
        readonly api: "Wire protocol. Omit on a built-in catalog route.";
        readonly baseURL: "Absolute provider endpoint. Omit on a built-in catalog route.";
        readonly models: "Complete served catalog for a declared route. On a built-in route, a non-empty list replaces its catalog. Omit requestMaxTokens unless every request must send that explicit output limit.";
        readonly defaultContextWindow: "Fallback context capacity for unsized declared models.";
        readonly defaultMaxTokens: "Fallback per-request output limit for unsized declared models. Omit to let the runtime and endpoint choose a safe value.";
    };
    readonly helpPointer: "list_model_routes";
}, {
    readonly name: "inspect_volcengine_provider";
    readonly description: "Inspect the unified Volcengine provider configuration, safe credential status, the authenticated Ark model catalog, selected language/VLM models, registered task routes, and the correct invocation path for each class. Use it immediately whenever the user asks which 火山/方舟/豆包 models are available, how to configure them, or how to call them; installation is expected to make this workflow discoverable without YAML knowledge. Do not use it to expose credential values, assume catalog entries are all language models, or claim registered-only task routes are callable.";
    readonly parameters: {};
    readonly helpPointer: "inspect_volcengine_provider";
}, {
    readonly name: "select_volcengine_language_models";
    readonly description: "Replace one Ark language/VLM billing route: mode=payg configures provider=volcengine on /api/v3, while mode=agent-plan configures provider=volcengine-agent-plan on /api/plan/v3. The two routes coexist and never silently fall back to each other. Use it after inspect_volcengine_provider and authoritative model metadata review; an empty models array disables only the selected route. Do not use it for image/video generation, speech, audio, embedding, or other task routes, and verify the result with inspect_volcengine_provider.";
    readonly parameters: {
        readonly mode: "Billing route to replace: payg or agent-plan. Defaults to payg for compatibility.";
        readonly models: "Complete selected language/VLM profiles. Pass [] to remove only the selected billing route.";
    };
    readonly helpPointer: "inspect_volcengine_provider";
}, {
    readonly name: "list_task_models";
    readonly description: "Inspect registered non-language task models such as image, speech, audio, video, embedding, and reranking routes. Use it before register_task_model, and use it to check declared cross-provider capabilities and whether a route is merely registered or actually callable. Do not use it for language/chat models; those live in list_model_routes. Registration and runtime callability are reported separately, and no credential values are returned.";
    readonly parameters: {
        readonly id: "Optional exact registry id, for example openai/gpt-image-2.";
        readonly provider: "Optional provider-family filter.";
        readonly task: "Optional semantic-task filter.";
        readonly includeProfile: "Include provider-specific non-secret model profile metadata.";
    };
    readonly helpPointer: "list_task_models";
}, {
    readonly name: "discover_task_models";
    readonly description: "Query one provider connection's authenticated model catalog and show which upstream ids are already registered and enabled. Use it before registering provider models or refreshing an available-model selector. Do not use it as proof that every catalog item is callable, and do not assume discovery changes registration or selection; inspect the result with list_task_models.";
    readonly parameters: {
        readonly connection: "Exact reusable connection id, for example volcengine.";
    };
    readonly helpPointer: "list_task_models";
}, {
    readonly name: "select_task_models";
    readonly description: "Replace the enabled task-model set for one connection. Use it when the user changes which registered multimodal models are available; an empty ids array intentionally disables all models and never falls back to selecting everything. Do not use it to register new upstream ids or select the primary language model; verify the result with list_task_models.";
    readonly parameters: {
        readonly connection: "Exact reusable connection id whose registered routes will be updated.";
        readonly ids: "Complete set of registered route ids to enable. Pass [] to disable every route on the connection.";
    };
    readonly helpPointer: "list_task_models";
}, {
    readonly name: "register_task_model";
    readonly description: "Create or update a non-language task-model registration and its reusable connection profile. Use it for image, speech, audio, video, embedding, reranking, and realtime routes; run list_task_models first to see what is already registered. Do not use it for language/chat models, which must go through configure_model_route so llm-pi-ai stays authoritative, and never describe a route registered this way as callable until a compatible runtime adapter is installed. It stores catalog metadata and credential references only and never accepts an API key value or another secret value.";
    readonly parameters: {
        readonly id: "Stable route id, for example openai/gpt-image-2.";
        readonly connection: "Reusable connection id, for example openai.";
        readonly provider: "Provider family; required when creating a new connection.";
        readonly connectionDisplayName: "Human-readable connection name.";
        readonly credentialRef: "Legacy single credential reference such as OPENAI_API_KEY. Never pass a secret; pass a reference name only.";
        readonly credentialRefs: "Named credential references for providers that require multiple credential slots. Values are reference names, not secrets. Never pass a secret; pass a reference name only.";
        readonly baseURL: "Optional absolute API base URL.";
        readonly catalogEndpoint: "Optional absolute model-catalog URL; when omitted discovery uses baseURL/models.";
        readonly catalogCredentialName: "Credential slot used for catalog discovery, for example arkApiKey or default.";
        readonly connectionProfile: "Optional provider-level non-secret metadata such as region, defaultVoice, or catalog-discovery mode.";
        readonly model: "Exact provider model id.";
        readonly displayName: "Human-readable model name.";
        readonly task: "Semantic task served by the model.";
        readonly runtimeAdapter: "Adapter contract expected to execute this route.";
        readonly enabled: "Whether routing and direct invocation may use this route; defaults to true.";
        readonly credentialNames: "Connection credential slots required by this route, allowing one provider to expose products with different authentication.";
        readonly input: "Accepted modalities; sensible task defaults are used when omitted.";
        readonly output: "Produced modalities or data shapes; sensible task defaults are used when omitted.";
        readonly execution: "Invocation lifecycle.";
        readonly capabilities: "Stable cross-provider capability ids such as speech.transcribe.file, speech.synthesize.short, or speech.realtime_session.";
        readonly operations: "Supported operations, for example generate, edit, transcribe, or synthesize.";
        readonly roles: "Routing roles such as image-generator or speech-to-text.";
        readonly profile: "Optional provider-specific non-secret capability metadata.";
        readonly portrait: "Optional initial router-facing portrait; use upsert_model_portrait for evidence-backed price, speed, and strengths.";
    };
    readonly helpPointer: "list_task_models";
}, {
    readonly name: "prepare_model_portraits";
    readonly description: "Start the on-demand portrait-research workflow for models already configured in the current profile. Use it immediately when the user asks to organize, create, or improve portraits for configured models—even if they do not list fields or tool steps—and infer model ids only from the immediately preceding registration or selection context. It returns seed facts, gaps, official documentation URLs, and the ingest/validate sequence. Do not use it for discovered, discussed, or built-in catalog models that the user has not configured; do not invent undocumented facts, write lastProbe from documentation, perform paid probes without approval, or ask the user to restate the portrait schema.";
    readonly parameters: {
        readonly ids: "Optional exact configured task route ids or live LLM ids in llm:<provider>/<model> form. Infer these from recent registration or selection context when possible; omit to find configured models with missing or non-valid portraits.";
        readonly includeDisabled: "Include explicitly user-registered disabled task routes when ids are omitted; defaults to false. It never exposes unconfigured built-in catalog entries.";
    };
    readonly helpPointer: "prepare_model_portraits";
}, {
    readonly name: "fetch_portrait_source";
    readonly description: "Open one exact first-party documentation URL approved by prepare_model_portraits for one configured model. Use it while following the collect-model-portraits skill when the normal Web tools are unavailable or an allowlisted source is sufficient. The id and URL must match the current research plan. Do not use it for arbitrary URLs, redirects, non-text responses, or oversized responses; they are rejected.";
    readonly parameters: {
        readonly id: "Exact configured portrait target id returned by prepare_model_portraits.";
        readonly url: "Exact HTTP(S) URL copied from that target's researchPlan.suggestedSources.";
    };
    readonly helpPointer: "prepare_model_portraits";
}, {
    readonly name: "ingest_portrait_research";
    readonly description: "Merge Agent-researched portrait facts into a registered model after opening official documentation. Use it after prepare_model_portraits when prices, strengths, and limitations have http(s) source URLs. Do not use it to guess facts, write lastProbe from documentation, store secrets, or change registered input/output modalities.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly findings: "Researched non-secret facts. evidence is required; each source must be an http(s) URL; price rates must reference those evidence ids.";
    };
    readonly helpPointer: "prepare_model_portraits";
}, {
    readonly name: "get_model_portrait";
    readonly description: "Inspect one router-facing portrait for either an LLM or task model together with registered capabilities, input/output types, validation state, and optional current-session observations. Use it before choosing or comparing a model. Do not use it to invoke a model or edit its portrait.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly includeEvidence: "Include evidence records; defaults to true.";
        readonly includeUsage: "Include invocation observations aggregated from the current session.";
    };
    readonly helpPointer: "get_model_portrait";
}, {
    readonly name: "upsert_model_portrait";
    readonly description: "Create or replace the evidence-backed portrait for a registered LLM or task model. Use it after the Harness Agent has gathered authoritative documentation or benchmark evidence for price, strengths, limitations, speed, modalities, and routing quality scores; then immediately call validate_model_portrait and inspect the result with get_model_portrait. Do not use it for secrets, raw request content, guessed facts, or unregistered models.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly portrait: "Complete non-secret portrait facts. Price and performance claims should reference evidence ids; quality scores are normalized from 0 to 1.";
    };
    readonly helpPointer: "get_model_portrait";
}, {
    readonly name: "validate_model_portrait";
    readonly description: "Validate a saved portrait against registration, credential status, adapter availability, evidence links, and optionally a live adapter probe. Use it after upsert_model_portrait or when get_model_portrait shows a portrait may be stale. Do not use it to create claims or to treat a missing adapter as proof that the provider model is invalid.";
    readonly parameters: {
        readonly id: "Exact task-model route id, or llm:<provider>/<model> for a language model.";
        readonly liveProbe: "Ask the installed runtime adapter to perform a provider-safe live probe; may incur provider traffic or cost.";
    };
    readonly helpPointer: "get_model_portrait";
}, {
    readonly name: "invoke_task_model";
    readonly description: "Invoke a registered non-realtime multimodal task model through its installed runtime adapter and record privacy-safe timing, outcome, modality, and cost metrics. Use it for request/response image, speech, audio, video, embedding, or reranking operations after list_task_models reports the route callable. Do not use it for realtime-speech routes; those require realtimeModelRuntime. Also do not use it for primary language/chat turns, unregistered operations, credential values, or inline binary data.";
    readonly parameters: {
        readonly id: "Exact registered task-model route id.";
        readonly operation: "One operation declared by the route, for example synthesize or transcribe-file.";
        readonly request: "Adapter-neutral non-secret request metadata. Refer to URLs, attachment ids, or file handles instead of embedding binary data.";
    };
    readonly helpPointer: "list_task_models";
}, {
    readonly name: "summarize_model_usage";
    readonly description: "Aggregate native Harness LLM calls and task-model calls in the current durable session into counts, success rate, latency percentiles, token usage, and estimated cost. Use it as measured evidence when reviewing a model portrait; collection is automatic during normal calls. Do not use it as a cross-session analytics database or as proof of quality without representative samples.";
    readonly parameters: {
        readonly id: "Optional exact task route id or llm:<provider>/<model>; omit to summarize every observed model call in the current session.";
    };
    readonly helpPointer: "summarize_model_usage";
}, {
    readonly name: "select_default_model";
    readonly description: "Validate and save the primary Agent language model from the registered live catalog. Use it when the user wants a different default going forward; run list_model_routes first to confirm the route is live and the model id is exact. Do not use it to switch the current session, which needs the session model selector, and do not use it for non-language task models.";
    readonly parameters: {
        readonly provider: "Live provider route.";
        readonly model: "Exact model id on that route.";
        readonly reasoningEffort: "Optional effort id advertised by the selected model.";
    };
    readonly helpPointer: "list_model_routes";
}];
