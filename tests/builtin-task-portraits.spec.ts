import { describe, expect, it } from 'vitest'
import {
  builtinTaskPortrait,
  CURATED_TASK_MODEL_PORTRAIT_IDS,
  CURATED_TASK_MODEL_PORTRAIT_SELECTION,
} from '../src/portraits/builtin-task.ts'

describe('bundled task-model portraits', () => {
  it('ships current specialized task families without an arbitrary count cap', () => {
    expect(CURATED_TASK_MODEL_PORTRAIT_SELECTION.policy).toBe('current-specialized-task-routes')
    expect(CURATED_TASK_MODEL_PORTRAIT_IDS).toEqual([
      'video-generation:google/gemini-omni-flash-preview',
      'video-generation:google/veo-3.1-generate-preview',
      'video-generation:google/veo-3.1-fast-generate-preview',
      'video-generation:google/veo-3.1-lite-generate-preview',
      'video-generation:openai/sora-2',
      'video-generation:openai/sora-2-pro',
      'video-generation:minimax/MiniMax-H3',
      'video-generation:minimax/MiniMax-Hailuo-2.3',
      'video-generation:minimax/MiniMax-Hailuo-2.3-Fast',
      'speech-synthesis:minimax/speech-2.8-hd',
      'speech-synthesis:minimax/speech-2.8-turbo',
      'audio-generation:minimax/music-3.0',
      'image-generation:minimax/image-01',
    ])
  })

  it('models H3 as an asynchronous video route with native audio and no invented price', () => {
    const portrait = builtinTaskPortrait('minimax', 'MiniMax-H3', 'video-generation')
    expect(portrait).toMatchObject({
      specialties: expect.arrayContaining(['native stereo audio', '2K video', 'private deployment']),
      limitations: expect.arrayContaining(['generation is asynchronous']),
      pricing: { rates: [
        expect.objectContaining({ amount: 0.08, tier: '768P' }),
        expect.objectContaining({ amount: 0.13, tier: '2K' }),
      ] },
      performance: { speedClass: 'async' },
      qualityScores: {},
      validation: { state: 'valid' },
    })
    expect(portrait?.performance.lastProbe).toBeUndefined()
    expect(portrait?.pricing.notes).toContain('first five reference images are free')
  })

  it('covers current Google video routes and keeps OpenAI legacy routes explicit', () => {
    expect(builtinTaskPortrait('google', 'gemini-omni-flash-preview', 'video-generation')).toMatchObject({
      specialties: expect.arrayContaining(['conversational video editing', 'fast iteration']),
      pricing: { rates: [expect.objectContaining({ amount: 0.10 })] },
      performance: { speedClass: 'fast' },
      validation: { state: 'valid' },
    })
    expect(builtinTaskPortrait('google', 'veo-3.1-lite-generate-preview', 'video-generation')).toMatchObject({
      pricing: { rates: [
        expect.objectContaining({ amount: 0.05, tier: '720p with audio' }),
        expect.objectContaining({ amount: 0.08, tier: '1080p with audio' }),
      ] },
      limitations: expect.arrayContaining(['4K is unsupported']),
    })
    expect(builtinTaskPortrait('openai', 'sora-2-pro', 'video-generation')).toMatchObject({
      limitations: expect.arrayContaining(['marked Legacy by OpenAI']),
      pricing: { rates: expect.arrayContaining([
        expect.objectContaining({ amount: 0.70, tier: '1080x1920 or 1920x1080' }),
      ]) },
    })
  })

  it('requires exact task identity and supports the open-weight H3 id without route pricing', () => {
    expect(builtinTaskPortrait('minimax', 'MiniMax-H3', 'audio-generation')).toBeUndefined()
    expect(builtinTaskPortrait('another-provider', 'MiniMax-Hailuo-2.3', 'video-generation')).toBeUndefined()

    const portable = builtinTaskPortrait('self-hosted', 'MiniMaxAI/MiniMax-H3', 'video-generation')
    expect(portable).toMatchObject({
      pricing: { rates: [] },
      specialties: expect.arrayContaining(['private deployment']),
    })
    expect(portable?.pricing.notes).toContain('Local infrastructure cost')
  })

  it('keeps explicit documented Hailuo and Speech prices attached to evidence', () => {
    const video = builtinTaskPortrait('minimax', 'MiniMax-Hailuo-2.3-Fast', 'video-generation')
    expect(video?.validation.state).toBe('valid')
    expect(video?.pricing.rates).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'generate', unit: 'video', amount: 0.19, tier: '768P 6s' }),
    ]))
    expect(video?.pricing.rates.every(rate => (
      rate.evidenceId !== undefined && video.evidence.some(item => item.id === rate.evidenceId)
    ))).toBe(true)

    const speech = builtinTaskPortrait('minimax', 'speech-2.8-turbo', 'speech-synthesis')
    expect(speech).toMatchObject({
      pricing: { rates: [expect.objectContaining({ operation: 'synthesize', unit: '1m-characters', amount: 60 })] },
      performance: { speedClass: 'fast' },
      validation: { state: 'valid' },
    })
  })

  it('records current image pricing and the Music API availability boundary', () => {
    expect(builtinTaskPortrait('minimax', 'image-01', 'image-generation')).toMatchObject({
      pricing: { rates: [expect.objectContaining({ unit: 'image', amount: 0.0035 })] },
      validation: { state: 'valid' },
    })
    expect(builtinTaskPortrait('minimax', 'music-3.0', 'audio-generation')).toMatchObject({
      limitations: expect.arrayContaining([
        expect.stringContaining('unavailable to new users'),
      ]),
      pricing: { rates: [expect.objectContaining({ amount: 0.15, tier: 'existing paying users only' })] },
    })
  })
})
