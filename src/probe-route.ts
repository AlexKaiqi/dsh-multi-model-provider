import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { createUserMessage } from '@deepseek-ai/dsh-llm'

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

/** Mount the explicit, minimally billed per-model availability/latency probe. */
export function registerModelProbeRoute(ctx: Context): void {
  const host = ctx as unknown as {
    inject(names: readonly string[], callback: (scope: ProbeScope) => void): void
  }
  host.inject(['webServer'], (scope) => {
    scope.webServer.register({
      kind: 'exact',
      path: '/dsh-multi-model-provider/probe',
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { allow: 'POST' })
          res.end()
          return
        }
        if (req.headers['x-dsh-model-probe'] !== '1') {
          sendJson(res, 403, { ok: false, error: 'missing model probe request marker' })
          return
        }
        try {
          const body = await readJson(req)
          const provider = routeId(body.provider, 'provider')
          const model = routeId(body.model, 'model')
          await scope.llm.resolveModelInfo(provider, model)
          const started = performance.now()
          let firstTokenAt: number | undefined
          let finish: string | undefined
          const signal = AbortSignal.timeout(20_000)
          for await (const chunk of scope.llm.stream({
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
          sendJson(res, 200, {
            ok: true,
            provider,
            model,
            observedAt: new Date().toISOString(),
            latencyMs: Math.round(ended - started),
            ...(firstTokenAt === undefined ? {} : { timeToFirstTokenMs: Math.round(firstTokenAt - started) }),
          })
        } catch (error) {
          sendJson(res, 502, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
    })
  })
}
