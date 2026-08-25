import { describe, expect, it } from 'vitest'
import { filterPortraitTargets, snapshotPortraitTargets } from '../src/client/portrait-targets.js'

describe('model portrait settings targets', () => {
  const catalog = {
    languageModels: [{
      id: 'llm:volcengine/doubao-seed-2-0-lite-260215',
      kind: 'llm',
      provider: 'volcengine',
      providerName: 'Volcengine account',
      model: 'doubao-seed-2-0-lite-260215',
      displayName: 'Doubao Seed 2.0 Lite',
      status: 'live',
      portrait: { validation: { state: 'partial' } },
    }, {
      id: 'llm:deepseek-official/deepseek-v4-pro',
      kind: 'llm',
      provider: 'deepseek-official',
      providerName: 'DeepSeek',
      model: 'deepseek-v4-pro',
      displayName: 'DeepSeek-V4-Pro',
      status: 'live',
    }],
    taskModels: [{
      id: 'openai/gpt-image-2',
      provider: 'openai',
      model: 'gpt-image-2',
      displayName: 'GPT Image 2',
      task: 'image-generation',
      input: ['text', 'image'],
      output: ['image'],
      enabled: true,
      connectionProfile: { displayName: 'OpenAI Images' },
      portrait: { validation: { state: 'valid' } },
    }],
    languageFailures: [],
  }

  it('uses the unified server catalog, including DeepSeek outside llm-pi-ai settings', () => {
    expect(snapshotPortraitTargets(catalog)).toEqual([
      expect.objectContaining({
        id: 'llm:volcengine/doubao-seed-2-0-lite-260215',
        kind: 'llm',
        providerName: 'Volcengine account',
        portrait: { validation: { state: 'partial' } },
      }),
      expect.objectContaining({
        id: 'llm:deepseek-official/deepseek-v4-pro',
        kind: 'llm',
        providerName: 'DeepSeek',
        name: 'DeepSeek-V4-Pro',
      }),
      expect.objectContaining({
        id: 'openai/gpt-image-2',
        kind: 'task',
        providerName: 'OpenAI Images',
      }),
    ])
  })

  it('uses the registry effective enabled state for task models', () => {
    const disabled = { ...catalog, taskModels: [{ ...catalog.taskModels[0], enabled: false }] }
    expect(snapshotPortraitTargets(disabled)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'openai/gpt-image-2', enabled: false }),
    ]))
  })

  it('combines text, type, provider, portrait-state, and enabled filters', () => {
    const targets = snapshotPortraitTargets(catalog)
    expect(filterPortraitTargets(targets, { kind: 'llm', provider: 'volcengine', state: 'partial' }).map(item => item.id))
      .toEqual(['llm:volcengine/doubao-seed-2-0-lite-260215'])
    expect(filterPortraitTargets(targets, { query: 'image', availability: 'enabled' }).map(item => item.id))
      .toEqual(['openai/gpt-image-2'])
    expect(filterPortraitTargets(targets, { kind: 'task', availability: 'disabled' })).toEqual([])
  })
})
