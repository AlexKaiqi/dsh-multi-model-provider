import { createServer } from 'node:http'
import { afterEach, describe, expect, it } from 'vitest'
import { WebSocketServer } from 'ws'
import { DOUBAO_REALTIME_MODEL, probeDoubaoRealtimeKey } from '../src/doubao-discovery.ts'

describe('Doubao Realtime draft-key discovery', () => {
  const closers: Array<() => Promise<void>> = []
  afterEach(async () => {
    await Promise.all(closers.splice(0).map(close => close()))
  })

  it('requires the draft API key instead of returning a static catalog anonymously', () => {
    expect(() => probeDoubaoRealtimeKey({ apiKey: '' })).toThrow(/API Key/)
  })

  it('authenticates the key through a minimal Realtime session before discovery', async () => {
    const server = createServer()
    const sockets = new WebSocketServer({ server })
    let seenKey = ''
    let seenModel = ''
    sockets.on('connection', (socket, request) => {
      seenKey = String(request.headers['x-api-key'] ?? '')
      socket.once('message', data => {
        const request = JSON.parse(data.toString()) as { session?: { model?: string } }
        seenModel = String(request.session?.model ?? '')
        socket.send(JSON.stringify({ type: 'session.created', session: { id: 'test' } }))
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (typeof address !== 'object' || address === null) throw new Error('test server did not bind')
    const origin = `ws://127.0.0.1:${address.port}`
    closers.push(() => new Promise<void>(resolve => sockets.close(() => server.close(() => resolve()))))

    await probeDoubaoRealtimeKey({
      endpoint: `${origin}/api/v3/duplex/realtime/dialogue`,
      apiKey: 'draft-key',
      trustedOrigins: new Set([origin]),
    })

    expect(seenKey).toBe('draft-key')
    expect(seenModel).toBe(DOUBAO_REALTIME_MODEL)
  })
})
