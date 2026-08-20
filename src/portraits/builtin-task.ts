import { normalizePortrait } from '../portrait-core.ts'
import type {
  ModelPortrait,
  ModelPortraitInput,
  ModelPriceRate,
  SpeedClass,
  TaskModelTask,
} from '../types.ts'

const OBSERVED_AT = '2026-08-20T00:00:00.000Z'

interface TaskPortraitSpec {
  readonly provider: string
  readonly model: string
  readonly task: TaskModelTask
  readonly description: string
  readonly specialties: readonly string[]
  readonly limitations: readonly string[]
  readonly bestFor: readonly string[]
  readonly avoidFor: readonly string[]
  readonly speedClass: SpeedClass
  readonly modelSource: string
  readonly additionalModelSources?: readonly string[]
  readonly pricingSource?: string
  readonly rates?: readonly Omit<ModelPriceRate, 'evidenceId'>[]
  readonly pricingNotes?: string
}

export const CURATED_TASK_MODEL_PORTRAIT_SELECTION = {
  observedAt: OBSERVED_AT,
  policy: 'current-specialized-task-routes',
  providerCatalogs: [
    'https://developers.openai.com/api/docs/models',
    'https://ai.google.dev/gemini-api/docs/models',
    'https://www.minimax.io/blog/minimax-h3',
    'https://platform.minimax.io/docs/api-reference/api-overview',
    'https://platform.minimax.io/docs/guides/pricing-paygo',
  ],
  rationale: 'Represent materially different image, video, speech, and music routes as task models. Prefer current production models from major providers, retain legacy routes only when they remain callable and clearly mark them disabled, preserve input/output and execution boundaries, and never treat a task generator as an Agent LLM.',
} as const

