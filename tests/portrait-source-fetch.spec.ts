import { describe, expect, it } from 'vitest'
import { portraitResearchSources, portraitSourceText } from '../src/portraits/source-fetch.ts'

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
})
