import { normalizePortrait } from '../portrait-core.ts'
import type { ModelPortrait, ModelPortraitInput, ModelPriceRate, SpeedClass } from '../types.ts'

const OBSERVED_AT = '2026-08-20T00:00:00.000Z'

export const CURATED_LLM_PORTRAIT_SELECTION = {
  observedAt: OBSERVED_AT,
  policy: 'latest-mainstream-first',
  usageSource: 'https://openrouter.ai/rankings?view=month',
  providerCatalogs: [
    'https://developers.openai.com/api/docs/models',
    'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    'https://ai.google.dev/gemini-api/docs/models',
    'https://api-docs.deepseek.com/quick_start/pricing/',
    'https://www.kimi.ai/help/kimi-api/api-model-selection',
    'https://docs.z.ai/guides/overview/pricing',
    'https://docs.x.ai/developers/models',
    'https://help.aliyun.com/zh/model-studio/text-generation-model',
    'https://www.minimax.io/models/text/m3',
    'https://docs.mistral.ai/models',
  ],
  rationale: 'Cover widely adopted providers and their current flagship, mainstream workhorse, or materially distinct modality, specialization, and deployment routes. There is no fixed model count. Usage and private-deployment adoption are secondary signals within the current generation.',
} as const

interface CuratedPortraitSpec {
  readonly provider: string
  readonly model: string
  readonly description: string
  readonly specialties: readonly string[]
  readonly limitations: readonly string[]
  readonly bestFor: readonly string[]
  readonly avoidFor: readonly string[]
  readonly speedClass: SpeedClass
  readonly modelSource: string
  readonly pricingSource: string
  readonly rates: readonly Omit<ModelPriceRate, 'evidenceId'>[]
  readonly pricingNotes?: string
}

interface PortablePortraitSpec {
  /** Canonical identity shown in inventory; aliases below are all exact matches. */
  readonly canonicalModel: string
  readonly modelIds: readonly string[]
  readonly description: string
  readonly specialties: readonly string[]
  readonly limitations: readonly string[]
  readonly bestFor: readonly string[]
  readonly avoidFor: readonly string[]
  readonly modelSource: string
}

