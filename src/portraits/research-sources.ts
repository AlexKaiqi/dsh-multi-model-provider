/**
 * Official documentation entry points an Agent can open while researching a portrait.
 *
 * These are starting URLs, not a complete catalog. The Agent must still extract
 * current facts from the live pages and record the exact page as evidence.source.
 */

export const VOLCENGINE_ARK_DOCS = 'https://www.volcengine.com/docs/82379'
export const DOUBAO_SPEECH_DOCS = 'https://www.volcengine.com/docs/6561'
export const OPENAI_MODELS_DOCS = 'https://platform.openai.com/docs/models'
export const OPENAI_PRICING_DOCS = 'https://platform.openai.com/docs/pricing'
export const OPENAI_IMAGE_DOCS = 'https://platform.openai.com/docs/guides/image-generation'
export const OPENAI_VIDEO_DOCS = 'https://platform.openai.com/docs/api-reference/videos'
export const ANTHROPIC_MODELS_DOCS = 'https://platform.claude.com/docs/en/about-claude/models/overview'
export const ANTHROPIC_PRICING_DOCS = 'https://platform.claude.com/docs/en/about-claude/pricing'
export const GOOGLE_MODELS_DOCS = 'https://ai.google.dev/gemini-api/docs/models'
export const GOOGLE_PRICING_DOCS = 'https://ai.google.dev/gemini-api/docs/pricing'
export const GOOGLE_VIDEO_DOCS = 'https://ai.google.dev/gemini-api/docs/video'
export const DEEPSEEK_MODELS_DOCS = 'https://api-docs.deepseek.com/news/news260424/'
export const DEEPSEEK_PRICING_DOCS = 'https://api-docs.deepseek.com/quick_start/pricing/'
export const KIMI_MODELS_DOCS = 'https://www.kimi.ai/help/kimi-api/api-model-selection'
export const KIMI_PRICING_DOCS = 'https://www.kimi.ai/help/kimi-api/api-pricing'
export const ZAI_MODELS_DOCS = 'https://docs.z.ai/guides/llm/glm-5.3'
export const ZAI_PRICING_DOCS = 'https://docs.z.ai/guides/overview/pricing'
export const XAI_MODELS_DOCS = 'https://docs.x.ai/developers/models'
export const XAI_PRICING_DOCS = 'https://docs.x.ai/developers/pricing'
export const QWEN_MODELS_DOCS = 'https://help.aliyun.com/zh/model-studio/text-generation-model'
export const QWEN_PRICING_DOCS = 'https://help.aliyun.com/en/model-studio/model-pricing'
export const QWEN_OPEN_WEIGHTS_DOCS = 'https://huggingface.co/Qwen/models'
export const MINIMAX_MODELS_DOCS = 'https://www.minimax.io/models/text/m3'
export const MINIMAX_PRICING_DOCS = 'https://platform.minimax.io/docs/guides/pricing-paygo'
export const MINIMAX_LOCAL_DEPLOY_DOCS = 'https://platform.minimax.io/docs/guides/local-deploy'
export const MINIMAX_H3_DOCS = 'https://platform.minimax.io/docs/api-reference/video-generation-v2-create'
export const MINIMAX_H3_OPEN_SOURCE_DOCS = 'https://www.minimax.io/news/minimax-h3-open-source'
export const MINIMAX_MULTIMODAL_DOCS = 'https://platform.minimax.io/docs/api-reference/api-overview'
export const MINIMAX_IMAGE_DOCS = 'https://platform.minimax.io/docs/guides/image-generation'
export const MISTRAL_MODELS_DOCS = 'https://docs.mistral.ai/models'
export const MISTRAL_PRICING_DOCS = 'https://docs.mistral.ai/models/model-selection-guide'

/**
 * Return official documentation URLs for a provider id.
 *
 * Args:
 *   provider: Connection or llm-pi-ai provider id such as `volcengine` or `openai`.
 *
 * Returns:
 *   HTTPS documentation entry points. Empty when the provider has no bundled sources.
 */
export function officialResearchSources(provider: string): readonly string[] {
  switch (provider) {
    case 'volcengine':
      return [VOLCENGINE_ARK_DOCS]
    case 'doubao':
    case 'doubao-speech':
      return [DOUBAO_SPEECH_DOCS]
    case 'openai':
      return [OPENAI_MODELS_DOCS, OPENAI_PRICING_DOCS, OPENAI_IMAGE_DOCS, OPENAI_VIDEO_DOCS]
    case 'anthropic':
      return [ANTHROPIC_MODELS_DOCS, ANTHROPIC_PRICING_DOCS]
    case 'google':
    case 'google-vertex':
      return [GOOGLE_MODELS_DOCS, GOOGLE_PRICING_DOCS, GOOGLE_VIDEO_DOCS]
    case 'deepseek':
      return [DEEPSEEK_MODELS_DOCS, DEEPSEEK_PRICING_DOCS]
    case 'moonshotai':
    case 'moonshotai-cn':
      return [KIMI_MODELS_DOCS, KIMI_PRICING_DOCS]
    case 'zai':
    case 'zai-coding-cn':
      return [ZAI_MODELS_DOCS, ZAI_PRICING_DOCS]
    case 'xai':
      return [XAI_MODELS_DOCS, XAI_PRICING_DOCS]
    case 'qwen-token-plan':
    case 'qwen-token-plan-cn':
      return [QWEN_MODELS_DOCS, QWEN_PRICING_DOCS, QWEN_OPEN_WEIGHTS_DOCS]
    case 'minimax':
    case 'minimax-cn':
      return [
        MINIMAX_MODELS_DOCS,
        MINIMAX_H3_DOCS,
        MINIMAX_H3_OPEN_SOURCE_DOCS,
        MINIMAX_MULTIMODAL_DOCS,
        MINIMAX_IMAGE_DOCS,
        MINIMAX_PRICING_DOCS,
        MINIMAX_LOCAL_DEPLOY_DOCS,
      ]
    case 'mistral':
      return [MISTRAL_MODELS_DOCS, MISTRAL_PRICING_DOCS]
    default:
      return []
  }
}
