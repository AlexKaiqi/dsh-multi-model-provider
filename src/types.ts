import type { LlmModelInfo } from '@deepseek-ai/dsh-llm'

export type ProviderApi = 'openai-completions' | 'openai-responses' | 'anthropic-messages'
export type InputModality = 'text' | 'image'

export const TASK_MODEL_TASKS = [
  'image-generation',
  'speech-synthesis',
  'transcription',
  'audio-generation',
  'video-generation',
  'embedding',
  'reranking',
] as const

export const MODEL_MODALITIES = ['text', 'image', 'audio', 'video', 'vector', 'data'] as const
export const MODEL_EXECUTION_MODES = ['request-response', 'streaming', 'async-job', 'realtime'] as const

export type TaskModelTask = typeof TASK_MODEL_TASKS[number]
export type ModelModality = typeof MODEL_MODALITIES[number]
export type ModelExecutionMode = typeof MODEL_EXECUTION_MODES[number]
export type ModelProfile = Record<string, unknown>

export interface TaskModelConnection {
  readonly provider: string
  readonly displayName?: string
  readonly credentialRef?: string
  readonly baseURL?: string
}

export interface RegisteredTaskModel {
  readonly connection: string
  readonly model: string
  readonly displayName?: string
  readonly task: TaskModelTask
  readonly runtimeAdapter?: string
  readonly input: readonly ModelModality[]
  readonly output: readonly ModelModality[]
  readonly execution: ModelExecutionMode
  readonly operations: readonly string[]
  readonly roles: readonly string[]
  readonly profile: ModelProfile
}

export interface TaskModelRegistryConfig {
  readonly connections: Readonly<Record<string, TaskModelConnection>>
  readonly models: Readonly<Record<string, RegisteredTaskModel>>
  readonly defaults: Readonly<Partial<Record<TaskModelTask, string>>>
}

export interface RegisterTaskModelInput {
  readonly id: string
  readonly connection: string
  readonly provider?: string
  readonly connectionDisplayName?: string
  readonly credentialRef?: string
  readonly baseURL?: string
  readonly model: string
  readonly displayName?: string
  readonly task: TaskModelTask
  readonly runtimeAdapter?: string
  readonly input?: readonly ModelModality[]
  readonly output?: readonly ModelModality[]
  readonly execution?: ModelExecutionMode
  readonly operations?: readonly string[]
  readonly roles?: readonly string[]
  readonly profile?: ModelProfile
}

export interface ListTaskModelsInput {
  readonly id?: string
  readonly provider?: string
  readonly task?: TaskModelTask
  readonly includeProfile?: boolean
}

export interface ModelProfileInput {
  readonly id: string
  readonly name?: string
  readonly contextWindow?: number
  readonly maxTokens?: number
  readonly input?: readonly InputModality[]
}

export interface ConfigureModelRouteInput {
  readonly provider: string
  readonly apiKeyEnv?: string
  readonly displayName?: string
  readonly api?: ProviderApi
  readonly baseURL?: string
  readonly models?: readonly ModelProfileInput[]
  readonly defaultContextWindow?: number
  readonly defaultMaxTokens?: number
}

export interface ListModelRoutesInput {
  readonly provider?: string
  readonly includeDormant?: boolean
  readonly includeModels?: boolean
}

export interface SelectDefaultModelInput {
  readonly provider: string
  readonly model: string
  readonly reasoningEffort?: string
}

export interface CredentialStatus {
  readonly ref: string
  readonly configured: boolean
  readonly writable: boolean
  readonly source?: string
}

export interface ModelRouteView {
  readonly provider: string
  readonly displayName: string
  readonly status: 'live' | 'dormant'
  readonly declared?: boolean
  readonly settingsNs?: string
  readonly settingsPath?: readonly string[]
  readonly credential?: CredentialStatus
  readonly models?: readonly LlmModelInfo[]
  readonly modelError?: string
}