const SPECS: readonly CuratedPortraitSpec[] = [
  {
    provider: 'openai',
    model: 'gpt-5.6-sol',
    description: '## Positioning\nOpenAI’s current flagship for complex professional work, reasoning, coding, and long-context tasks.\n\n## Routing\nPrefer when correctness and reasoning depth matter more than minimum price or latency.',
    specialties: ['complex professional work', 'coding', 'deep reasoning', 'long-context tasks', 'tool-heavy agent work'],
    limitations: ['higher token price than GPT-5.6 Terra and Luna', 'not the economical default for simple high-volume classification'],
    bestFor: ['architecture and difficult coding', 'high-stakes analysis', 'complex long-horizon agent work'],
    avoidFor: ['routine classification', 'latency-first bulk extraction'],
    speedClass: 'balanced',
    modelSource: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol',
    pricingSource: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 5, currency: 'USD' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.5, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 30, currency: 'USD' },
    ],
  },
  {
    provider: 'openai',
    model: 'gpt-5.6-terra',
    description: '## Positioning\nOpenAI’s current balanced model for workloads that need strong intelligence with lower cost than the flagship.\n\n## Routing\nUse as the mainstream OpenAI workhorse for coding, tools, and general agent tasks; escalate the hardest work to Sol.',
    specialties: ['coding', 'tool use', 'general agent work', 'long-context tasks'],
    limitations: ['below GPT-5.6 Sol on the hardest reasoning work', 'more expensive than GPT-5.6 Luna for simple high-volume tasks'],
    bestFor: ['general coding and review', 'tool-using agents', 'bounded multi-step work'],
    avoidFor: ['the hardest high-stakes reasoning tasks'],
    speedClass: 'balanced',
    modelSource: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra',
    pricingSource: 'https://developers.openai.com/api/docs/models/gpt-5.6-terra',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 2, currency: 'USD' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.2, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 12, currency: 'USD' },
    ],
  },
  {
    provider: 'anthropic',
    model: 'claude-opus-5',
    description: '## Positioning\nAnthropic’s current Opus model for complex agentic coding, enterprise work, deep reasoning, vision, and long-horizon tasks.\n\n## Routing\nPrefer for difficult work where quality justifies premium cost and moderate comparative latency.',
    specialties: ['complex reasoning', 'agentic coding', 'long-horizon work', 'vision'],
    limitations: ['premium token price', 'moderate comparative latency rather than the fastest Claude tier'],
    bestFor: ['high-autonomy coding', 'deep technical investigation', 'high-cost-of-error tasks'],
    avoidFor: ['simple high-volume requests', 'strict latency-first workloads'],
    speedClass: 'balanced',
    modelSource: 'https://platform.claude.com/docs/en/about-claude/models/choosing-a-model',
    pricingSource: 'https://platform.claude.com/docs/en/about-claude/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 5, currency: 'USD' },
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.5, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 25, currency: 'USD' },
    ],
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    description: '## Positioning\nAnthropic’s current Sonnet model and mainstream workhorse, combining frontier intelligence with fast performance for coding, agents, analysis, and visual understanding.\n\n## Routing\nUse for broad production workloads; escalate the most demanding long-horizon tasks to Opus 5.',
    specialties: ['coding', 'analysis', 'agentic tool use', 'vision'],
    limitations: ['not Anthropic’s preferred tier for the most complex long-horizon work', 'uses adaptive thinking by default and rejects non-default sampling parameters'],
    bestFor: ['general agent work', 'coding and review', 'analysis with tools'],
    avoidFor: ['tasks explicitly requiring the strongest available Claude model'],
    speedClass: 'fast',
    modelSource: 'https://platform.claude.com/docs/en/about-claude/models/whats-new-sonnet-5',
    pricingSource: 'https://platform.claude.com/docs/en/about-claude/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 2, currency: 'USD' },
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.2, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 10, currency: 'USD' },
    ],
  },
  {
    provider: 'google',
    model: 'gemini-3.1-pro-preview',
    description: '## Positioning\nGoogle preview model for advanced reasoning, coding, agentic work, and multimodal understanding.\n\n## Routing\nPrefer for complex multimodal or very long-context tasks; account for preview lifecycle and long-prompt pricing tiers.',
    specialties: ['advanced reasoning', 'multimodal understanding', 'coding', 'agentic workflows'],
    limitations: ['preview lifecycle', 'higher prices above 200k prompt tokens'],
    bestFor: ['complex multimodal analysis', 'large-context reasoning', 'difficult coding'],
    avoidFor: ['simple high-volume processing', 'workloads requiring a stable GA endpoint'],
    speedClass: 'balanced',
    modelSource: 'https://ai.google.dev/gemini-api/docs/models',
    pricingSource: 'https://ai.google.dev/gemini-api/docs/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 2, currency: 'USD', tier: 'prompt <=200k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 12, currency: 'USD', tier: 'prompt <=200k tokens' },
      { operation: 'input', unit: '1m-tokens', amount: 4, currency: 'USD', tier: 'prompt >200k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 18, currency: 'USD', tier: 'prompt >200k tokens' },
    ],
  },
  {
    provider: 'google',
    model: 'gemini-3.7-flash',
    description: '## Positioning\nGoogle’s latest and most capable Flash workhorse for complex coding, agentic workflows, reliable multi-step execution, and multimodal reasoning.\n\n## Routing\nUse as the mainstream Gemini route for agentic and multimodal tasks.',
    specialties: ['complex coding', 'agentic workflows', 'multimodal reasoning', 'search and grounding'],
    limitations: ['not the preferred tier when maximum Pro reasoning depth is the only objective'],
    bestFor: ['high-volume agent work', 'multimodal processing', 'tool-heavy workflows'],
    avoidFor: ['tasks requiring the deepest available Gemini Pro reasoning'],
    speedClass: 'fast',
    modelSource: 'https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash',
    pricingSource: 'https://ai.google.dev/gemini-api/docs/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 0.75, currency: 'USD', effectiveTo: '2026-12-31' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.075, currency: 'USD', effectiveTo: '2026-12-31' },
      { operation: 'output', unit: '1m-tokens', amount: 3.75, currency: 'USD', effectiveTo: '2026-12-31' },
    ],
    pricingNotes: 'Promotional standard pricing documented through 2026-12-31; re-research after that date.',
  },
  {
    provider: 'xai',
    model: 'grok-4.5',
    description: '## Positioning\nxAI’s current frontier model for coding, agentic software, engineering, and knowledge work.\n\n## Routing\nPrefer for difficult agentic coding and engineering workflows; use Grok 4.3 when lower price and a larger context window matter more.',
    specialties: ['agentic coding', 'software engineering', 'reasoning', 'tool use', 'vision'],
    limitations: ['higher token price than Grok 4.3', 'long-context requests at or above 200k tokens use doubled token rates'],
    bestFor: ['complex software engineering', 'agentic workflow automation', 'difficult technical knowledge work'],
    avoidFor: ['simple high-volume requests', 'cost-sensitive very-long-context processing'],
    speedClass: 'balanced',
    modelSource: 'https://docs.x.ai/developers/models/grok-4.5',
    pricingSource: 'https://docs.x.ai/developers/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 2, currency: 'USD', tier: 'context <200k tokens' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.3, currency: 'USD', tier: 'context <200k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 6, currency: 'USD', tier: 'context <200k tokens' },
      { operation: 'input', unit: '1m-tokens', amount: 4, currency: 'USD', tier: 'context >=200k tokens' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.6, currency: 'USD', tier: 'context >=200k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 12, currency: 'USD', tier: 'context >=200k tokens' },
    ],
  },
  {
    provider: 'xai',
    model: 'grok-4.3',
    description: '## Positioning\nxAI’s current fast, reliable general workhorse with strong tool calling, instruction following, configurable reasoning, vision, and a 1M-token context window.\n\n## Routing\nUse for broad agent workloads where speed, price, and very long context are more important than Grok 4.5’s frontier coding capability.',
    specialties: ['tool calling', 'instruction following', 'long context', 'configurable reasoning', 'vision'],
    limitations: ['below Grok 4.5 for the hardest coding and engineering work', 'long-context requests at or above 200k tokens use doubled token rates'],
    bestFor: ['general agent work', 'tool-heavy workflows', 'large-context analysis'],
    avoidFor: ['tasks explicitly requiring xAI’s strongest coding model'],
    speedClass: 'fast',
    modelSource: 'https://docs.x.ai/developers/models/grok-4.3',
    pricingSource: 'https://docs.x.ai/developers/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 1.25, currency: 'USD', tier: 'context <200k tokens' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.2, currency: 'USD', tier: 'context <200k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 2.5, currency: 'USD', tier: 'context <200k tokens' },
      { operation: 'input', unit: '1m-tokens', amount: 2.5, currency: 'USD', tier: 'context >=200k tokens' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.4, currency: 'USD', tier: 'context >=200k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 5, currency: 'USD', tier: 'context >=200k tokens' },
    ],
  },
  {
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
    description: '## Positioning\nDeepSeek’s higher-capability V4 route for agentic coding, reasoning, STEM, and long-context work.\n\n## Routing\nPrefer over Flash when the task is difficult enough that added reasoning capability outweighs cost and concurrency.',
    specialties: ['agentic coding', 'reasoning', 'math and STEM', 'long context'],
    limitations: ['higher price and lower documented concurrency than V4 Flash'],
    bestFor: ['complex coding', 'difficult reasoning', 'high-correctness-cost work'],
    avoidFor: ['simple high-volume agent tasks', 'maximum-concurrency workloads'],
    speedClass: 'balanced',
    modelSource: 'https://api-docs.deepseek.com/news/news260424/',
    pricingSource: 'https://api-docs.deepseek.com/quick_start/pricing/',
    rates: [
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.022, currency: 'USD', tier: 'off-peak' },
      { operation: 'cache-miss-input', unit: '1m-tokens', amount: 0.66, currency: 'USD', tier: 'off-peak' },
      { operation: 'output', unit: '1m-tokens', amount: 1.98, currency: 'USD', tier: 'off-peak' },
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.044, currency: 'USD', tier: 'peak' },
      { operation: 'cache-miss-input', unit: '1m-tokens', amount: 1.32, currency: 'USD', tier: 'peak' },
      { operation: 'output', unit: '1m-tokens', amount: 3.96, currency: 'USD', tier: 'peak' },
    ],
    pricingNotes: 'Peak hours are 01:00–04:00 and 06:00–10:00 UTC; all other hours are off-peak.',
  },
  {
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    description: '## Positioning\nDeepSeek’s fast, efficient V4 route with reasoning close to Pro and parity on simple agent tasks.\n\n## Routing\nUse as the default DeepSeek workhorse for routine agent tasks, high volume, and cost-sensitive work.',
    specialties: ['simple agent tasks', 'cost-efficient reasoning', 'high-throughput work', 'long context'],
    limitations: ['below V4 Pro on the hardest reasoning and agentic coding tasks'],
    bestFor: ['routine agent work', 'summaries and bounded edits', 'cost-sensitive routing'],
    avoidFor: ['the hardest high-stakes reasoning tasks'],
    speedClass: 'fast',
    modelSource: 'https://api-docs.deepseek.com/news/news260424/',
    pricingSource: 'https://api-docs.deepseek.com/quick_start/pricing/',
    rates: [
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.007, currency: 'USD', tier: 'off-peak' },
      { operation: 'cache-miss-input', unit: '1m-tokens', amount: 0.22, currency: 'USD', tier: 'off-peak' },
      { operation: 'output', unit: '1m-tokens', amount: 0.66, currency: 'USD', tier: 'off-peak' },
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.014, currency: 'USD', tier: 'peak' },
      { operation: 'cache-miss-input', unit: '1m-tokens', amount: 0.44, currency: 'USD', tier: 'peak' },
      { operation: 'output', unit: '1m-tokens', amount: 1.32, currency: 'USD', tier: 'peak' },
    ],
    pricingNotes: 'Peak hours are 01:00–04:00 and 06:00–10:00 UTC; all other hours are off-peak.',
  },
  {
    provider: 'moonshotai',
    model: 'kimi-k3',
    description: '## Positioning\nKimi’s current flagship for long-horizon coding, end-to-end knowledge work, reasoning, native vision, and 1M-token context.\n\n## Routing\nPrefer for the hardest Kimi workloads and very large contexts; use K2.6 when lower cost or switchable thinking is more important.',
    specialties: ['long-horizon coding', 'knowledge work', 'reasoning', 'native vision', 'long context'],
    limitations: ['highest-priced current Kimi API route', 'always runs in thinking mode', 'model switching within an existing session harms cache reuse and is discouraged by the provider'],
    bestFor: ['large-repository engineering', 'long-document reasoning', 'complex multimodal knowledge work'],
    avoidFor: ['simple high-volume requests', 'workloads that require non-thinking mode'],
    speedClass: 'balanced',
    modelSource: 'https://www.kimi.ai/help/kimi-api/api-model-selection',
    pricingSource: 'https://www.kimi.ai/resources/kimi-k3-pricing',
    rates: [
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.3, currency: 'USD' },
      { operation: 'cache-miss-input', unit: '1m-tokens', amount: 3, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 15, currency: 'USD' },
    ],
  },
  {
    provider: 'moonshotai',
    model: 'kimi-k2.6',
    description: '## Positioning\nKimi’s current cost-efficient multimodal workhorse for conversation, coding, vision, video understanding, and agent tasks, with switchable thinking and a 256K context window.\n\n## Routing\nUse for broad Kimi workloads when K3-level capability or 1M context is unnecessary.',
    specialties: ['coding', 'agent tasks', 'visual understanding', 'video understanding', 'switchable reasoning'],
    limitations: ['smaller context and lower capability ceiling than Kimi K3'],
    bestFor: ['general agent work', 'multimodal analysis', 'cost-sensitive coding and conversation'],
    avoidFor: ['the hardest long-horizon work', 'inputs requiring more than 256K context'],
    speedClass: 'fast',
    modelSource: 'https://www.kimi.ai/help/kimi-api/api-model-selection',
    pricingSource: 'https://platform.kimi.ai/docs/pricing/chat-k26',
    rates: [
      { operation: 'cache-hit-input', unit: '1m-tokens', amount: 0.16, currency: 'USD' },
      { operation: 'cache-miss-input', unit: '1m-tokens', amount: 0.95, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 4, currency: 'USD' },
    ],
  },
  {
    provider: 'zai',
    model: 'glm-5.3',
    description: '## Positioning\nZ.ai’s latest flagship for complex software engineering, long-horizon agents, and deep reasoning, with a 1M-token context window.\n\n## Routing\nPrefer for the hardest GLM coding and agent work; choose GLM-5-Turbo for routine work or GLM-5V-Turbo when image input is required.',
    specialties: ['complex software engineering', 'long-horizon agents', 'deep reasoning', 'long context'],
    limitations: ['text-only input', 'reasoning is always enabled and cannot be disabled'],
    bestFor: ['large-scale coding', 'terminal and tool workflows', 'complex long-running agent tasks'],
    avoidFor: ['vision tasks', 'latency-first non-reasoning requests'],
    speedClass: 'balanced',
    modelSource: 'https://docs.z.ai/guides/llm/glm-5.3',
    pricingSource: 'https://docs.z.ai/guides/overview/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 1.4, currency: 'USD' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.26, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 4.4, currency: 'USD' },
    ],
  },
  {
    provider: 'zai',
    model: 'glm-5-turbo',
    description: '## Positioning\nZ.ai’s mainstream GLM workhorse for reasoning, coding, and agent tasks at lower cost than the flagship.\n\n## Routing\nUse for routine production agent and coding workloads that do not require GLM-5.3’s maximum capability or 1M context.',
    specialties: ['coding', 'reasoning', 'agent tasks', 'cost-efficient production work'],
    limitations: ['below GLM-5.3 on complex long-horizon software engineering', 'text-only input'],
    bestFor: ['general coding', 'bounded agent work', 'cost-sensitive reasoning'],
    avoidFor: ['vision tasks', 'the hardest long-horizon coding tasks'],
    speedClass: 'fast',
    modelSource: 'https://docs.z.ai/guides/llm/glm-5-turbo',
    pricingSource: 'https://docs.z.ai/guides/overview/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 1.2, currency: 'USD' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.24, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 4, currency: 'USD' },
    ],
  },
  {
    provider: 'zai',
    model: 'glm-5v-turbo',
    description: '## Positioning\nZ.ai’s current multimodal coding foundation model for vision-based coding and multimodal agent tasks.\n\n## Routing\nUse when screenshots, UI states, diagrams, or other visual inputs are central to a coding or agent workflow.',
    specialties: ['vision-based coding', 'multimodal agents', 'visual understanding', 'tool use'],
    limitations: ['specialized multimodal route rather than the strongest text-only GLM reasoning model'],
    bestFor: ['UI implementation from screenshots', 'visual debugging', 'multimodal agent workflows'],
    avoidFor: ['text-only tasks that need GLM-5.3’s maximum reasoning capability'],
    speedClass: 'fast',
    modelSource: 'https://docs.z.ai/guides/vlm/glm-5v-turbo',
    pricingSource: 'https://docs.z.ai/guides/overview/pricing',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 1.2, currency: 'USD' },
      { operation: 'cached-input', unit: '1m-tokens', amount: 0.24, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 4, currency: 'USD' },
    ],
  },
  {
    provider: 'minimax',
    model: 'MiniMax-M3',
    description: '## Positioning\nMiniMax’s current open-weight frontier model for coding, long-horizon agents, native image/video understanding, and contexts up to 1M tokens.\n\n## Routing\nPrefer for repository-scale coding, computer-use workflows, and multimodal long-context work; do not confuse open weights with lightweight local deployment.',
    specialties: ['agentic coding', 'computer use', 'native multimodality', 'long context', 'private deployment'],
    limitations: ['very large 428B-total / 23B-active MoE footprint', 'self-hosting requires substantial accelerator capacity', 'longer than 512K inputs use a higher API price tier'],
    bestFor: ['large-repository engineering', 'multimodal computer-use agents', 'long-video and long-document analysis'],
    avoidFor: ['low-VRAM local inference', 'simple latency-first requests'],
    speedClass: 'balanced',
    modelSource: 'https://www.minimax.io/blog/minimax-m3',
    pricingSource: 'https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 0.3, currency: 'USD', tier: 'input <=512k tokens' },
      { operation: 'cache-read-input', unit: '1m-tokens', amount: 0.06, currency: 'USD', tier: 'input <=512k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 1.2, currency: 'USD', tier: 'input <=512k tokens' },
      { operation: 'input', unit: '1m-tokens', amount: 0.6, currency: 'USD', tier: 'input >512k tokens' },
      { operation: 'cache-read-input', unit: '1m-tokens', amount: 0.12, currency: 'USD', tier: 'input >512k tokens' },
      { operation: 'output', unit: '1m-tokens', amount: 2.4, currency: 'USD', tier: 'input >512k tokens' },
    ],
  },
  {
    provider: 'minimax',
    model: 'MiniMax-M2.7',
    description: '## Positioning\nMiniMax’s widely deployed open-weight workhorse for real-world software engineering, professional office delivery, and character-rich interaction.\n\n## Routing\nUse when its low API price, self-hosting option, and strong coding/office profile matter more than M3 multimodality or 1M context.',
    specialties: ['software engineering', 'office productivity', 'tool use', 'role interaction', 'private deployment'],
    limitations: ['text-only model', '204.8K context is smaller than M3', 'large 229B-parameter checkpoint is not a low-VRAM model'],
    bestFor: ['cost-sensitive coding agents', 'office document workflows', 'self-hosted enterprise agents'],
    avoidFor: ['image or video understanding', 'edge-device inference'],
    speedClass: 'fast',
    modelSource: 'https://platform.minimax.io/docs/guides/text-generation',
    pricingSource: 'https://platform.minimax.io/docs/guides/pricing-paygo',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 0.3, currency: 'USD' },
      { operation: 'cache-read-input', unit: '1m-tokens', amount: 0.06, currency: 'USD' },
      { operation: 'cache-write-input', unit: '1m-tokens', amount: 0.375, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 1.2, currency: 'USD' },
    ],
  },
  {
    provider: 'mistral',
    model: 'mistral-small-2603',
    description: '## Positioning\nMistral Small 4 is an Apache-2.0 open-weight MoE that unifies general instruction following, configurable reasoning, vision, and agentic coding with 6B active parameters.\n\n## Routing\nUse as Mistral’s efficient generalist API route or for customizable on-prem deployments with multi-accelerator infrastructure.',
    specialties: ['configurable reasoning', 'agentic coding', 'vision', 'multilingual work', 'private deployment'],
    limitations: ['119B total parameters', 'official minimum self-hosting configurations use datacenter-class multi-GPU systems'],
    bestFor: ['cost-efficient multimodal agents', 'customized enterprise assistants', 'open-weight reasoning and coding'],
    avoidFor: ['single consumer-GPU deployment', 'tasks needing the strongest Mistral Medium capability'],
    speedClass: 'fast',
    modelSource: 'https://mistral.ai/news/mistral-small-4/',
    pricingSource: 'https://docs.mistral.ai/models/model-selection-guide?models=mistral-small-4-0-26-03',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 0.15, currency: 'USD' },
      { operation: 'cache-read-input', unit: '1m-tokens', amount: 0.015, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 0.6, currency: 'USD' },
    ],
  },
  {
    provider: 'mistral',
    model: 'ministral-8b-latest',
    description: '## Positioning\nMinistral 3 8B is Mistral’s current small multimodal model for edge and local deployment, with function calling, structured output, and a 256K context.\n\n## Routing\nPrefer for privacy-sensitive local assistants and modest-hardware text/vision workloads; escalate harder reasoning to a larger model.',
    specialties: ['edge deployment', 'low-VRAM inference', 'vision', 'function calling', 'multilingual work'],
    limitations: ['8B capability ceiling', 'the API latest alias can advance and should be re-researched periodically'],
    bestFor: ['private local assistants', 'document and image extraction', 'high-volume bounded tool calls'],
    avoidFor: ['frontier reasoning', 'complex long-horizon software engineering'],
    speedClass: 'fast',
    modelSource: 'https://docs.mistral.ai/models/model-cards/ministral-3-8b-25-12',
    pricingSource: 'https://docs.mistral.ai/models/model-cards/ministral-3-8b-25-12',
    rates: [
      { operation: 'input', unit: '1m-tokens', amount: 0.15, currency: 'USD' },
      { operation: 'output', unit: '1m-tokens', amount: 0.15, currency: 'USD' },
    ],
  },
]

