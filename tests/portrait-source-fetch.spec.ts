import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPortraitSource, portraitResearchSources, portraitSourceText } from '../src/portraits/source-fetch.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('private portrait source reader', () => {
  it('collects and normalizes only suggested http(s) sources', () => {
    expect(portraitResearchSources({
      candidates: [{ researchPlan: { suggestedSources: ['https://example.com/docs', 'file:///tmp/private'] } }],
    })).toEqual(['https://example.com/docs'])
  })

  it('turns documentation HTML into compact text without page scripts', () => {
    expect(portraitSourceText('<main><h1>Model &amp; price</h1><script>steal()</script><p>$2 / 1M tokens</p></main>', 'text/html'))
      .toBe('Model & price\n$2 / 1M tokens')
  })

  it('extracts document-center editor text from a JSON envelope', () => {
    const body = JSON.stringify({
      Result: {
        Title: '模型列表',
        Content: JSON.stringify({ data: { 0: { ops: [{ insert: '模型 A\n' }, { insert: '价格 1 元\n' }] } } }),
      },
    })
    expect(portraitSourceText(body, 'application/json')).toBe('模型列表\n\n模型 A\n价格 1 元')
  })

  it('follows a reviewed redirect within the same first-party site', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', {
        status: 301,
        headers: { location: 'https://developers.openai.com/api/docs/models/all' },
      }))
      .mockResolvedValueOnce(new Response('<main><h1>Models</h1></main>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPortraitSource(
      'https://platform.openai.com/docs/models',
      new Set(['https://platform.openai.com/docs/models']),
    ) as Record<string, unknown>

    expect(result.content).toBe('Models')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects a redirect outside the approved first-party site', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {
      status: 302,
      headers: { location: 'http://127.0.0.1/private' },
    })))

    await expect(fetchPortraitSource(
      'https://platform.openai.com/docs/models',
      new Set(['https://platform.openai.com/docs/models']),
    )).rejects.toThrow('outside its approved first-party site')
  })
})
