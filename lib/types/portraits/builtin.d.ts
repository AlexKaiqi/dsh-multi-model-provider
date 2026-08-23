import type { ModelPortrait } from '../types.ts';
export declare const CURATED_LLM_PORTRAIT_SELECTION: {
    readonly observedAt: "2026-08-20T00:00:00.000Z";
    readonly policy: "latest-mainstream-first";
    readonly usageSource: "https://openrouter.ai/rankings?view=month";
    readonly providerCatalogs: readonly ["https://developers.openai.com/api/docs/models", "https://platform.claude.com/docs/en/about-claude/models/choosing-a-model", "https://ai.google.dev/gemini-api/docs/models", "https://api-docs.deepseek.com/quick_start/pricing/", "https://www.kimi.ai/help/kimi-api/api-model-selection", "https://docs.z.ai/guides/overview/pricing", "https://docs.x.ai/developers/models", "https://help.aliyun.com/zh/model-studio/text-generation-model", "https://www.minimax.io/models/text/m3", "https://docs.mistral.ai/models"];
    readonly rationale: "Cover widely adopted providers and their current flagship, mainstream workhorse, or materially distinct modality, specialization, and deployment routes. There is no fixed model count. Usage and private-deployment adoption are secondary signals within the current generation.";
};
export declare const CURATED_LLM_PORTRAIT_IDS: string[];
export declare const CURATED_PORTABLE_LLM_MODEL_IDS: string[];
/** Return a cloned route portrait, or an exact-id portable capability portrait. */
export declare function builtinLlmPortrait(provider: string, model: string): ModelPortrait | undefined;
