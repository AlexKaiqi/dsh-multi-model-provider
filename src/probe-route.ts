import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

/** HTTP path for the paid Settings availability probe. */
export const MODEL_PROBE_PATH = '/dsh-multi-model-provider/probe'

/** Header the Settings UI must send so casual GET/form traffic cannot bill. */
export const MODEL_PROBE_HEADER = 'x-dsh-model-probe'

interface ProbeScope {
  readonly llm: Context['llm']
  readonly webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler(req: IncomingMessage, res: ServerResponse): Promise<void>
    }): unknown
  }
}

export type ProbeHttpRequest = {
  readonly method?: string | undefined
  readonly headers: IncomingMessage['headers']
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value))
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += bytes.length
    if (size > 16 * 1024) throw new Error('request body is too large')
    chunks.push(bytes)
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('request must be an object')
  return parsed as Record<string, unknown>
}

function routeId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:/-]{1,180}$/.test(value)) throw new Error(`${name} is invalid`)
  return value
}

/**
 * Decide whether a browser request is same-origin with the Host header.
 *
 * Args:
 *   req: Incoming HTTP request, or a headers-only stand-in used by tests.
 *
 * Returns:
 *   True when Origin uses http(s) and its host matches the Host header.
 */
export function isSameOriginHttpRequest(req: ProbeHttpRequest): boolean {
  const origin = String(req.headers.origin ?? '')
  const host = String(req.headers.host ?? '')
  if (!origin || !host) return false
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    return false
  }
}

/**
 * Refuse a paid LLM probe unless it looks like the local Settings UI.
 *
 * A static marker header is not enough: any client that can set it could
 * stream against the user's configured models. Same-origin Origin matching,
 * plus Sec-Fetch-Site when the browser sends it, keeps the bill on this page.
 *
 * Args:
 *   req: Incoming HTTP request, or a headers-only stand-in used by tests.
 *
 * Returns:
 *   `{ ok: true }` when the probe may run, otherwise a 403 payload to send.
 */
export function authorizePaidModelProbe(req: ProbeHttpRequest):
  | { ok: true }
  | { ok: false, status: 403, error: string } {
  if (req.headers[MODEL_PROBE_HEADER] !== '1') {
    return { ok: false, status: 403, error: 'missing model probe request marker' }
  }
  const fetchSite = req.headers['sec-fetch-site']
  if (typeof fetchSite === 'string' && fetchSite !== 'same-origin') {
    return { ok: false, status: 403, error: 'model probe must be same-origin' }
  }
  if (!isSameOriginHttpRequest(req)) {
    return { ok: false, status: 403, error: 'model probe must be a same-origin Settings request' }
  }
  return { ok: true }
}

/**
 * Stream one eight-token ping so Settings can record reachability and latency.
 *
 * Args:
 *   llm: Host language-model runtime used for the billed ping.
 *   provider: llm-pi-ai provider route id.
 *   model: Exact model id on that route.
 *
 * Returns:
 *   Reachability payload with latency; throws when the model stream fails.
 */
export async function runPaidModelProbe(
  llm: Context['llm'],
  provider: string,
  model: string,
): Promise<{
  ok: true
  provider: string
  model: string
  observedAt: string
  latencyMs: number
  timeToFirstTokenMs?: number
}> {
  await llm.resolveModelInfo(provider, model)
  const started = performance.now()
  let firstTokenAt: number | undefined
  let finish: string | undefined
  const signal = AbortSignal.timeout(20_000)
  for await (const chunk of llm.stream({
    provider,
    model,
    messages: [createUserMessage({
      content: [{ type: 'text', text: 'Reply with OK.' }],
      source: { kind: 'plugin', plugin: 'multi-model-provider' },
    })],
    maxTokens: 8,
    signal,
  })) {
    if (firstTokenAt === undefined && (chunk.type === 'text-delta' || chunk.type === 'reasoning-delta')) {
      firstTokenAt = performance.now()
    }
    if (chunk.type === 'finish') finish = chunk.reason.kind
  }
  const ended = performance.now()
  if (finish === 'error' || finish === 'aborted') throw new Error(`model probe ended with ${finish}`)
  return {
    ok: true,
    provider,
    model,
    observedAt: new Date().toISOString(),
    latencyMs: Math.round(ended - started),
    ...(firstTokenAt === undefined ? {} : { timeToFirstTokenMs: Math.round(firstTokenAt - started) }),
  }
}

/** Mount the explicit, minimally billed per-model availability/latency probe. */
export function registerModelProbeRoute(ctx: Context): void {
  const host = ctx as unknown as {
    inject(names: readonly string[], callback: (scope: ProbeScope) => void): void
  }
  host.inject(['webServer'], (scope) => {
    scope.webServer.register({
      kind: 'exact',
      path: MODEL_PROBE_PATH,
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { allow: 'POST' })
          res.end()
          return
        }
        const auth = authorizePaidModelProbe(req)
        if (!auth.ok) {
          sendJson(res, auth.status, { ok: false, error: auth.error })
          return
        }
        try {
          const body = await readJson(req)
          const provider = routeId(body.provider, 'provider')
          const model = routeId(body.model, 'model')
          sendJson(res, 200, await runPaidModelProbe(scope.llm, provider, model))
        } catch (error) {
          sendJson(res, 502, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
  })
}
