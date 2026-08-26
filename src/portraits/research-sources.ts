/**
 * Official documentation entry points an Agent can open while researching a portrait.
 *
 * These are starting URLs, not a complete catalog. The Agent must still extract
 * current facts from the live pages and record the exact page as evidence.source.
 */

export const VOLCENGINE_ARK_DOCS = 'https://docs.volcengine.com/api/doc/getDocDetail?LibraryID=82379&DocumentID=1330310&lang=zh'
export const VOLCENGINE_ARK_PRICING_DOCS = 'https://docs.volcengine.com/api/doc/getDocDetail?LibraryID=82379&DocumentID=1544106&lang=zh'
export const DOUBAO_SPEECH_DOCS = 'https://docs.volcengine.com/api/doc/getDocDetail?LibraryID=6561&DocumentID=2499930&lang=zh'
export const DOUBAO_SPEECH_PRICING_DOCS = 'https://docs.volcengine.com/api/doc/getDocDetail?LibraryID=6561&DocumentID=1359370&lang=zh'
export const DOUBAO_REALTIME_DOCS = 'https://docs.volcengine.com/api/doc/getDocDetail?LibraryID=6561&DocumentID=1594356&lang=zh'
export const OPENAI_MODELS_DOCS = 'https://developers.openai.com/api/docs/models/all'
export const OPENAI_PRICING_DOCS = 'https://developers.openai.com/api/docs/pricing'
export const OPENAI_IMAGE_DOCS = 'https://developers.openai.com/api/docs/guides/image-generation'
export const OPENAI_VIDEO_DOCS = 'https://developers.openai.com/api/docs/models/sora-2'
export const ANTHROPIC_MODELS_DOCS = 'https://platform.claude.com/docs/en/models/overview'
export const ANTHROPIC_PRICING_DOCS = 'https://platform.claude.com/docs/en/about-claude/pricing'
export const GOOGLE_MODELS_DOCS = 'https://ai.google.dev/gemini-api/docs/models'
export const GOOGLE_PRICING_DOCS = 'https://ai.google.dev/gemini-api/docs/pricing?hl=en'
export const GOOGLE_VIDEO_DOCS = 'https://ai.google.dev/gemini-api/docs/video?hl=en'
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
export function officialResearchSources(
  provider: string,
  model?: string,
  task?: string,
): readonly string[] {
  const modelId = model?.trim()
  switch (provider) {
    case 'volcengine':
      return [VOLCENGINE_ARK_DOCS, VOLCENGINE_ARK_PRICING_DOCS]
    case 'doubao':
    case 'doubao-speech':
      return [DOUBAO_SPEECH_DOCS, DOUBAO_SPEECH_PRICING_DOCS, DOUBAO_REALTIME_DOCS]
    case 'openai':
    case 'gpt-proxy':
      return uniqueSources([
        ...(modelId === undefined ? [] : [`https://developers.openai.com/api/docs/models/${encodeURIComponent(modelId)}`]),
        OPENAI_MODELS_DOCS,
        OPENAI_PRICING_DOCS,
        ...(task === 'image-generation' ? [OPENAI_IMAGE_DOCS] : []),
        ...(task === 'video-generation' ? [OPENAI_VIDEO_DOCS] : []),
      ])
    case 'anthropic':
      return [ANTHROPIC_MODELS_DOCS, ANTHROPIC_PRICING_DOCS]
    case 'google':
    case 'google-vertex':
      return uniqueSources([
        ...(modelId === undefined ? [] : [`https://ai.google.dev/gemini-api/docs/models/${encodeURIComponent(modelId)}?hl=en`]),
        GOOGLE_MODELS_DOCS,
        GOOGLE_PRICING_DOCS,
        ...(task === 'video-generation' ? [GOOGLE_VIDEO_DOCS] : []),
      ])
    case 'deepseek':
    case 'deepseek-official':
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
      return uniqueSources([
        ...(task === 'image-generation' ? [MINIMAX_IMAGE_DOCS] : []),
        ...(task === 'video-generation' ? [MINIMAX_H3_DOCS, MINIMAX_MULTIMODAL_DOCS] : []),
        ...(modelId === 'MiniMax-H3' ? [MINIMAX_H3_OPEN_SOURCE_DOCS, MINIMAX_LOCAL_DEPLOY_DOCS] : []),
        ...(task === undefined ? [MINIMAX_MODELS_DOCS, MINIMAX_MULTIMODAL_DOCS] : []),
        MINIMAX_PRICING_DOCS,
      ])
    case 'mistral':
      return [MISTRAL_MODELS_DOCS, MISTRAL_PRICING_DOCS]
    default:
      return []
  }
}

function uniqueSources(sources: readonly string[]): readonly string[] {
  return [...new Set(sources)]
}
