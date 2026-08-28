import type { Context } from '@deepseek-ai/cordis';
import type { SelectVolcengineLanguageModelsInput } from '../types.ts';
export declare const VOLCENGINE_PROVIDER = "volcengine";
export declare const VOLCENGINE_AGENT_PLAN_PROVIDER = "volcengine-agent-plan";
/** Agent Plan and pay-as-you-go are independent routes and may coexist. */
export declare const VOLCENGINE_ARK_PLAN_BASE_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";
export declare const VOLCENGINE_ARK_PAYG_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
export declare const VOLCENGINE_ARK_BASE_URL = "https://ark.cn-beijing.volces.com/api/v3";
export declare const VOLCENGINE_ARK_API = "openai-completions";
export declare const VOLCENGINE_ARK_API_KEY = "ARK_API_KEY";
export declare const LEGACY_VOLCENGINE_ARK_API_KEY = "VOLCENGINE_API_KEY";
/** Copy the pre-ARK credential reference forward without exposing or deleting its value. */
export declare function migrateLegacyVolcengineCredential(ctx: Context): Promise<boolean>;
/** One provider-specific orientation call: credentials, live catalog, selections, and invocation paths. */
export declare function inspectVolcengineProvider(ctx: Context, signal: AbortSignal): Promise<Record<string, unknown>>;
export declare function selectVolcengineLanguageModels(ctx: Context, input: SelectVolcengineLanguageModelsInput): Promise<Record<string, unknown>>;
