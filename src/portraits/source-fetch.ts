import { defineTool, type JsonValue } from '@deepseek-ai/dsh-tools'

export const FETCH_PORTRAIT_SOURCE_TOOL = 'fetch_portrait_source'

const MAX_SOURCE_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_CHARS = 80_000
const FETCH_TIMEOUT_MS = 20_000

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"',
  }
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith('#x')) return String.fromCodePoint(Number.parseInt(body.slice(2), 16))
    if (body.startsWith('#')) return String.fromCodePoint(Number.parseInt(body.slice(1), 10))
    return named[body.toLowerCase()] ?? entity
  })
}

/** Convert provider documentation HTML to compact text without executing page code. */
export function portraitSourceText(body: string, contentType: string): string {
  if (!contentType.includes('html')) return body.slice(0, MAX_SOURCE_CHARS)
  return decodeEntities(body
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|h[1-6]|tr|section|article|main|nav)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_SOURCE_CHARS)
}

/** Collect the exact plugin-approved documentation entry points from a research manifest. */
export function portraitResearchSources(value: unknown): readonly string[] {
  const found = new Set<string>()
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      for (const item of current) visit(item)
      return
    }
    if (typeof current !== 'object' || current === null) return
    for (const [key, nested] of Object.entries(current)) {
      if (key === 'suggestedSources' && Array.isArray(nested)) {
        for (const source of nested) {
          if (typeof source !== 'string') continue
          try {
            const url = new URL(source)
            if (url.protocol === 'https:' || url.protocol === 'http:') found.add(url.href)
          } catch {
            // Invalid plugin source entries are ignored and cannot reach the private fetch tool.
          }
        }
      } else {
        visit(nested)
      }
    }
  }
  visit(value)
  return [...found]
}

async function boundedSourceBytes(response: Response): Promise<Uint8Array> {
  const reader = response.body?.getReader()
  if (reader === undefined) return new Uint8Array()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_SOURCE_BYTES) throw new Error(`portrait source exceeds ${MAX_SOURCE_BYTES} bytes`)
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const joined = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    joined.set(chunk, offset)
    offset += chunk.byteLength
  }
  return joined
}

async function fetchPortraitSource(url: string, allowedSources: ReadonlySet<string>, signal?: AbortSignal): Promise<JsonValue> {
  let normalized: string
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('unsupported protocol')
    normalized = parsed.href
  } catch {
    throw new Error('portrait source must be a valid http(s) URL')
  }
  if (!allowedSources.has(normalized)) {
    throw new Error('portrait source is not one of the plugin-approved documentation entry points')
  }

  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS)
  const combinedSignal = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  const response = await fetch(normalized, {
    headers: {
      accept: 'text/html, text/plain, application/json;q=0.9',
      'user-agent': 'dsh-model-portrait/1.0',
    },
    redirect: 'manual',
    signal: combinedSignal,
  })
  if (response.status >= 300 && response.status < 400) {
    throw new Error('portrait source redirects are not followed; add the final reviewed URL to the research plan')
  }
  if (!response.ok) throw new Error(`portrait source returned HTTP ${response.status}`)
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? 'application/octet-stream'
  if (!/(?:text\/|application\/(?:json|ld\+json|xhtml\+xml))/.test(contentType)) {
    throw new Error(`portrait source returned unsupported content type: ${contentType}`)
  }
  const bytes = await boundedSourceBytes(response)
  const raw = new TextDecoder().decode(bytes)
  const content = portraitSourceText(raw, contentType)
  return {
    requestedUrl: normalized,
    url: response.url || normalized,
    observedAt: new Date().toISOString(),
    contentType,
    truncated: content.length >= MAX_SOURCE_CHARS,
    content,
  }
}

/** Build the private, per-job source reader exposed only inside the anonymous Agent. */
export function portraitSourceTool(allowedSources: readonly string[]) {
  const allowlist = new Set(allowedSources)
  return defineTool({
    name: FETCH_PORTRAIT_SOURCE_TOOL,
    description: 'Fetch one exact first-party documentation URL approved by the model-portrait plugin. Use only URLs from researchPlan.suggestedSources; the result includes the final URL and observation time for evidence.',
    parameters: {
      url: { type: 'string', required: true, description: 'Exact URL copied from researchPlan.suggestedSources.' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: JsonValue) => [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
    },
    execute: async (args, exec) => fetchPortraitSource(args.url, allowlist, exec.signal),
  })
}
