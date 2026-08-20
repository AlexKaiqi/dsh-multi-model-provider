import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { Context, Service } from '@deepseek-ai/cordis'
import { ReasoningEffortId } from '@deepseek-ai/dsh-llm'
import { listModelRoutes, ModelManagerError } from './operations.ts'
import { builtinLlmPortrait } from './portraits/builtin.ts'
import { getModelPortrait } from './portraits/service.ts'
import { portraitRegistry } from './portraits/storage.ts'
import { listTaskModels } from './registry.ts'
import type {
  GetModelPortraitInput,
  ListModelRoutesInput,
  ListTaskModelsInput,
  SelectDefaultModelInput,
  TaskModelTask,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    modelCatalog: ModelCatalog
  }
}

export interface ModelCatalogSnapshot {
  readonly taskModels: readonly Record<string, unknown>[]
  readonly languageModels: readonly Record<string, unknown>[]
  readonly languagePortraits: readonly Record<string, unknown>[]
  readonly unresolvedLanguagePortraitIds: readonly string[]
  readonly defaults: Readonly<Partial<Record<TaskModelTask, string>>>
  readonly settingsNs: string
  readonly note: string
}

const CATALOG_NOTE = 'Peer plugins should inject ctx.modelCatalog and call snapshot() to read every registered model. selectAgentModel chooses the Agent model from that catalog. Do not scrape settings.yaml or call Agent tools to read this catalog. Secrets are never included.'

/**
 * Build a secret-free catalog snapshot for peer plugins and Agent-model selection.
 *
 * Args:
 *   ctx: Host context that already has settings, credentials, llm, and taskModelRuntime.
 *
 * Returns:
 *   Every task-model row and live language model, with stored or curated portraits when available. Credential values are never included.
 */
