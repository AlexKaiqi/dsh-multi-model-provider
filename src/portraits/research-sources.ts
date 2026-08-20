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
      return [OPENAI_MODELS_DOCS, OPENAI_PRICING_DOCS, OPENAI_IMAGE_DOCS]
    default:
      return []
  }
}
