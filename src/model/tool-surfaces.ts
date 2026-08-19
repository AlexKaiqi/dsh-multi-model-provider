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
    models: 'Complete served catalog for a declared route. On a built-in route, a non-empty list replaces its catalog.',
    defaultContextWindow: 'Fallback context capacity for unsized declared models.',
    defaultMaxTokens: 'Fallback output capacity for unsized declared models.',
  },
  helpPointer: 'list_model_routes',
} as const

/** Tool that lists non-language task-model routes. */
export const LIST_TASK_MODELS_SURFACE = {
  name: 'list_task_models',
  description: 'Inspect registered non-language task models such as image, speech, audio, video, embedding, and reranking routes. Use it before register_task_model, and use it to check whether a route is merely registered or actually callable. Do not use it for language/chat models; those live in list_model_routes. Registration and runtime callability are reported separately, and no credential values are returned.',
  parameters: {
    id: 'Optional exact registry id, for example openai/gpt-image-2.',
    provider: 'Optional provider-family filter.',
    task: 'Optional semantic-task filter.',
    includeProfile: 'Include provider-specific non-secret model profile metadata.',
  },
  helpPointer: 'list_task_models',
} as const

/** Tool that creates or updates a non-language task-model registration. */
export const REGISTER_TASK_MODEL_SURFACE = {
  name: 'register_task_model',
  description: 'Create or update a non-language task-model registration and its reusable connection profile. Use it for image, speech, audio, video, embedding, and reranking routes; run list_task_models first to see what is already registered. Do not use it for language/chat models, which must go through configure_model_route so llm-pi-ai stays authoritative, and never describe a route registered this way as callable until a compatible runtime adapter is installed. It stores catalog metadata and credential references only and never accepts an API key value.',
  parameters: {
    id: 'Stable route id, for example openai/gpt-image-2.',
    connection: 'Reusable connection id, for example openai.',
    provider: 'Provider family; required when creating a new connection.',
    connectionDisplayName: 'Human-readable connection name.',
    credentialRef: `Credential reference such as OPENAI_API_KEY. ${NEVER_A_SECRET}`,
    baseURL: 'Optional absolute API base URL.',
    model: 'Exact provider model id.',
    displayName: 'Human-readable model name.',
    task: 'Semantic task served by the model.',
    runtimeAdapter: 'Adapter contract expected to execute this route.',
    input: 'Accepted modalities; sensible task defaults are used when omitted.',
    output: 'Produced modalities or data shapes; sensible task defaults are used when omitted.',
    execution: 'Invocation lifecycle.',
    operations: 'Supported operations, for example generate, edit, transcribe, or synthesize.',
    roles: 'Routing roles such as image-generator or speech-to-text.',
    profile: 'Optional provider-specific non-secret capability metadata.',
  },
  helpPointer: 'list_task_models',
} as const

/** Tool that saves the default language model for newly created Agents. */
export const SELECT_DEFAULT_MODEL_SURFACE = {
  name: 'select_default_model',
  description: 'Validate and save the primary provider/model used when future Agents are created. Use it when the user wants a different default going forward; run list_model_routes first to confirm the route is live and the model id is exact. Do not use it to switch the current session, which needs the session model selector, and do not use it for non-language task models.',
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
  LIST_TASK_MODELS_SURFACE,
  REGISTER_TASK_MODEL_SURFACE,
  SELECT_DEFAULT_MODEL_SURFACE,
] as const
