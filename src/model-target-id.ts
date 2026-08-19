import { ModelManagerError } from './operations.ts'

export function llmTargetId(provider: string, model: string): string {
  return `llm:${provider}/${model}`
}

export function parseLlmTargetId(id: string): { provider: string; model: string } | undefined {
  if (!id.startsWith('llm:')) return undefined
  const value = id.slice(4)
  const slash = value.indexOf('/')
  if (slash <= 0 || slash === value.length - 1) {
    throw new ModelManagerError(`invalid LLM portrait id '${id}'; expected llm:<provider>/<model>`, 'INVALID_MODEL_PORTRAIT_ID')
  }
  return { provider: value.slice(0, slash), model: value.slice(slash + 1) }
}
