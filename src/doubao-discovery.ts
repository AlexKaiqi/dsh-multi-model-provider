import { randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import type { LlmDiscoveredModel, LlmModelDiscoveryRequest } from '@deepseek-ai/dsh-llm'
import { DOUBAO_REALTIME_VOICES } from './doubao-speech-catalog.ts'

export const DOUBAO_REALTIME_ENDPOINT = 'wss://openspeech.bytedance.com/api/v3/duplex/realtime/dialogue'
export const DOUBAO_REALTIME_MODEL = '1.2.6.1'

type ProbeOptions = {
  readonly endpoint?: string
  readonly apiKey?: string
  readonly signal?: AbortSignal
  readonly timeoutMs?: number
  readonly trustedOrigins?: ReadonlySet<string>
}

/**
 * Authenticate the draft API key against the actual Realtime Duplex service.
 * The service has no ListModels endpoint, so discovery must not pretend the
 * bundled voice directory came from the network. A successful minimal session
 * proves the key, endpoint, fixed protocol model, and one documented voice work
 * together before the UI offers the documented voice choices.
 */
export function probeDoubaoRealtimeKey(options: ProbeOptions): Promise<void> {
  const apiKey = String(options.apiKey ?? '').trim()
  if (apiKey === '') throw new Error('请输入豆包 Realtime API Key 后再加载音色。')

  const endpoint = new URL(String(options.endpoint ?? DOUBAO_REALTIME_ENDPOINT))
  const trustedOrigins = options.trustedOrigins ?? new Set(['wss://openspeech.bytedance.com'])
  if (!['wss:', 'ws:'].includes(endpoint.protocol) || !trustedOrigins.has(endpoint.origin)) {
    throw new Error(`豆包 Realtime 端点不受信任：${endpoint.origin}`)
  }
  if (options.signal?.aborted) throw options.signal.reason ?? new Error('豆包 Realtime 鉴权已取消。')

  return new Promise((resolve, reject) => {
    const socket = new WebSocket(endpoint, {
      headers: { 'X-Api-Key': apiKey },
      handshakeTimeout: options.timeoutMs ?? 15_000,
      maxPayload: 512 * 1024,
    })
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      options.signal?.removeEventListener('abort', abort)
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close()
      if (error) reject(error)
      else resolve()
    }
    const abort = () => finish(options.signal?.reason instanceof Error ? options.signal.reason : new Error('豆包 Realtime 鉴权已取消。'))
    const timer = setTimeout(() => finish(new Error('豆包 Realtime 鉴权超时。')), options.timeoutMs ?? 15_000)
    options.signal?.addEventListener('abort', abort, { once: true })

    socket.on('open', () => socket.send(JSON.stringify({
      type: 'session.create',
      event_id: randomUUID(),
      session: {
        type: 'realtime',
        id: randomUUID(),
        model: DOUBAO_REALTIME_MODEL,
        instructions: 'Connection test. Do not produce a response.',
        audio: {
          input: { format: { type: 'pcm', rate: 16_000 } },
          output: { format: { type: 'pcm_s16le', rate: 24_000 }, voice: DOUBAO_REALTIME_VOICES[0]!.voice },
        },
        tools: [],
      },
    })))
    socket.on('message', (data, binary) => {
      if (binary) return finish(new Error('豆包 Realtime 鉴权收到意外的二进制响应。'))
      try {
        const event = JSON.parse(data.toString()) as { type?: string, error?: { message?: string } }
        if (event.type === 'session.created') finish()
        else if (event.type === 'error') finish(new Error(event.error?.message ?? '豆包 Realtime 拒绝了鉴权。'))
      } catch (error) {
        finish(error instanceof Error ? error : new Error(String(error)))
      }
    })
    socket.on('unexpected-response', (_request, response) => finish(new Error(`豆包 Realtime 鉴权失败：HTTP ${String(response.statusCode ?? 'unknown')}`)))
    socket.on('error', error => finish(new Error(`豆包 Realtime 连接失败：${error.message}`)))
    socket.on('close', (code, reason) => {
      if (!settled) finish(new Error(`豆包 Realtime 在鉴权完成前关闭：${reason.toString() || `code ${code}`}`))
    })
  })
}

/** Validate the draft key live, then return the documented voice directory. */
export async function discoverDoubaoRealtimeVoices(request: LlmModelDiscoveryRequest): Promise<LlmDiscoveredModel[]> {
  await probeDoubaoRealtimeKey({
    ...(request.baseURL === undefined ? {} : { endpoint: request.baseURL }),
    ...(request.apiKey === undefined ? {} : { apiKey: request.apiKey }),
    ...(request.signal === undefined ? {} : { signal: request.signal }),
  })
  return DOUBAO_REALTIME_VOICES.map(entry => ({
    id: entry.voice,
    name: `${entry.variant === 's2s-o' ? 'S2S-O' : 'SC 2.0'} · ${entry.name}`,
  }))
}