const PORTABLE_SPECS: readonly PortablePortraitSpec[] = [
  {
    canonicalModel: 'qwen3.8-max-preview',
    modelIds: ['qwen3.8-max-preview'],
    description: '## Positioning\nQwen’s preview frontier route for always-on reasoning, multimodal understanding, coding, and long-running professional tasks.\n\n## Routing\nUse only when preview lifecycle risk is acceptable; select Qwen 3.7 Plus for a stable cost-balanced workhorse.',
    specialties: ['deep reasoning', 'coding', 'image and video understanding', 'long-running professional tasks'],
    limitations: ['preview endpoint may change or be replaced', 'thinking cannot be disabled', 'not an open-weight private-deployment model'],
    bestFor: ['hard Qwen reasoning tasks', 'complex multimodal agent work'],
    avoidFor: ['stable long-lived integrations', 'latency-first non-reasoning work'],
    modelSource: 'https://help.aliyun.com/zh/model-studio/token-plan-personal-overview',
  },
  {
    canonicalModel: 'qwen3.7-plus',
    modelIds: ['qwen3.7-plus', 'qwen/qwen3.7-plus'],
    description: '## Positioning\nQwen’s current cost-balanced production workhorse for coding, tools, image/video understanding, and 1M-token contexts.\n\n## Routing\nUse as the default Qwen cloud route; escalate only the hardest work to Max or move privacy-sensitive workloads to an open-weight Qwen checkpoint.',
    specialties: ['coding', 'tool use', 'image and video understanding', 'long context', 'production agents'],
    limitations: ['closed cloud model', 'provider-specific built-in tools and prices vary by route'],
    bestFor: ['general coding agents', 'large-context document work', 'multimodal production workflows'],
    avoidFor: ['air-gapped deployment', 'very small local hardware'],
    modelSource: 'https://help.aliyun.com/zh/model-studio/qwen3-7-plus',
  },
  {
    canonicalModel: 'Qwen/Qwen3.5-4B',
    modelIds: ['Qwen/Qwen3.5-4B', 'Qwen3.5-4B', 'qwen/qwen3.5-4b', 'qwen3.5-4b'],
    description: '## Positioning\nA 4B Apache-2.0 Qwen checkpoint with native text/image/video understanding, hybrid reasoning, and a native 262K context for low-footprint private deployment.\n\n## Routing\nUse for local extraction, classification, lightweight visual understanding, and fast preliminary routing; escalate complex generation and reasoning.',
    specialties: ['small private deployment', 'multimodal understanding', 'classification', 'information extraction', 'multilingual work'],
    limitations: ['4B capability ceiling', 'quality falls behind larger Qwen checkpoints on complex coding and long-horizon reasoning'],
    bestFor: ['on-device or single-GPU assistants', 'fast router-side analysis', 'privacy-sensitive bounded tasks'],
    avoidFor: ['complex autonomous coding', 'high-stakes deep reasoning'],
    modelSource: 'https://huggingface.co/Qwen/Qwen3.5-4B',
  },
  {
    canonicalModel: 'Qwen/Qwen3.5-9B',
    modelIds: ['Qwen/Qwen3.5-9B', 'Qwen3.5-9B', 'qwen/qwen3.5-9b', 'qwen3.5-9b'],
    description: '## Positioning\nA popular 9B Apache-2.0 Qwen checkpoint balancing local deployability with native multimodality, reasoning, agents, and a native 262K context.\n\n## Routing\nUse as a stronger private generalist than the 4B model when memory permits.',
    specialties: ['private deployment', 'multimodal understanding', 'reasoning', 'agents', 'multilingual work'],
    limitations: ['below 27B and 35B-A3B variants on difficult work', 'actual speed and context capacity depend on quantization and serving hardware'],
    bestFor: ['private general assistants', 'local document and image work', 'cost-controlled self-hosting'],
    avoidFor: ['frontier coding and reasoning', 'extremely constrained edge devices'],
    modelSource: 'https://huggingface.co/Qwen/Qwen3.5-9B',
  },
  {
    canonicalModel: 'Qwen/Qwen3.5-27B',
    modelIds: ['Qwen/Qwen3.5-27B', 'Qwen3.5-27B', 'qwen/qwen3.5-27b', 'qwen3.5-27b'],
    description: '## Positioning\nA 27B dense Qwen open-weight generalist for stronger private multimodal reasoning, coding, and agent work than the small 4B/9B tiers.\n\n## Routing\nUse when a private deployment can afford a larger dense checkpoint and predictable dense-model behavior matters.',
    specialties: ['private deployment', 'multimodal reasoning', 'coding', 'agents', 'long context'],
    limitations: ['materially higher memory and compute than 4B/9B', 'less inference-efficient than a sparse model with a similar stored footprint'],
    bestFor: ['higher-quality on-prem assistants', 'private coding and document analysis'],
    avoidFor: ['low-VRAM hardware', 'latency-first lightweight classification'],
    modelSource: 'https://huggingface.co/Qwen/Qwen3.5-27B',
  },
  {
    canonicalModel: 'Qwen/Qwen3.6-35B-A3B',
    modelIds: ['Qwen/Qwen3.6-35B-A3B', 'Qwen3.6-35B-A3B', 'qwen/qwen3.6-35b-a3b', 'qwen3.6-35b-a3b'],
    description: '## Positioning\nQwen’s current efficient open-weight MoE generalist: 35B stored parameters but only 3B active per token, with strong agentic coding and native multimodality.\n\n## Routing\nPrefer over dense 27B when throughput after loading the full checkpoint and strong coding are the main priorities.',
    specialties: ['agentic coding', 'private deployment', 'Mixture-of-Experts efficiency', 'multimodal reasoning', 'tool use'],
    limitations: ['full 35B checkpoint must still fit storage and memory', 'MoE serving support and tuning are more demanding than a small dense model'],
    bestFor: ['efficient on-prem coding agents', 'multimodal enterprise assistants', 'high-throughput private inference'],
    avoidFor: ['devices that cannot fit the full checkpoint', 'simple deployments without MoE-capable runtimes'],
    modelSource: 'https://qwen.ai/blog?id=qwen3.6-35b-a3b',
  },
  {
    canonicalModel: 'Qwen/Qwen3-Coder-Next',
    modelIds: ['Qwen/Qwen3-Coder-Next', 'Qwen3-Coder-Next', 'qwen/qwen3-coder-next', 'qwen3-coder-next'],
    description: '## Positioning\nQwen’s open-weight model specialized for coding agents and local development, with 3B active parameters and a 256K context.\n\n## Routing\nChoose for private repository work and coding agents; use a general Qwen checkpoint for visual or broad office tasks.',
    specialties: ['agentic coding', 'repository exploration', 'tool use', 'private deployment', 'local development'],
    limitations: ['coding specialization narrows its general-purpose value', 'requires the documented Qwen tool parser for reliable function calling'],
    bestFor: ['self-hosted coding assistants', 'multi-file edits', 'terminal agents'],
    avoidFor: ['vision tasks', 'general creative or office workloads'],
    modelSource: 'https://github.com/QwenLM/Qwen3-Coder',
  },
  {
    canonicalModel: 'MiniMaxAI/MiniMax-M3',
    modelIds: ['MiniMaxAI/MiniMax-M3', 'MiniMax-M3'],
    description: '## Positioning\nThe open-weight MiniMax M3 checkpoint for frontier coding, cowork agents, native multimodality, and 1M-token contexts.\n\n## Routing\nUse for private large-cluster deployments where M3’s capabilities justify its 428B-total / 23B-active footprint.',
    specialties: ['agentic coding', 'native multimodality', 'long context', 'private deployment'],
    limitations: ['not a small model', 'requires substantial serving infrastructure', 'community license terms must be reviewed for the intended deployment'],
    bestFor: ['large private AI clusters', 'repository-scale and multimodal agents'],
    avoidFor: ['single-GPU or low-VRAM inference', 'simple high-volume tasks'],
    modelSource: 'https://huggingface.co/MiniMaxAI/MiniMax-M3',
  },
  {
    canonicalModel: 'MiniMaxAI/MiniMax-M2.7',
    modelIds: ['MiniMaxAI/MiniMax-M2.7', 'MiniMax-M2.7'],
    description: '## Positioning\nThe open-weight MiniMax M2.7 checkpoint for software engineering, professional office delivery, and long-running agent work.\n\n## Routing\nUse for established private MiniMax deployments that do not need M3 vision or 1M context.',
    specialties: ['software engineering', 'office productivity', 'agents', 'private deployment'],
    limitations: ['229B-parameter checkpoint', 'text-only', 'not suitable for low-VRAM edge deployment'],
    bestFor: ['private enterprise coding agents', 'office workflow automation'],
    avoidFor: ['vision tasks', 'small local machines'],
    modelSource: 'https://huggingface.co/MiniMaxAI/MiniMax-M2.7',
  },
  {
    canonicalModel: 'mistralai/Mistral-Small-4-119B-2603',
    modelIds: ['mistralai/Mistral-Small-4-119B-2603', 'Mistral-Small-4-119B-2603', 'mistral-small-2603'],
    description: '## Positioning\nMistral Small 4’s Apache-2.0 open-weight checkpoint combines instruction following, reasoning, coding, and vision with 6B active parameters.\n\n## Routing\nUse for customizable enterprise deployments with datacenter-class multi-GPU capacity.',
    specialties: ['configurable reasoning', 'agentic coding', 'vision', 'private deployment', 'customization'],
    limitations: ['119B total parameters', 'official minimum infrastructure is multi-GPU datacenter hardware'],
    bestFor: ['on-prem multimodal agents', 'fine-tuned enterprise assistants'],
    avoidFor: ['consumer single-GPU deployment', 'tiny edge workloads'],
    modelSource: 'https://mistral.ai/news/mistral-small-4/',
  },
  {
    canonicalModel: 'mistralai/Ministral-3-8B-Instruct-2512',
    modelIds: ['mistralai/Ministral-3-8B-Instruct-2512', 'Ministral-3-8B-Instruct-2512', 'ministral-8b-2512', 'ministral-8b-latest'],
    description: '## Positioning\nAn Apache-2.0 8B text-and-vision instruct model built for edge and local deployment; the official FP8 checkpoint can fit in about 12GB VRAM.\n\n## Routing\nUse for privacy-sensitive bounded tasks on modest hardware, including local document vision and tool calling.',
    specialties: ['low-VRAM inference', 'edge deployment', 'vision', 'function calling', 'private deployment'],
    limitations: ['8B capability ceiling', 'reasoning-heavy work should be escalated'],
    bestFor: ['local multimodal assistants', 'private extraction and classification', 'bounded tool use'],
    avoidFor: ['frontier reasoning', 'complex autonomous coding'],
    modelSource: 'https://huggingface.co/mistralai/Ministral-3-8B-Instruct-2512',
  },
]

