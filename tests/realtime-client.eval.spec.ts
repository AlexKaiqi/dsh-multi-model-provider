import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Realtime provider client integration', () => {
  it('validates a draft Doubao key through the Realtime WebSocket instead of the retired talk-to-text plugin', () => {
    const client = readFileSync(new URL('../src/client/index.jsx', import.meta.url), 'utf8')
    const discovery = readFileSync(new URL('../src/doubao-discovery.ts', import.meta.url), 'utf8')
    const messages = readFileSync(new URL('../src/client/i18n.js', import.meta.url), 'utf8')
    expect(discovery).toContain("headers: { 'X-Api-Key': apiKey }")
    expect(discovery).toContain("type: 'session.create'")
    expect(discovery).toContain("model: DOUBAO_REALTIME_MODEL")
    expect(client).not.toContain('/dsh-talk-to-text/')
    expect(discovery).not.toContain('/dsh-talk-to-text/')
    expect(messages).not.toContain('dsh-talk-to-text')
  })
})
