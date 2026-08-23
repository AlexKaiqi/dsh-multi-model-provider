/**
 * Official documentation entry points an Agent can open while researching a portrait.
 *
 * These are starting URLs, not a complete catalog. The Agent must still extract
 * current facts from the live pages and record the exact page as evidence.source.
 */
export declare const VOLCENGINE_ARK_DOCS = "https://www.volcengine.com/docs/82379";
export declare const DOUBAO_SPEECH_DOCS = "https://www.volcengine.com/docs/6561";
export declare const OPENAI_MODELS_DOCS = "https://platform.openai.com/docs/models";
export declare const OPENAI_PRICING_DOCS = "https://platform.openai.com/docs/pricing";
export declare const OPENAI_IMAGE_DOCS = "https://platform.openai.com/docs/guides/image-generation";
export declare const OPENAI_VIDEO_DOCS = "https://platform.openai.com/docs/api-reference/videos";
export declare const ANTHROPIC_MODELS_DOCS = "https://platform.claude.com/docs/en/about-claude/models/overview";
export declare const ANTHROPIC_PRICING_DOCS = "https://platform.claude.com/docs/en/about-claude/pricing";
export declare const GOOGLE_MODELS_DOCS = "https://ai.google.dev/gemini-api/docs/models";
export declare const GOOGLE_PRICING_DOCS = "https://ai.google.dev/gemini-api/docs/pricing";
export declare const GOOGLE_VIDEO_DOCS = "https://ai.google.dev/gemini-api/docs/video";
export declare const DEEPSEEK_MODELS_DOCS = "https://api-docs.deepseek.com/news/news260424/";
export declare const DEEPSEEK_PRICING_DOCS = "https://api-docs.deepseek.com/quick_start/pricing/";
export declare const KIMI_MODELS_DOCS = "https://www.kimi.ai/help/kimi-api/api-model-selection";
export declare const KIMI_PRICING_DOCS = "https://www.kimi.ai/help/kimi-api/api-pricing";
export declare const ZAI_MODELS_DOCS = "https://docs.z.ai/guides/llm/glm-5.3";
export declare const ZAI_PRICING_DOCS = "https://docs.z.ai/guides/overview/pricing";
export declare const XAI_MODELS_DOCS = "https://docs.x.ai/developers/models";
export declare const XAI_PRICING_DOCS = "https://docs.x.ai/developers/pricing";
export declare const QWEN_MODELS_DOCS = "https://help.aliyun.com/zh/model-studio/text-generation-model";
export declare const QWEN_PRICING_DOCS = "https://help.aliyun.com/en/model-studio/model-pricing";
export declare const QWEN_OPEN_WEIGHTS_DOCS = "https://huggingface.co/Qwen/models";
export declare const MINIMAX_MODELS_DOCS = "https://www.minimax.io/models/text/m3";
export declare const MINIMAX_PRICING_DOCS = "https://platform.minimax.io/docs/guides/pricing-paygo";
export declare const MINIMAX_LOCAL_DEPLOY_DOCS = "https://platform.minimax.io/docs/guides/local-deploy";
export declare const MINIMAX_H3_DOCS = "https://platform.minimax.io/docs/api-reference/video-generation-v2-create";
export declare const MINIMAX_H3_OPEN_SOURCE_DOCS = "https://www.minimax.io/news/minimax-h3-open-source";
export declare const MINIMAX_MULTIMODAL_DOCS = "https://platform.minimax.io/docs/api-reference/api-overview";
export declare const MINIMAX_IMAGE_DOCS = "https://platform.minimax.io/docs/guides/image-generation";
export declare const MISTRAL_MODELS_DOCS = "https://docs.mistral.ai/models";
export declare const MISTRAL_PRICING_DOCS = "https://docs.mistral.ai/models/model-selection-guide";
/**
 * Return official documentation URLs for a provider id.
 *
 * Args:
 *   provider: Connection or llm-pi-ai provider id such as `volcengine` or `openai`.
 *
 * Returns:
 *   HTTPS documentation entry points. Empty when the provider has no bundled sources.
 */
export declare function officialResearchSources(provider: string): readonly string[];
