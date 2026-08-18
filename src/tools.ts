import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { configureModelRoute, listModelRoutes, selectDefaultModel } from './operations.ts'
import { listTaskModels, registerTaskModel } from './registry.ts'

function asJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

const jsonOutput = {
  schema: { type: 'json' } as const,
  render: (_args: unknown, value: JsonValue) => [{
    type: 'text' as const,
    text: JSON.stringify(value, null, 2),
  }],
}

const modelProfileSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    id: {
      type: 'string' as const,
      required: true as const,
      description: 'Exact model id accepted by the provider endpoint.',
    },
    name: { type: 'string' as const, description: 'Human-readable model name.' },
    contextWindow: { type: 'integer' as const, description: 'Maximum combined context in tokens.' },
    maxTokens: { type: 'integer' as const, description: 'Maximum output tokens.' },
    input: {
      type: 'array' as const,
      items: { type: 'string' as const, enum: ['text', 'image'] as const },
      description: 'Accepted request modalities.',
    },
  },
}

const taskModelTasks = [
  'image-generation',
  'speech-synthesis',
  'transcription',
  'audio-generation',
  'video-generation',
  'embedding',
  'reranking',
] as const

const modelModalities = ['text', 'image', 'audio', 'video', 'vector', 'data'] as const
const executionModes = ['request-response', 'streaming', 'async-job', 'realtime'] as const

export function modelManagerTools(ctx: Context) {
  return [
    defineTool({
      name: 'list_model_routes',
      description: 'Inspect registered LLM provider routes, safe credential status, and supported models. Returns live routes by default; it never returns credential values.',
      parameters: {
        provider: { type: 'string', description: 'Optional exact provider route to inspect.' },
        includeDormant: { type: 'boolean', description: 'Include configurable catalog routes that are not active.' },
        includeModels: { type: 'boolean', description: 'Include model catalogs for live routes; defaults to true.' },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await listModelRoutes(ctx, args)),
    }),
    defineTool({
      name: 'configure_model_route',
      description: 'Create or update one llm-pi-ai provider profile without deleting fields that were not supplied. This tool accepts only a credential reference such as OPENAI_API_KEY, never an API key value. For the built-in openai route, normally provide only provider=openai and apiKeyEnv=OPENAI_API_KEY; omit endpoint and models to inherit the pi-ai catalog.',
      parameters: {
        provider: { type: 'string', required: true, description: 'Unique route id, for example openai or team-openai.' },
        apiKeyEnv: { type: 'string', description: 'Credential reference in POSIX environment-variable form. Never pass a secret.' },
        displayName: { type: 'string', description: 'Human-readable provider name.' },
        api: {
          type: 'string',
          enum: ['openai-completions', 'openai-responses', 'anthropic-messages'],
          description: 'Wire protocol. Omit on a built-in catalog route.',
        },
        baseURL: { type: 'string', description: 'Absolute provider endpoint. Omit on a built-in catalog route.' },
        models: {
          type: 'array',
          items: modelProfileSchema,
          description: 'Complete served catalog for a declared route. On a built-in route, a non-empty list replaces its catalog.',
        },
        defaultContextWindow: { type: 'integer', description: 'Fallback context capacity for unsized declared models.' },
        defaultMaxTokens: { type: 'integer', description: 'Fallback output capacity for unsized declared models.' },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await configureModelRoute(ctx, args)),
    }),
    defineTool({
      name: 'list_task_models',
      description: 'Inspect registered non-language task models such as image, speech, audio, video, embedding, and reranking routes. Registration and runtime callability are reported separately; no credential values are returned.',
      parameters: {
        id: { type: 'string', description: 'Optional exact registry id, for example openai/gpt-image-2.' },
        provider: { type: 'string', description: 'Optional provider-family filter.' },
        task: { type: 'string', enum: taskModelTasks, description: 'Optional semantic-task filter.' },
        includeProfile: { type: 'boolean', description: 'Include provider-specific non-secret model profile metadata.' },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await listTaskModels(ctx, args)),
    }),
    defineTool({
      name: 'register_task_model',
      description: 'Create or update a non-language task-model registration and its reusable connection profile. This stores catalog metadata and credential references only; it does not install a runtime adapter and never accepts an API key value. Language/chat models must use configure_model_route so llm-pi-ai stays authoritative.',
      parameters: {
        id: { type: 'string', required: true, description: 'Stable route id, for example openai/gpt-image-2.' },
        connection: { type: 'string', required: true, description: 'Reusable connection id, for example openai.' },
        provider: { type: 'string', description: 'Provider family; required when creating a new connection.' },
        connectionDisplayName: { type: 'string', description: 'Human-readable connection name.' },
        credentialRef: { type: 'string', description: 'Credential reference such as OPENAI_API_KEY. Never pass a secret.' },
        baseURL: { type: 'string', description: 'Optional absolute API base URL.' },
        model: { type: 'string', required: true, description: 'Exact provider model id.' },
        displayName: { type: 'string', description: 'Human-readable model name.' },
        task: { type: 'string', required: true, enum: taskModelTasks, description: 'Semantic task served by the model.' },
        runtimeAdapter: { type: 'string', description: 'Adapter contract expected to execute this route.' },
        input: {
          type: 'array',
          items: { type: 'string', enum: modelModalities },
          description: 'Accepted modalities; sensible task defaults are used when omitted.',
        },
        output: {
          type: 'array',
          items: { type: 'string', enum: modelModalities },
          description: 'Produced modalities or data shapes; sensible task defaults are used when omitted.',
        },
        execution: { type: 'string', enum: executionModes, description: 'Invocation lifecycle.' },
        operations: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supported operations, for example generate, edit, transcribe, or synthesize.',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Routing roles such as image-generator or speech-to-text.',
        },
        profile: {
          type: 'object',
          additionalProperties: true,
          description: 'Optional provider-specific non-secret capability metadata.',
        },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await registerTaskModel(ctx, args)),
    }),
    defineTool({
      name: 'select_default_model',
      description: 'Validate and save the primary provider/model used when future Agents are created. It does not switch the current session; use the session model selector for that.',
      parameters: {
        provider: { type: 'string', required: true, description: 'Live provider route.' },
        model: { type: 'string', required: true, description: 'Exact model id on that route.' },
        reasoningEffort: { type: 'string', description: 'Optional effort id advertised by the selected model.' },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await selectDefaultModel(ctx, args, exec.signal)),
    }),
  ]
}