const PORTRAITS = new Map(SPECS.map(spec => [`${spec.provider}/${spec.model}`, researchedPortrait(spec)]))
const PORTABLE_PORTRAITS = new Map(PORTABLE_SPECS.flatMap(spec => {
  const portrait = portablePortrait(spec)
  return spec.modelIds.map(model => [model, portrait] as const)
}))

export const CURATED_LLM_PORTRAIT_IDS = [...PORTRAITS.keys()].map(id => `llm:${id}`)
export const CURATED_PORTABLE_LLM_MODEL_IDS = PORTABLE_SPECS.map(spec => spec.canonicalModel)

/** Return a cloned route portrait, or an exact-id portable capability portrait. */
export function builtinLlmPortrait(provider: string, model: string): ModelPortrait | undefined {
  const normalizedModel = model.trim()
  const portrait = PORTRAITS.get(`${provider.trim()}/${normalizedModel}`) ?? PORTABLE_PORTRAITS.get(normalizedModel)
  return portrait === undefined ? undefined : structuredClone(portrait)
}

function researchedPortrait(spec: CuratedPortraitSpec): ModelPortrait {
  const modelEvidenceId = `${spec.provider}-${spec.model}-model`
  const pricingEvidenceId = `${spec.provider}-${spec.model}-pricing`
  const input: ModelPortraitInput = {
    description: spec.description,
    specialties: spec.specialties,
    limitations: spec.limitations,
    bestFor: spec.bestFor,
    avoidFor: spec.avoidFor,
    pricing: {
      rates: spec.rates.map(rate => ({ ...rate, effectiveFrom: rate.effectiveFrom ?? '2026-08-20', evidenceId: pricingEvidenceId })),
      ...(spec.pricingNotes === undefined ? {} : { notes: spec.pricingNotes }),
    },
    performance: {
      speedClass: spec.speedClass,
      notes: 'Qualitative provider positioning only; measured latency belongs in lastProbe and usage observations.',
    },
    qualityScores: {},
    evidence: [
      {
        id: modelEvidenceId,
        kind: 'provider-doc',
        source: spec.modelSource,
        observedAt: OBSERVED_AT,
        claims: ['provider positioning', 'specialties', 'routing limitations'],
      },
      {
        id: pricingEvidenceId,
        kind: 'provider-doc',
        source: spec.pricingSource,
        observedAt: OBSERVED_AT,
        claims: ['token pricing and tiers'],
      },
    ],
  }
  const portrait = normalizePortrait(input)
  return {
    ...portrait,
    validation: { ...portrait.validation, checkedAt: OBSERVED_AT },
  }
}

function portablePortrait(spec: PortablePortraitSpec): ModelPortrait {
  const evidenceId = `portable-${spec.canonicalModel.replaceAll('/', '-').toLowerCase()}-model`
  const portrait = normalizePortrait({
    description: spec.description,
    specialties: spec.specialties,
    limitations: spec.limitations,
    bestFor: spec.bestFor,
    avoidFor: spec.avoidFor,
    pricing: {
      rates: [],
      notes: 'Provider-independent capability portrait: API price and self-hosted infrastructure cost depend on the selected route and deployment, so no universal price is asserted.',
    },
    performance: {
      notes: 'Provider and hardware independent: speed must come from a live route probe or privacy-safe usage observations.',
    },
    qualityScores: {},
    evidence: [{
      id: evidenceId,
      kind: 'provider-doc',
      source: spec.modelSource,
      observedAt: OBSERVED_AT,
      claims: ['model capabilities', 'specialization', 'deployment characteristics'],
    }],
  })
  return {
    ...portrait,
    validation: { ...portrait.validation, checkedAt: OBSERVED_AT },
  }
}