const SPECS: readonly TaskPortraitSpec[] = [
  {
    provider: 'google',
    model: 'gemini-omni-flash-preview',
    task: 'video-generation',
    description: '## Positioning\nGoogle’s current recommended default for fast video generation and conversational editing. It accepts multimodal context and supports iterative natural-language refinement through the Interactions API.\n\n## Routing\nUse for fast 720p creation, multi-input reasoning, or edit-and-refine workflows; use Veo 3.1 when native audio, 4K, last-frame control, or scene extension is required.',
    specialties: ['conversational video editing', 'multi-input video generation', 'character consistency', 'fast iteration', 'large multimodal context'],
    limitations: ['preview endpoint with a shorter stability horizon', '720p at 24 FPS', '3–10 second output', 'paid tier only'],
    bestFor: ['iterative video editing', 'rapid creative exploration', 'multimodal reference composition'],
    avoidFor: ['4K delivery', 'workflows requiring a stable model id', 'native-audio-specific production'],
    speedClass: 'fast',
    modelSource: 'https://ai.google.dev/gemini-api/docs/models/gemini-omni-flash',
    additionalModelSources: ['https://ai.google.dev/gemini-api/docs/video'],
    pricingSource: 'https://ai.google.dev/gemini-api/docs/pricing',
    rates: [{ operation: 'generate', unit: 'output-video-second', amount: 0.10, currency: 'USD', tier: '720p effective price' }],
    pricingNotes: 'The effective video rate is derived by Google from $17.50/M output tokens at 5,792 tokens per second. Multimodal input is billed separately at $1.50/M tokens.',
  },
  {
    provider: 'google',
    model: 'veo-3.1-generate-preview',
    task: 'video-generation',
    description: '## Positioning\nGoogle’s current high-fidelity cinematic video model with native synchronized audio, 720p/1080p/4K output, scene extension, first/last-frame control, and image-based direction.\n\n## Routing\nUse for quality-first cinematic output and advanced creative control; use Fast or Lite for cost-sensitive volume, and Omni Flash for conversational editing.',
    specialties: ['cinematic video', 'native synchronized audio', '4K output', 'scene extension', 'first-and-last-frame control'],
    limitations: ['preview endpoint with more restrictive rate limits', '8-second generation', 'paid tier only', 'higher per-second cost than Fast and Lite'],
    bestFor: ['quality-first campaigns', 'cinematic shots', 'frame-controlled video', '4K delivery'],
    avoidFor: ['cost-first bulk generation', 'rapid conversational editing'],
    speedClass: 'async',
    modelSource: 'https://ai.google.dev/gemini-api/docs/models/veo-3.1-generate-preview',
    additionalModelSources: ['https://ai.google.dev/gemini-api/docs/video'],
    pricingSource: 'https://ai.google.dev/gemini-api/docs/pricing',
    rates: [
      { operation: 'generate', unit: 'output-video-second', amount: 0.40, currency: 'USD', tier: '720p or 1080p with audio' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.60, currency: 'USD', tier: '4K with audio' },
    ],
  },
  {
    provider: 'google',
    model: 'veo-3.1-fast-generate-preview',
    task: 'video-generation',
    description: '## Positioning\nGoogle’s faster Veo 3.1 production route with native audio and 720p, 1080p, or 4K output.\n\n## Routing\nUse for ads, A/B variants, social content, and backend generation where Veo controls are useful but Standard pricing is unnecessary.',
    specialties: ['fast cinematic video', 'native synchronized audio', '4K option', 'creative variants', 'production throughput'],
    limitations: ['preview endpoint', 'paid tier only', 'below Standard for quality-first routing'],
    bestFor: ['advertising variants', 'social video', 'high-volume generation'],
    avoidFor: ['maximum-fidelity hero shots', 'lowest-cost 720p generation'],
    speedClass: 'async',
    modelSource: 'https://ai.google.dev/gemini-api/docs/video',
    pricingSource: 'https://ai.google.dev/gemini-api/docs/pricing',
    rates: [
      { operation: 'generate', unit: 'output-video-second', amount: 0.10, currency: 'USD', tier: '720p with audio' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.12, currency: 'USD', tier: '1080p with audio' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.30, currency: 'USD', tier: '4K with audio' },
    ],
  },
  {
    provider: 'google',
    model: 'veo-3.1-lite-generate-preview',
    task: 'video-generation',
    description: '## Positioning\nGoogle’s lowest-cost Veo 3.1 route for developer-first video generation and editing with native audio.\n\n## Routing\nUse for volume-sensitive 720p/1080p workloads; escalate to Fast for 4K or Standard for quality-first cinematic output.',
    specialties: ['low-cost video', 'native synchronized audio', 'developer-first generation', 'bulk variants'],
    limitations: ['preview endpoint', '4K is unsupported', 'paid tier only', 'below Fast and Standard for quality-first routing'],
    bestFor: ['bulk short video', 'cost-sensitive prototypes', '720p and 1080p variants'],
    avoidFor: ['4K output', 'hero-quality cinematic shots'],
    speedClass: 'async',
    modelSource: 'https://ai.google.dev/gemini-api/docs/models/veo-3.1-lite-generate-preview',
    pricingSource: 'https://ai.google.dev/gemini-api/docs/pricing',
    rates: [
      { operation: 'generate', unit: 'output-video-second', amount: 0.05, currency: 'USD', tier: '720p with audio' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.08, currency: 'USD', tier: '1080p with audio' },
    ],
  },
  {
    provider: 'openai',
    model: 'sora-2',
    task: 'video-generation',
    description: '## Positioning\nOpenAI’s synced-audio video API route for natural-language or image-guided clips. The current model catalog marks it Legacy, although the Videos API still accepts the exact id.\n\n## Routing\nRetain for existing Sora integrations; do not make it the default for a new cross-provider video stack.',
    specialties: ['synced-audio video', 'text-to-video', 'image-guided video', 'dynamic short clips'],
    limitations: ['marked Legacy by OpenAI', '4/8/12-second clips', '720x1280 or 1280x720 output'],
    bestFor: ['maintaining an existing Sora 2 integration', '720p synced-audio clips'],
    avoidFor: ['new default routing', 'higher-resolution delivery', 'long-form video'],
    speedClass: 'async',
    modelSource: 'https://developers.openai.com/api/docs/models/sora-2',
    additionalModelSources: ['https://platform.openai.com/docs/api-reference/videos'],
    pricingSource: 'https://developers.openai.com/api/docs/models/sora-2',
    rates: [{ operation: 'generate', unit: 'output-video-second', amount: 0.10, currency: 'USD', tier: '720x1280 or 1280x720' }],
  },
  {
    provider: 'openai',
    model: 'sora-2-pro',
    task: 'video-generation',
    description: '## Positioning\nOpenAI’s more advanced synced-audio Sora 2 route with higher-resolution tiers. The current model catalog marks it Legacy.\n\n## Routing\nRetain for existing Sora integrations that need more detail or resolution; avoid selecting it as a new default without an explicit legacy-route requirement.',
    specialties: ['high-detail synced-audio video', 'portrait and landscape video', 'higher-resolution video', 'image-guided generation'],
    limitations: ['marked Legacy by OpenAI', 'higher price than Sora 2', '4/8/12-second clips'],
    bestFor: ['existing Sora Pro workflows', 'higher-resolution synced-audio clips'],
    avoidFor: ['new default routing', 'cost-sensitive bulk generation', 'long-form video'],
    speedClass: 'async',
    modelSource: 'https://developers.openai.com/api/docs/models/sora-2-pro',
    additionalModelSources: ['https://platform.openai.com/docs/api-reference/videos'],
    pricingSource: 'https://developers.openai.com/api/docs/models/sora-2-pro',
    rates: [
      { operation: 'generate', unit: 'output-video-second', amount: 0.30, currency: 'USD', tier: '720x1280 or 1280x720' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.50, currency: 'USD', tier: '1024x1792 or 1792x1024' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.70, currency: 'USD', tier: '1080x1920 or 1920x1080' },
    ],
  },
  {
    provider: 'minimax',
    model: 'MiniMax-H3',
    task: 'video-generation',
    description: '## Positioning\nMiniMax H3 is the current open-weight omni-modal video generation system. It accepts text plus image, video, or audio references and generates 4–15 second video with native stereo audio at 768P or 2K.\n\n## Routing\nUse for production video, multimodal reference composition, motion transfer, advertising, product presentation, and video-to-video editing; keep cheaper Hailuo routes for simpler short clips.',
    specialties: ['omni-reference video generation', 'native stereo audio', '2K video', 'motion transfer', 'video editing', 'private deployment'],
    limitations: ['pay-as-you-go API only', 'hosted Context-IR and 2K regeneration modules are not included in the initial open-weight release', 'local H3-Base deployment is accelerator-intensive', 'generation is asynchronous'],
    bestFor: ['advertising and branded content', 'reference-driven video creation', 'video-to-video motion transfer', 'audio-synchronized short video'],
    avoidFor: ['latency-sensitive interactive UI', 'simple low-cost image-to-video clips', 'workloads requiring more than 15 seconds in one generation'],
    speedClass: 'async',
    modelSource: 'https://platform.minimax.io/docs/api-reference/video-generation-v2-create',
    additionalModelSources: [
      'https://www.minimax.io/blog/minimax-h3',
      'https://www.minimax.io/news/minimax-h3-open-source',
    ],
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [
      { operation: 'generate', unit: 'output-video-second', amount: 0.08, currency: 'USD', tier: '768P' },
      { operation: 'generate', unit: 'output-video-second', amount: 0.13, currency: 'USD', tier: '2K' },
    ],
    pricingNotes: 'Audio reference input is free. The first five reference images are free and additional images are $0.04 each. Reference-video input is billed by its duration at the selected output-resolution rate.',
  },
  {
    provider: 'minimax',
    model: 'MiniMax-Hailuo-2.3',
    task: 'video-generation',
    description: '## Positioning\nMiniMax’s established text-to-video and image-to-video production model with strong instruction following, physical motion, facial expression, and camera control.\n\n## Routing\nUse for conventional 6–10 second video generation when H3’s omni-reference inputs, native audio, or 2K output are unnecessary.',
    specialties: ['text-to-video', 'image-to-video', 'physical motion', 'facial expression', 'camera control'],
    limitations: ['no H3-style audio/video reference input', 'maximum documented output is 1080P for 6 seconds or 768P for 10 seconds', 'generation is asynchronous'],
    bestFor: ['short cinematic clips', 'character motion', 'prompt-controlled camera movement'],
    avoidFor: ['native-audio video', '2K output', 'complex multi-reference composition'],
    speedClass: 'async',
    modelSource: 'https://platform.minimax.io/docs/api-reference/api-overview',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [
      { operation: 'generate', unit: 'video', amount: 0.28, currency: 'USD', tier: '768P 6s' },
      { operation: 'generate', unit: 'video', amount: 0.56, currency: 'USD', tier: '768P 10s' },
      { operation: 'generate', unit: 'video', amount: 0.49, currency: 'USD', tier: '1080P 6s' },
    ],
  },
  {
    provider: 'minimax',
    model: 'MiniMax-Hailuo-2.3-Fast',
    task: 'video-generation',
    description: '## Positioning\nMiniMax’s lower-cost image-to-video route for efficient short-video production while retaining the Hailuo family’s motion and physical-coherence strengths.\n\n## Routing\nUse when an input image is available and price matters more than text-only generation or H3’s richer reference controls.',
    specialties: ['image-to-video', 'cost-efficient video', 'physical motion', 'high-volume short clips'],
    limitations: ['image-to-video only', 'no text-only generation', 'no H3 native stereo audio or 2K output', 'generation is asynchronous'],
    bestFor: ['animating product images', 'social media variants', 'high-volume image-to-video'],
    avoidFor: ['text-only video prompts', 'multi-reference video editing'],
    speedClass: 'async',
    modelSource: 'https://platform.minimax.io/docs/api-reference/api-overview',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [
      { operation: 'generate', unit: 'video', amount: 0.19, currency: 'USD', tier: '768P 6s' },
      { operation: 'generate', unit: 'video', amount: 0.32, currency: 'USD', tier: '768P 10s' },
      { operation: 'generate', unit: 'video', amount: 0.33, currency: 'USD', tier: '1080P 6s' },
    ],
  },
  {
    provider: 'minimax',
    model: 'speech-2.8-hd',
    task: 'speech-synthesis',
    description: '## Positioning\nMiniMax’s current quality-first speech synthesis model with ultra-realistic output, sound tags, 40-language coverage, emotion control, and streaming support.\n\n## Routing\nUse when realism and expressive detail matter more than the lowest character price.',
    specialties: ['high-fidelity speech', 'sound tags', 'multilingual synthesis', 'emotion control', 'voice cloning compatibility'],
    limitations: ['higher price than the Turbo route', 'voice cloning and voice design incur separate fees'],
    bestFor: ['narration', 'character voices', 'expressive multilingual speech'],
    avoidFor: ['cost-first bulk speech', 'latency-first conversational audio'],
    speedClass: 'balanced',
    modelSource: 'https://platform.minimax.io/docs/api-reference/api-overview',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [{ operation: 'synthesize', unit: '1m-characters', amount: 100, currency: 'USD' }],
  },
  {
    provider: 'minimax',
    model: 'speech-2.8-turbo',
    task: 'speech-synthesis',
    description: '## Positioning\nMiniMax’s current speed-and-cost speech route, retaining natural flow, sound tags, 40-language coverage, emotion control, and streaming support.\n\n## Routing\nUse as the default MiniMax TTS route for conversational and high-volume production; escalate quality-sensitive narration to HD.',
    specialties: ['fast speech synthesis', 'multilingual synthesis', 'sound tags', 'voice agents', 'cost-efficient TTS'],
    limitations: ['below the HD route for maximum realism and detail', 'voice cloning and voice design incur separate fees'],
    bestFor: ['voice agents', 'high-volume TTS', 'responsive multilingual speech'],
    avoidFor: ['quality-first studio narration'],
    speedClass: 'fast',
    modelSource: 'https://platform.minimax.io/docs/api-reference/api-overview',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [{ operation: 'synthesize', unit: '1m-characters', amount: 60, currency: 'USD' }],
  },
  {
    provider: 'minimax',
    model: 'music-3.0',
    task: 'audio-generation',
    description: '## Positioning\nMiniMax’s current music-generation route for full-song creation from musical direction and lyrics.\n\n## Routing\nUse for music and song generation, not speech synthesis or sound-effect-only tasks.',
    specialties: ['song generation', 'music composition', 'lyrics-to-music', 'vocal music'],
    limitations: ['not a speech-synthesis model', 'from 2026-08-20 the paid API is unavailable to new users and the free API is discontinued; existing paying users may continue', 'new deployments should prefer MiniMax Audio or the open-source MiniMax Music 3 model'],
    bestFor: ['original songs', 'music demos', 'lyric-driven composition'],
    avoidFor: ['new paid API integrations', 'spoken narration', 'deterministic audio editing'],
    speedClass: 'async',
    modelSource: 'https://platform.minimax.io/docs/api-reference/api-overview',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [{ operation: 'generate', unit: 'up-to-5-minutes-music', amount: 0.15, currency: 'USD', tier: 'existing paying users only' }],
    pricingNotes: 'The API is retained only for existing paying users as of 2026-08-20; this rate does not imply availability to new users.',
  },
  {
    provider: 'minimax',
    model: 'image-01',
    task: 'image-generation',
    description: '## Positioning\nMiniMax’s production image route for text-to-image and subject-reference image-to-image generation, with custom sizes, multiple aspect ratios, seeds, and up to nine outputs per request.\n\n## Routing\nUse for MiniMax-native image generation and subject-preserving variants; use H3 or Hailuo when the desired output is video.',
    specialties: ['text-to-image', 'subject-reference image generation', 'custom image sizes', 'seeded generation', 'batch variants'],
    limitations: ['not a video model', 'subject reference is character-oriented', 'the current public documentation does not expose an unambiguous pay-as-you-go image rate'],
    bestFor: ['product and character variants', 'batch image generation', 'custom aspect ratios'],
    avoidFor: ['video generation', 'general-purpose image editing without a subject-reference workflow'],
    speedClass: 'balanced',
    modelSource: 'https://platform.minimax.io/docs/guides/image-generation',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [{ operation: 'generate', unit: 'image', amount: 0.0035, currency: 'USD' }],
  },
]

