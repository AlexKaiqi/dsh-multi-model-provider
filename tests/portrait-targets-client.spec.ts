import { describe, expect, it } from 'vitest'
import { filterPortraitTargets, snapshotPortraitTargets } from '../src/client/portrait-targets.js'

describe('model portrait settings targets', () => {
  const multi = {
    revision: 4,
    value: {
      connections: {
        'image-provider': { provider: 'openai', displayName: 'OpenAI Images' },
      },
      models: {
        'openai/gpt-image-2': {
          connection: 'image-provider',
          model: 'gpt-image-2',
          displayName: 'GPT Image 2',
          task: 'image-generation',
          input: ['text', 'image'],
          output: ['image'],
          enabled: false,
          portrait: { validation: { state: 'valid' } },
        },
      },
      portraits: {
        'llm:volcengine/doubao-seed-2-0-lite-260215': {
          kind: 'llm',
          provider: 'volcengine',
          model: 'doubao-seed-2-0-lite-260215',
          portrait: { validation: { state: 'partial' } },
        },
      },
    },
  }
  const llm = {
    revision: 8,
    value: {
      providers: {
        volcengine: {
          displayName: 'Volcengine account',
          models: [{ id: 'doubao-seed-2-0-lite-260215', name: 'Doubao Seed 2.0 Lite' }],
        },
      },
    },
  }

  it('does not turn built-in task catalog entries into portrait targets', () => {
    expect(snapshotPortraitTargets(multi, llm)).toEqual([
      expect.objectContaining({
        id: 'llm:volcengine/doubao-seed-2-0-lite-260215',
        kind: 'llm',
        providerName: 'Volcengine account',
        portrait: { validation: { state: 'partial' } },
      }),
    ])
  })

  it('includes a task route that the user registered explicitly', () => {
    const registered = {
      ...multi,
      user: {
        models: {
          'openai/gpt-image-2': {
            connection: 'image-provider',
            model: 'gpt-image-2',
            task: 'image-generation',
            enabled: false,
          },
        },
      },
    }
    expect(snapshotPortraitTargets(registered, llm)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'openai/gpt-image-2', kind: 'task', enabled: false }),
    ]))
  })

  it('uses provider-editor selection as the effective task enabled state', () => {
    const selected = {
      ...multi,
      user: {
        connections: {
          'image-provider': { models: [{ id: 'gpt-image-2' }] },
        },
      },
    }
    expect(snapshotPortraitTargets(selected, llm)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'openai/gpt-image-2', enabled: true }),
    ]))
  })

  it('combines text, type, provider, portrait-state, and enabled filters', () => {
    const selected = {
      ...multi,
      user: { connections: { 'image-provider': { models: [{ id: 'gpt-image-2' }] } } },
    }
    const targets = snapshotPortraitTargets(selected, llm)
    expect(filterPortraitTargets(targets, { kind: 'llm', provider: 'volcengine', state: 'partial' }).map(item => item.id))
      .toEqual(['llm:volcengine/doubao-seed-2-0-lite-260215'])
    expect(filterPortraitTargets(targets, { query: 'image', availability: 'enabled' }).map(item => item.id))
      .toEqual(['openai/gpt-image-2'])
    expect(filterPortraitTargets(targets, { kind: 'task', availability: 'disabled' })).toEqual([])
  })
})
