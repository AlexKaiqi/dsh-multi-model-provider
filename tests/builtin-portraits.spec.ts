import { describe, expect, it } from 'vitest'
import {
  builtinLlmPortrait,
  CURATED_LLM_PORTRAIT_IDS,
  CURATED_LLM_PORTRAIT_SELECTION,
  CURATED_PORTABLE_LLM_MODEL_IDS,
} from '../src/portraits/builtin.ts'

describe('curated built-in LLM portraits', () => {
  it('covers current mainstream routes without an arbitrary model-count cap', () => {
    expect(CURATED_LLM_PORTRAIT_IDS).toEqual([
      'llm:openai/gpt-5.6-sol',
      'llm:openai/gpt-5.6-terra',
      'llm:anthropic/claude-opus-5',
      'llm:anthropic/claude-sonnet-5',
      'llm:google/gemini-3.1-pro-preview',
      'llm:google/gemini-3.7-flash',
      'llm:xai/grok-4.5',
      'llm:xai/grok-4.3',
      'llm:deepseek/deepseek-v4-pro',
      'llm:deepseek/deepseek-v4-flash',
      'llm:moonshotai/kimi-k3',
      'llm:moonshotai/kimi-k2.6',
      'llm:zai/glm-5.3',
      'llm:zai/glm-5-turbo',
      'llm:zai/glm-5v-turbo',
      'llm:minimax/MiniMax-M3',
      'llm:minimax/MiniMax-M2.7',
      'llm:mistral/mistral-small-2603',
      'llm:mistral/ministral-8b-latest',
    ])
    expect(CURATED_LLM_PORTRAIT_SELECTION.policy).toBe('latest-mainstream-first')
    expect(CURATED_LLM_PORTRAIT_SELECTION.usageSource).toMatch(/^https:\/\//)
    expect(CURATED_LLM_PORTRAIT_SELECTION.providerCatalogs).toHaveLength(10)
    expect(CURATED_LLM_PORTRAIT_SELECTION.rationale).toContain('no fixed model count')
    expect(CURATED_LLM_PORTRAIT_SELECTION.rationale).toContain('private-deployment adoption')
  })

  it('uses source-backed qualitative facts and prices without pretending documentation is a live probe', () => {
    for (const id of CURATED_LLM_PORTRAIT_IDS) {
      const [provider, model] = id.slice(4).split('/', 2) as [string, string]
      const portrait = builtinLlmPortrait(provider, model)!
      expect(portrait.validation.state).toBe('valid')
      expect(portrait.description).toContain('## Positioning')
      expect(portrait.pricing.rates.length).toBeGreaterThan(0)
      expect(portrait.evidence.every(item => item.source.startsWith('https://'))).toBe(true)
      expect(portrait.performance.lastProbe).toBeUndefined()
      expect(portrait.performance.typicalLatencyMs).toBeUndefined()
      expect(portrait.qualityScores).toEqual({})
    }
  })

  it('matches exact provider/model ids, returns clones, and never guesses aliases', () => {
    const first = builtinLlmPortrait('openai', 'gpt-5.6-terra')!
    const second = builtinLlmPortrait('openai', 'gpt-5.6-terra')!
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(builtinLlmPortrait('openai', 'gpt-5.6-terra-latest')).toBeUndefined()
    expect(builtinLlmPortrait('openrouter', 'openai/gpt-5.6-terra')).toBeUndefined()
  })

  it('matches portable capability portraits by explicit model id without leaking provider prices', () => {
    expect(CURATED_PORTABLE_LLM_MODEL_IDS).toEqual([
      'qwen3.8-max-preview',
      'qwen3.7-plus',
      'Qwen/Qwen3.5-4B',
      'Qwen/Qwen3.5-9B',
      'Qwen/Qwen3.5-27B',
      'Qwen/Qwen3.6-35B-A3B',
      'Qwen/Qwen3-Coder-Next',
      'MiniMaxAI/MiniMax-M3',
      'MiniMaxAI/MiniMax-M2.7',
      'mistralai/Mistral-Small-4-119B-2603',
      'mistralai/Ministral-3-8B-Instruct-2512',
    ])
    for (const model of CURATED_PORTABLE_LLM_MODEL_IDS) {
      const portrait = builtinLlmPortrait('self-hosted', model)!
      expect(portrait.validation.state).toBe('partial')
      expect(portrait.description).toContain('## Positioning')
      expect(portrait.pricing.rates).toEqual([])
      expect(portrait.evidence.every(item => item.source.startsWith('https://'))).toBe(true)
      expect(portrait.performance.speedClass).toBeUndefined()
      expect(portrait.qualityScores).toEqual({})
    }
    const qwen = builtinLlmPortrait('private-vllm', 'Qwen/Qwen3.5-9B')!
    expect(qwen.validation.state).toBe('partial')
    expect(qwen.specialties).toContain('private deployment')
    expect(qwen.pricing.rates).toEqual([])
    expect(qwen.pricing.notes).toContain('no universal price')
    expect(qwen.performance.speedClass).toBeUndefined()

    expect(builtinLlmPortrait('openrouter', 'qwen/qwen3.5-9b')).toEqual(qwen)
    expect(builtinLlmPortrait('private-vllm', 'qwen-3.5-9b')).toBeUndefined()
  })

  it('does not retain superseded routes merely because they still have traffic', () => {
    expect(builtinLlmPortrait('openai', 'gpt-5.4')).toBeUndefined()
    expect(builtinLlmPortrait('openai', 'gpt-5.4-mini')).toBeUndefined()
    expect(builtinLlmPortrait('anthropic', 'claude-opus-4-7')).toBeUndefined()
    expect(builtinLlmPortrait('anthropic', 'claude-sonnet-4-6')).toBeUndefined()
    expect(builtinLlmPortrait('google', 'gemini-3.6-flash')).toBeUndefined()
  })

  it('records current DeepSeek peak and off-peak pricing as distinct tiers', () => {
    const flash = builtinLlmPortrait('deepseek', 'deepseek-v4-flash')!
    const pro = builtinLlmPortrait('deepseek', 'deepseek-v4-pro')!
    expect(flash.pricing.rates).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'cache-miss-input', tier: 'off-peak', amount: 0.22 }),
      expect.objectContaining({ operation: 'cache-miss-input', tier: 'peak', amount: 0.44 }),
      expect.objectContaining({ operation: 'output', tier: 'peak', amount: 1.32 }),
    ]))
    expect(pro.pricing.rates).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'cache-miss-input', tier: 'off-peak', amount: 0.66 }),
      expect.objectContaining({ operation: 'cache-miss-input', tier: 'peak', amount: 1.32 }),
      expect.objectContaining({ operation: 'output', tier: 'peak', amount: 3.96 }),
    ]))
    expect(flash.pricing.notes).toContain('01:00–04:00')
  })
})
