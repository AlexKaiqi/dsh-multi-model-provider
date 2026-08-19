import type { Context } from '@deepseek-ai/cordis';
import type { SelectVolcengineLanguageModelsInput } from '../types.ts';
export declare const VOLCENGINE_PROVIDER = "volcengine";
export declare const VOLCENGINE_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
export declare const VOLCENGINE_ARK_API = "openai-responses";
/** One provider-specific orientation call: credentials, live catalog, selections, and invocation paths. */
export declare function inspectVolcengineProvider(ctx: Context, signal: AbortSignal): Promise<Record<string, unknown>>;
export declare function selectVolcengineLanguageModels(ctx: Context, input: SelectVolcengineLanguageModelsInput): Promise<Record<string, unknown>>;
//# sourceMappingURL=volcengine.d.ts.map