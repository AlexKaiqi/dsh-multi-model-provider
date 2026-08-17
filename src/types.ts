import type { LlmModelInfo } from '@deepseek-ai/dsh-llm'

export type ProviderApi = 'openai-completions' | 'openai-responses' | 'anthropic-messages'
export type InputModality = 'text' | 'image'

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
