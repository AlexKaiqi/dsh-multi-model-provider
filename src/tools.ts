import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { configureModelRoute, listModelRoutes, selectDefaultModel } from './operations.ts'
import { listTaskModels, registerTaskModel } from './registry.ts'
import {
  CONFIGURE_MODEL_ROUTE_SURFACE,
  LIST_MODEL_ROUTES_SURFACE,
  LIST_TASK_MODELS_SURFACE,
  REGISTER_TASK_MODEL_SURFACE,
  SELECT_DEFAULT_MODEL_SURFACE,
} from './model/tool-surfaces.ts'

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
      name: LIST_MODEL_ROUTES_SURFACE.name,
      description: LIST_MODEL_ROUTES_SURFACE.description,
      parameters: {
        provider: { type: 'string', description: LIST_MODEL_ROUTES_SURFACE.parameters.provider },
        includeDormant: { type: 'boolean', description: LIST_MODEL_ROUTES_SURFACE.parameters.includeDormant },
        includeModels: { type: 'boolean', description: LIST_MODEL_ROUTES_SURFACE.parameters.includeModels },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await listModelRoutes(ctx, args)),
    }),
    defineTool({
      name: CONFIGURE_MODEL_ROUTE_SURFACE.name,
      description: CONFIGURE_MODEL_ROUTE_SURFACE.description,
      parameters: {
        provider: { type: 'string', required: true, description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.provider },
        apiKeyEnv: { type: 'string', description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.apiKeyEnv },
        displayName: { type: 'string', description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.displayName },
        api: {
          type: 'string',
          enum: ['openai-completions', 'openai-responses', 'anthropic-messages'],
          description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.api,
        },
        baseURL: { type: 'string', description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.baseURL },
        models: {
          type: 'array',
          items: modelProfileSchema,
          description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.models,
        },
        defaultContextWindow: { type: 'integer', description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.defaultContextWindow },
        defaultMaxTokens: { type: 'integer', description: CONFIGURE_MODEL_ROUTE_SURFACE.parameters.defaultMaxTokens },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await configureModelRoute(ctx, args)),
    }),
    defineTool({
      name: LIST_TASK_MODELS_SURFACE.name,
      description: LIST_TASK_MODELS_SURFACE.description,
      parameters: {
        id: { type: 'string', description: LIST_TASK_MODELS_SURFACE.parameters.id },
        provider: { type: 'string', description: LIST_TASK_MODELS_SURFACE.parameters.provider },
        task: { type: 'string', enum: taskModelTasks, description: LIST_TASK_MODELS_SURFACE.parameters.task },
        includeProfile: { type: 'boolean', description: LIST_TASK_MODELS_SURFACE.parameters.includeProfile },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await listTaskModels(ctx, args)),
    }),
    defineTool({
      name: REGISTER_TASK_MODEL_SURFACE.name,
      description: REGISTER_TASK_MODEL_SURFACE.description,
      parameters: {
        id: { type: 'string', required: true, description: REGISTER_TASK_MODEL_SURFACE.parameters.id },
        connection: { type: 'string', required: true, description: REGISTER_TASK_MODEL_SURFACE.parameters.connection },
        provider: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.provider },
        connectionDisplayName: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.connectionDisplayName },
        credentialRef: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.credentialRef },
        baseURL: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.baseURL },
        model: { type: 'string', required: true, description: REGISTER_TASK_MODEL_SURFACE.parameters.model },
        displayName: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.displayName },
        task: { type: 'string', required: true, enum: taskModelTasks, description: REGISTER_TASK_MODEL_SURFACE.parameters.task },
        runtimeAdapter: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.runtimeAdapter },
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
        execution: { type: 'string', enum: executionModes, description: REGISTER_TASK_MODEL_SURFACE.parameters.execution },
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
          description: REGISTER_TASK_MODEL_SURFACE.parameters.profile,
        },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await registerTaskModel(ctx, args)),
    }),
    defineTool({
      name: SELECT_DEFAULT_MODEL_SURFACE.name,
      description: SELECT_DEFAULT_MODEL_SURFACE.description,
      parameters: {
        provider: { type: 'string', required: true, description: SELECT_DEFAULT_MODEL_SURFACE.parameters.provider },
        model: { type: 'string', required: true, description: SELECT_DEFAULT_MODEL_SURFACE.parameters.model },
        reasoningEffort: { type: 'string', description: SELECT_DEFAULT_MODEL_SURFACE.parameters.reasoningEffort },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await selectDefaultModel(ctx, args, exec.signal)),
    }),
  ]
}
