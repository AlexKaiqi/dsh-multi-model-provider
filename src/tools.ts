import type { Context } from '@deepseek-ai/cordis'
import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'
import { configureModelRoute, listModelRoutes, selectDefaultModel } from './operations.ts'
import { invokeTaskModel } from './invocation.ts'
import { getModelPortrait, prepareModelPortraits, summarizeModelUsage, upsertModelPortrait, validateModelPortrait } from './portraits.ts'
import { discoverTaskModels, listTaskModels, registerTaskModel, selectTaskModels } from './registry.ts'
import {
  CONFIGURE_MODEL_ROUTE_SURFACE,
  DISCOVER_TASK_MODELS_SURFACE,
  GET_MODEL_PORTRAIT_SURFACE,
  INVOKE_TASK_MODEL_SURFACE,
  LIST_MODEL_ROUTES_SURFACE,
  LIST_TASK_MODELS_SURFACE,
  PREPARE_MODEL_PORTRAITS_SURFACE,
  REGISTER_TASK_MODEL_SURFACE,
  SELECT_TASK_MODELS_SURFACE,
  SELECT_DEFAULT_MODEL_SURFACE,
  SUMMARIZE_MODEL_USAGE_SURFACE,
  UPSERT_MODEL_PORTRAIT_SURFACE,
  VALIDATE_MODEL_PORTRAIT_SURFACE,
} from './model/tool-surfaces.ts'
import {
  MODEL_EXECUTION_MODES,
  MODEL_MODALITIES,
  TASK_MODEL_CAPABILITIES,
  TASK_MODEL_TASKS,
  type UpsertModelPortraitInput,
} from './types.ts'

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

const priceRateSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    operation: { type: 'string' as const, required: true as const, description: 'Billed operation.' },
    unit: { type: 'string' as const, required: true as const, description: 'Provider billing unit, for example 1m-input-tokens, image, minute, or request.' },
    amount: { type: 'number' as const, required: true as const, description: 'Non-negative price for one unit.' },
    currency: { type: 'string' as const, required: true as const, description: 'ISO-style currency code such as USD or CNY.' },
    tier: { type: 'string' as const, description: 'Optional provider pricing tier.' },
    effectiveFrom: { type: 'string' as const, description: 'Optional ISO effective date/time.' },
    effectiveTo: { type: 'string' as const, description: 'Optional ISO expiry date/time.' },
    evidenceId: { type: 'string' as const, description: 'Evidence record supporting this price.' },
  },
}

const portraitEvidenceSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    id: { type: 'string' as const, required: true as const, description: 'Stable evidence id.' },
    kind: { type: 'string' as const, required: true as const, enum: ['provider-doc', 'benchmark', 'runtime-probe', 'usage', 'manual'] as const, description: 'Evidence source class.' },
    source: { type: 'string' as const, required: true as const, description: 'Source URL or stable local reference.' },
    observedAt: { type: 'string' as const, required: true as const, description: 'ISO date/time when this evidence was observed.' },
    claims: { type: 'array' as const, required: true as const, items: { type: 'string' as const }, description: 'Claims supported by this evidence.' },
    notes: { type: 'string' as const, description: 'Optional limitations or measurement context.' },
  },
}

const portraitSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    summary: { type: 'string' as const, description: 'Concise model summary.' },
    specialties: { type: 'array' as const, items: { type: 'string' as const }, description: 'Tasks or domains where the model is strong.' },
    limitations: { type: 'array' as const, items: { type: 'string' as const }, description: 'Known limitations.' },
    bestFor: { type: 'array' as const, items: { type: 'string' as const }, description: 'Positive routing intents.' },
    avoidFor: { type: 'array' as const, items: { type: 'string' as const }, description: 'Negative routing intents.' },
    pricing: {
      type: 'object' as const,
      additionalProperties: false,
      properties: {
        rates: { type: 'array' as const, items: priceRateSchema, description: 'Effective-dated provider price rates.' },
        notes: { type: 'string' as const, description: 'Pricing caveats.' },
      },
    },
    performance: {
      type: 'object' as const,
      additionalProperties: false,
      properties: {
        speedClass: { type: 'string' as const, enum: ['instant', 'fast', 'balanced', 'slow', 'async'] as const, description: 'Coarse speed class.' },
        typicalLatencyMs: {
          type: 'object' as const,
          additionalProperties: false,
          properties: {
            min: { type: 'number' as const, required: true as const, description: 'Typical lower latency bound.' },
            max: { type: 'number' as const, required: true as const, description: 'Typical upper latency bound.' },
          },
          description: 'Evidence-backed typical latency range.',
        },
        throughputPerMinute: { type: 'number' as const, description: 'Observed or documented throughput per minute.' },
        notes: { type: 'string' as const, description: 'Performance measurement context.' },
      },
    },
    qualityScores: { type: 'object' as const, additionalProperties: true, description: 'Router criteria mapped to normalized 0..1 scores.' },
    evidence: { type: 'array' as const, items: portraitEvidenceSchema, description: 'Evidence supporting price, performance, and assessment claims.' },
  },
}

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
        task: { type: 'string', enum: TASK_MODEL_TASKS, description: LIST_TASK_MODELS_SURFACE.parameters.task },
        includeProfile: { type: 'boolean', description: LIST_TASK_MODELS_SURFACE.parameters.includeProfile },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await listTaskModels(ctx, args)),
    }),
    defineTool({
      name: DISCOVER_TASK_MODELS_SURFACE.name,
      description: DISCOVER_TASK_MODELS_SURFACE.description,
      parameters: {
        connection: { type: 'string', required: true, description: DISCOVER_TASK_MODELS_SURFACE.parameters.connection },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await discoverTaskModels(ctx, args, exec.signal)),
    }),
    defineTool({
      name: SELECT_TASK_MODELS_SURFACE.name,
      description: SELECT_TASK_MODELS_SURFACE.description,
      parameters: {
        connection: { type: 'string', required: true, description: SELECT_TASK_MODELS_SURFACE.parameters.connection },
        ids: {
          type: 'array',
          required: true,
          items: { type: 'string' },
          description: SELECT_TASK_MODELS_SURFACE.parameters.ids,
        },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await selectTaskModels(ctx, args)),
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
        credentialRefs: {
          type: 'object',
          additionalProperties: true,
          description: REGISTER_TASK_MODEL_SURFACE.parameters.credentialRefs,
        },
        baseURL: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.baseURL },
        catalogEndpoint: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.catalogEndpoint },
        catalogCredentialName: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.catalogCredentialName },
        connectionProfile: {
          type: 'object',
          additionalProperties: true,
          description: REGISTER_TASK_MODEL_SURFACE.parameters.connectionProfile,
        },
        model: { type: 'string', required: true, description: REGISTER_TASK_MODEL_SURFACE.parameters.model },
        displayName: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.displayName },
        task: { type: 'string', required: true, enum: TASK_MODEL_TASKS, description: REGISTER_TASK_MODEL_SURFACE.parameters.task },
        runtimeAdapter: { type: 'string', description: REGISTER_TASK_MODEL_SURFACE.parameters.runtimeAdapter },
        enabled: { type: 'boolean', description: REGISTER_TASK_MODEL_SURFACE.parameters.enabled },
        credentialNames: {
          type: 'array',
          items: { type: 'string' },
          description: REGISTER_TASK_MODEL_SURFACE.parameters.credentialNames,
        },
        input: {
          type: 'array',
          items: { type: 'string', enum: MODEL_MODALITIES },
          description: 'Accepted modalities; sensible task defaults are used when omitted.',
        },
        output: {
          type: 'array',
          items: { type: 'string', enum: MODEL_MODALITIES },
          description: 'Produced modalities or data shapes; sensible task defaults are used when omitted.',
        },
        execution: { type: 'string', enum: MODEL_EXECUTION_MODES, description: REGISTER_TASK_MODEL_SURFACE.parameters.execution },
        capabilities: {
          type: 'array',
          items: { type: 'string', enum: TASK_MODEL_CAPABILITIES },
          description: REGISTER_TASK_MODEL_SURFACE.parameters.capabilities,
        },
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
        portrait: {
          ...portraitSchema,
          description: REGISTER_TASK_MODEL_SURFACE.parameters.portrait,
        },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await registerTaskModel(ctx, args)),
    }),
    defineTool({
      name: PREPARE_MODEL_PORTRAITS_SURFACE.name,
      description: PREPARE_MODEL_PORTRAITS_SURFACE.description,
      parameters: {
        ids: { type: 'array', items: { type: 'string' }, description: PREPARE_MODEL_PORTRAITS_SURFACE.parameters.ids },
        includeDisabled: { type: 'boolean', description: PREPARE_MODEL_PORTRAITS_SURFACE.parameters.includeDisabled },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await prepareModelPortraits(ctx, args, exec.signal)),
    }),
    defineTool({
      name: GET_MODEL_PORTRAIT_SURFACE.name,
      description: GET_MODEL_PORTRAIT_SURFACE.description,
      parameters: {
        id: { type: 'string', required: true, description: GET_MODEL_PORTRAIT_SURFACE.parameters.id },
        includeEvidence: { type: 'boolean', description: GET_MODEL_PORTRAIT_SURFACE.parameters.includeEvidence },
        includeUsage: { type: 'boolean', description: GET_MODEL_PORTRAIT_SURFACE.parameters.includeUsage },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await getModelPortrait(ctx, args, exec.agent?.session.events)),
    }),
    defineTool({
      name: UPSERT_MODEL_PORTRAIT_SURFACE.name,
      description: UPSERT_MODEL_PORTRAIT_SURFACE.description,
      parameters: {
        id: { type: 'string', required: true, description: UPSERT_MODEL_PORTRAIT_SURFACE.parameters.id },
        portrait: {
          ...portraitSchema,
          required: true,
          description: UPSERT_MODEL_PORTRAIT_SURFACE.parameters.portrait,
        },
      },
      output: jsonOutput,
      execute: async args => asJsonValue(await upsertModelPortrait(ctx, args as unknown as UpsertModelPortraitInput)),
    }),
    defineTool({
      name: VALIDATE_MODEL_PORTRAIT_SURFACE.name,
      description: VALIDATE_MODEL_PORTRAIT_SURFACE.description,
      parameters: {
        id: { type: 'string', required: true, description: VALIDATE_MODEL_PORTRAIT_SURFACE.parameters.id },
        liveProbe: { type: 'boolean', description: VALIDATE_MODEL_PORTRAIT_SURFACE.parameters.liveProbe },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await validateModelPortrait(ctx, args, exec.signal)),
    }),
    defineTool({
      name: INVOKE_TASK_MODEL_SURFACE.name,
      description: INVOKE_TASK_MODEL_SURFACE.description,
      parameters: {
        id: { type: 'string', required: true, description: INVOKE_TASK_MODEL_SURFACE.parameters.id },
        operation: { type: 'string', required: true, description: INVOKE_TASK_MODEL_SURFACE.parameters.operation },
        request: {
          type: 'object',
          required: true,
          additionalProperties: true,
          description: INVOKE_TASK_MODEL_SURFACE.parameters.request,
        },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(await invokeTaskModel(ctx, args, exec)),
    }),
    defineTool({
      name: SUMMARIZE_MODEL_USAGE_SURFACE.name,
      description: SUMMARIZE_MODEL_USAGE_SURFACE.description,
      parameters: {
        id: { type: 'string', description: SUMMARIZE_MODEL_USAGE_SURFACE.parameters.id },
      },
      output: jsonOutput,
      execute: async (args, exec) => asJsonValue(summarizeModelUsage(args, exec.agent?.session.events)),
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
