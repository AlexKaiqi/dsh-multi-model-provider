import { Context, Service } from '@deepseek-ai/cordis';
import type { GetModelPortraitInput, ListModelRoutesInput, ListTaskModelsInput, SelectDefaultModelInput, TaskModelTask } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        modelCatalog: ModelCatalog;
    }
}
export interface ModelCatalogSnapshot {
    readonly taskModels: readonly Record<string, unknown>[];
    readonly languageModels: readonly Record<string, unknown>[];
    readonly languageFailures: readonly Record<string, unknown>[];
    readonly languagePortraits: readonly Record<string, unknown>[];
    readonly unresolvedLanguagePortraitIds: readonly string[];
    readonly defaults: Readonly<Partial<Record<TaskModelTask, string>>>;
    readonly settingsNs: string;
    readonly note: string;
}
/**
 * Build a secret-free catalog snapshot for peer plugins and Agent-model selection.
 *
 * Args:
 *   ctx: Host context that already has settings, credentials, llm, and taskModelRuntime.
 *
 * Returns:
 *   Every task-model row and live language model, with stored or curated portraits when available. Credential values are never included.
 */
export declare function snapshotModelCatalog(ctx: Context): Promise<ModelCatalogSnapshot>;
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
export declare function selectAgentModel(ctx: Context, input: SelectDefaultModelInput, signal?: AbortSignal): Promise<Record<string, unknown>>;
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
export declare function selectDefaultModel(ctx: Context, input: SelectDefaultModelInput, signal?: AbortSignal): Promise<Record<string, unknown>>;
/**
 * Read-only model directory plus Agent-model selection.
 *
 * Registration and portraits fill this catalog. `snapshot()` returns every
 * registered model. `selectAgentModel()` saves the Agent (primary) model from
 * the live language entries in that snapshot.
 */
export declare class ModelCatalog extends Service {
    constructor(ctx: Context);
    /**
     * List non-language task-model routes without credential values.
     *
     * Args:
     *   input: Optional id, provider, task, or includeProfile filters.
     *
     * Returns:
     *   The same secret-free listing that `list_task_models` returns.
     */
    listTaskModels(input?: ListTaskModelsInput): Promise<Record<string, unknown>>;
    /**
     * List llm-pi-ai language-model routes without credential values.
     *
     * Args:
     *   input: Optional provider filter and dormant/model inclusion flags.
     *
     * Returns:
     *   The same secret-free listing that `list_model_routes` returns.
     */
    listLanguageRoutes(input?: ListModelRoutesInput): Promise<Record<string, unknown>>;
    /**
     * Read one evidence-backed portrait plus declared capabilities.
     *
     * Args:
     *   input: Task route id or `llm:<provider>/<model>`, with optional evidence/usage flags.
     *
     * Returns:
     *   Portrait payload used by `get_model_portrait`. Never includes secrets.
     */
    getPortrait(input: GetModelPortraitInput): Promise<Record<string, unknown>>;
    /**
     * Return every registered model this plugin knows about.
     *
     * Returns:
     *   Task models, live language models, and stored LLM portraits. Unresolvable LLM ids are listed separately.
     */
    snapshot(): Promise<ModelCatalogSnapshot>;
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
    selectAgentModel(input: SelectDefaultModelInput, signal?: AbortSignal): Promise<Record<string, unknown>>;
}
export default ModelCatalog;
