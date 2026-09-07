import type { Context } from '@deepseek-ai/cordis';
import type { SelectVolcengineLanguageModelsInput } from '../types.ts';
import type { LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm';
export * from '../volcengine-defaults.ts';
export declare const LEGACY_VOLCENGINE_ARK_API_KEY = "VOLCENGINE_API_KEY";
/** Copy the pre-ARK credential reference forward without exposing or deleting its value. */
export declare function migrateLegacyVolcengineCredential(ctx: Context): Promise<boolean>;
/** Query the account's actual catalog, including before a language route exists. */
export declare function discoverVolcengineModels(ctx: Context, request: LlmModelDiscoveryRequest & {
    signal?: AbortSignal;
}): Promise<import("@deepseek-ai/dsh-llm").LlmDiscoveredModel[]>;
/** One provider-specific orientation call: credentials, live catalog, selections, and invocation paths. */
export declare function inspectVolcengineProvider(ctx: Context, signal: AbortSignal): Promise<Record<string, unknown>>;
export declare function selectVolcengineLanguageModels(ctx: Context, input: SelectVolcengineLanguageModelsInput): Promise<Record<string, unknown>>;