export async function snapshotModelCatalog(ctx: Context): Promise<ModelCatalogSnapshot> {
  const listed = await listTaskModels(ctx)
  const rows = Array.isArray(listed.models) ? listed.models as Array<Record<string, unknown> & { id: string }> : []
  const taskModels: Record<string, unknown>[] = []
  for (const row of rows) {
    const detail = await getModelPortrait(ctx, { id: row.id, includeEvidence: true })
    taskModels.push({
      ...row,
      portrait: detail.portrait,
      declared: detail.declared,
    })
  }

  const languagePortraits: Record<string, unknown>[] = []
  const unresolvedLanguagePortraitIds: string[] = []
  const configuredPortraitIds = new Set(Object.keys(portraitRegistry(ctx).portraits ?? {}))
  for (const id of configuredPortraitIds) {
    try {
      languagePortraits.push(await getModelPortrait(ctx, { id, includeEvidence: true }))
    } catch {
      unresolvedLanguagePortraitIds.push(id)
    }
  }

  const portraitsById = new Map(languagePortraits.map(row => [asString(row.id), row]))
  const routes = await listModelRoutes(ctx)
  const languageModels: Record<string, unknown>[] = []
  for (const providerRow of asRecordList(routes.providers)) {
    const provider = asString(providerRow.provider)
    const status = asString(providerRow.status)
    for (const modelRow of asRecordList(providerRow.models)) {
      const model = asString(modelRow.id)
      if (provider === '' || model === '') continue
      const id = `llm:${provider}/${model}`
      let portraitRow = portraitsById.get(id)
      if (portraitRow === undefined && !configuredPortraitIds.has(id)) {
        const bundled = builtinLlmPortrait(provider, model)
        if (bundled !== undefined) {
          portraitRow = {
            id,
            kind: 'llm',
            provider,
            model,
            portrait: bundled,
            portraitSource: 'bundled',
          }
          portraitsById.set(id, portraitRow)
          languagePortraits.push(portraitRow)
        }
      }
      languageModels.push({
        id,
        kind: 'llm',
        provider,
        model,
        displayName: asString(modelRow.name) || model,
        status,
        ...(portraitRow === undefined ? {} : {
          portrait: portraitRow.portrait,
          portraitSource: portraitRow.portraitSource ?? 'stored',
          ...(portraitRow.declared === undefined ? {} : { declared: portraitRow.declared }),
        }),
      })
    }
  }

  const defaults = asRecord(listed.defaults) as Partial<Record<TaskModelTask, string>>
  return {
    taskModels,
    languageModels,
    languagePortraits,
    unresolvedLanguagePortraitIds,
    defaults,
    settingsNs: String(listed.settingsNs),
    note: CATALOG_NOTE,
  }
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
export async function selectAgentModel(
  ctx: Context,
  input: SelectDefaultModelInput,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const provider = nonBlank(input.provider, 'provider')
  const model = nonBlank(input.model, 'model')
  const reasoningEffort = optionalText(input.reasoningEffort)
  const snapshot = await snapshotModelCatalog(ctx)
  const taskId = `${provider}/${model}`
  if (snapshot.taskModels.some(row => asString(row.id) === taskId)) {
    throw new ModelManagerError(
      `'${taskId}' is a registered task model, not an Agent language model`,
      'NOT_AN_AGENT_MODEL',
    )
  }

  const catalogRow = snapshot.languageModels.find(row => (
    asString(row.provider) === provider && asString(row.model) === model
  ))
  if (catalogRow === undefined) {
    throw new ModelManagerError(
      `language model '${provider}/${model}' is not in the catalog`,
      'UNKNOWN_AGENT_MODEL',
    )
  }
  if (asString(catalogRow.status) !== 'live') {
    throw new ModelManagerError(
      `language model '${provider}/${model}' is not a live Agent-model candidate`,
      'AGENT_MODEL_NOT_LIVE',
    )
  }

  const info = await ctx.llm.resolveModelInfo(provider, model, signal)
  if (reasoningEffort !== undefined) {
    const supported = info.reasoning?.efforts.some(effort => effort.id === reasoningEffort) === true
    if (!supported) {
      throw new ModelManagerError(
        `model '${provider}/${model}' does not advertise reasoning effort '${reasoningEffort}'`,
        'UNSUPPORTED_REASONING_EFFORT',
      )
    }
  }

  const selection: ModelSelection = {
    provider,
    model,
    ...(reasoningEffort === undefined ? {} : { reasoningEffort: ReasoningEffortId(reasoningEffort) }),
  }
  await ctx.agentDefaultModel.saveSelection(selection)
  return {
    selection,
    model: {
      name: info.name,
      ...(info.description === undefined ? {} : { description: info.description }),
      ...(info.inputModalities === undefined ? {} : { inputModalities: [...info.inputModalities] }),
      ...(info.context === undefined ? {} : { contextWindow: info.context.contextWindow }),
    },
    catalog: catalogRow,
    appliesTo: 'new-agents',
    currentSessionChanged: false,
  }
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
export function selectDefaultModel(
  ctx: Context,
  input: SelectDefaultModelInput,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  return selectAgentModel(ctx, input, signal)
}

/**
 * Read-only model directory plus Agent-model selection.
 *
 * Registration and portraits fill this catalog. `snapshot()` returns every
 * registered model. `selectAgentModel()` saves the Agent (primary) model from
 * the live language entries in that snapshot.
 */
export class ModelCatalog extends Service {
  constructor(ctx: Context) {
    super(ctx, 'modelCatalog')
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
  listTaskModels(input: ListTaskModelsInput = {}): Promise<Record<string, unknown>> {
    return listTaskModels(this.ctx, input)
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
  listLanguageRoutes(input: ListModelRoutesInput = {}): Promise<Record<string, unknown>> {
    return listModelRoutes(this.ctx, input)
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
  getPortrait(input: GetModelPortraitInput): Promise<Record<string, unknown>> {
    return getModelPortrait(this.ctx, input)
  }

  /**
   * Return every registered model this plugin knows about.
   *
   * Returns:
   *   Task models, live language models, and stored LLM portraits. Unresolvable LLM ids are listed separately.
   */
  snapshot(): Promise<ModelCatalogSnapshot> {
    return snapshotModelCatalog(this.ctx)
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
  selectAgentModel(
    input: SelectDefaultModelInput,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    return selectAgentModel(this.ctx, input, signal)
  }
}

export default ModelCatalog

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
function nonBlank(value: string, name: string): string {
  const normalized = value.trim()
  if (normalized === '') throw new ModelManagerError(`${name} must not be blank`, 'INVALID_MODEL_CONFIGURATION')
  return normalized
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
function optionalText(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
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
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
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
function asRecordList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(asRecord) : []
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
function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