const PORTRAITS = new Map(SPECS.map(spec => [identity(spec.provider, spec.model, spec.task), researchedTaskPortrait(spec)]))
const H3_SPEC = SPECS.find(spec => (
  spec.provider === 'minimax' && spec.model === 'MiniMax-H3' && spec.task === 'video-generation'
))!
const PORTABLE_H3 = portableH3Portrait()

export const CURATED_TASK_MODEL_PORTRAIT_IDS = SPECS.map(spec => `${spec.task}:${spec.provider}/${spec.model}`)

/** Return a cloned task portrait only for an exact provider/model/task identity. */
export function builtinTaskPortrait(
  provider: string,
  model: string,
  task: TaskModelTask,
): ModelPortrait | undefined {
  const normalizedModel = model.trim()
  const portrait = PORTRAITS.get(identity(provider.trim(), normalizedModel, task))
    ?? (task === 'video-generation' && ['MiniMaxAI/MiniMax-H3', 'MiniMax-H3'].includes(normalizedModel)
      ? PORTABLE_H3
      : undefined)
  return portrait === undefined ? undefined : structuredClone(portrait)
}

function identity(provider: string, model: string, task: TaskModelTask): string {
  return `${task}:${provider}/${model}`
}

function researchedTaskPortrait(spec: TaskPortraitSpec): ModelPortrait {
  const stem = `${spec.provider}-${spec.model}-${spec.task}`.replaceAll(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
  const modelEvidenceId = `${stem}-model`
  const pricingEvidenceId = `${stem}-pricing`
  const rates = spec.rates ?? []
  const evidence: NonNullable<ModelPortraitInput['evidence']>[number][] = [
    spec.modelSource,
    ...(spec.additionalModelSources ?? []),
  ].map((source, index) => ({
    id: index === 0 ? modelEvidenceId : `${modelEvidenceId}-${index + 1}`,
    kind: 'provider-doc' as const,
    source,
    observedAt: OBSERVED_AT,
    claims: ['model capabilities', 'input/output boundaries', 'routing limitations'],
  }))
  if (spec.pricingSource !== undefined) {
    evidence.push({
      id: pricingEvidenceId,
      kind: 'provider-doc',
      source: spec.pricingSource,
      observedAt: OBSERVED_AT,
      claims: ['provider pricing and billing tiers'],
    })
  }
  const portrait = normalizePortrait({
    description: spec.description,
    specialties: spec.specialties,
    limitations: spec.limitations,
    bestFor: spec.bestFor,
    avoidFor: spec.avoidFor,
    pricing: {
      rates: rates.map(rate => ({
        ...rate,
        effectiveFrom: rate.effectiveFrom ?? '2026-08-20',
        evidenceId: pricingEvidenceId,
      })),
      ...(spec.pricingNotes === undefined ? {} : { notes: spec.pricingNotes }),
    },
    performance: {
      speedClass: spec.speedClass,
      notes: 'Execution class and provider positioning only; measured duration belongs in lastProbe and usage observations.',
    },
    qualityScores: {},
    evidence,
  })
  return { ...portrait, validation: { ...portrait.validation, checkedAt: OBSERVED_AT } }
}

function portableH3Portrait(): ModelPortrait {
  const { pricingSource: _pricingSource, rates: _rates, ...capabilitySpec } = H3_SPEC
  const portrait = researchedTaskPortrait({
    ...capabilitySpec,
    provider: 'portable',
    model: 'MiniMaxAI/MiniMax-H3',
    pricingNotes: 'Provider-independent open-weight H3 capability portrait. Local infrastructure cost and hosted API price depend on the selected deployment.',
  })
  return portrait
}
