import type { JsonValue } from '@deepseek-ai/dsh-tools'

const MAX_SOURCE_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_CHARS = 80_000
const FETCH_TIMEOUT_MS = 20_000
const MAX_REDIRECTS = 5

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
  if (contentType.includes('json')) {
    const extracted = jsonDocumentText(body)
    if (extracted !== undefined) return extracted.slice(0, MAX_SOURCE_CHARS)
  }
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

function jsonDocumentText(body: string): string | undefined {
  try {
    const value = JSON.parse(body) as unknown
    const record = value !== null && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined
    const result = record?.Result
    const resultRecord = result !== null && typeof result === 'object' && !Array.isArray(result)
      ? result as Record<string, unknown>
      : undefined
    const content = resultRecord?.Content ?? record?.content
    const title = typeof resultRecord?.Title === 'string' ? resultRecord.Title : undefined
    if (typeof content === 'string') {
      const nested = nestedEditorText(content)
      const text = nested ?? portraitSourceText(content, content.includes('<') ? 'text/html' : 'text/plain')
      return [title, text].filter(Boolean).join('\n\n')
    }
    return nestedEditorText(value)
  } catch {
    return undefined
  }
}

function nestedEditorText(value: unknown): string | undefined {
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      return undefined
    }
  }
  const inserts: string[] = []
  const visit = (current: unknown): void => {
    if (Array.isArray(current)) {
      for (const item of current) visit(item)
      return
    }
    if (current === null || typeof current !== 'object') return
    for (const [key, nested] of Object.entries(current)) {
      if (key === 'insert' && typeof nested === 'string') inserts.push(nested)
      else visit(nested)
    }
  }
  visit(parsed)
  if (inserts.length === 0) return undefined
  return inserts.join('').replace(/\n{3,}/g, '\n\n').trim()
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

export async function fetchPortraitSource(url: string, allowedSources: ReadonlySet<string>, signal?: AbortSignal): Promise<JsonValue> {
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
  const response = await fetchApprovedSource(normalized, combinedSignal)
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

async function fetchApprovedSource(approvedUrl: string, signal: AbortSignal): Promise<Response> {
  let current = approvedUrl
  const approvedSite = siteBoundary(new URL(approvedUrl).hostname)
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await fetch(current, {
      headers: {
        accept: 'text/html, text/plain, application/json;q=0.9',
        'accept-language': 'en',
        'user-agent': 'dsh-model-portrait/1.0',
      },
      redirect: 'manual',
      signal,
    })
    if (response.status < 300 || response.status >= 400) return response
    if (redirect === MAX_REDIRECTS) throw new Error(`portrait source exceeded ${MAX_REDIRECTS} redirects`)
    const location = response.headers.get('location')
    if (location === null) throw new Error('portrait source redirect has no location')
    const next = new URL(location, current)
    if ((next.protocol !== 'https:' && next.protocol !== 'http:') || siteBoundary(next.hostname) !== approvedSite) {
      throw new Error('portrait source redirected outside its approved first-party site')
    }
    current = next.href
  }
  throw new Error('portrait source redirect resolution failed')
}

function siteBoundary(hostname: string): string {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return normalized
  const labels = normalized.split('.')
  return labels.length <= 2 ? normalized : labels.slice(-2).join('.')
}
