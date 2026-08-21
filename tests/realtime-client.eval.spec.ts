import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Realtime provider client integration', () => {
  it('routes the Doubao live probe through dsh-realtime-voice instead of the retired talk-to-text plugin', () => {
    const client = readFileSync(new URL('../src/client/index.jsx', import.meta.url), 'utf8')
    const messages = readFileSync(new URL('../src/client/i18n.js', import.meta.url), 'utf8')
    expect(client).toContain("fetch('/dsh-realtime-voice/doubao/probe'")
    expect(client).not.toContain('/dsh-talk-to-text/')
    expect(messages).not.toContain('dsh-talk-to-text')
  })
})
