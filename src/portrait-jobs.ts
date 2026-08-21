import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { isSameOriginHttpRequest } from './probe-route.ts'
import { buildPortraitProbePrompt, buildPortraitResearchPrompt } from './portraits/job-contract.ts'
import { FETCH_PORTRAIT_SOURCE_TOOL, portraitResearchSources, portraitSourceTool } from './portraits/source-fetch.ts'
import { prepareModelPortraits } from './portraits/workflow.ts'

export const PORTRAIT_JOBS_PATH = '/dsh-multi-model-provider/portrait-jobs'
export const PORTRAIT_JOB_HEADER = 'x-dsh-portrait-job'

type PortraitJobAction = 'research' | 'probe'
type PortraitJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface PortraitJobView {
  readonly id: string
  readonly action: PortraitJobAction
  readonly status: PortraitJobStatus
  readonly targetIds: readonly string[]
  readonly workspaceLabel: 'anonymous temporary workspace'
  readonly phase: string
  readonly startedAt: string
  readonly finishedAt?: string
  readonly summary?: string
  readonly error?: string
}

type MutablePortraitJob = {
  -readonly [Key in keyof PortraitJobView]: PortraitJobView[Key]
}

type PortraitJobScope = Context & {
  readonly agents: Context['agents']
  readonly agentDefaultModel: Context['agentDefaultModel']
  readonly webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler(req: IncomingMessage, res: ServerResponse): Promise<void>
    }): () => void
  }
}

class PortraitJobError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
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
    if (size > 16 * 1024) throw new PortraitJobError(413, 'request body is too large')
    chunks.push(bytes)
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new PortraitJobError(400, 'request must be an object')
  return parsed as Record<string, unknown>
}

function targetIds(value: unknown): readonly string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new PortraitJobError(400, 'ids must be a non-empty array with at most 100 targets')
  const ids = value.map((item) => {
    if (typeof item !== 'string' || !/^[A-Za-z0-9._:/-]{1,240}$/.test(item)) throw new PortraitJobError(400, 'portrait target id is invalid')
    return item
  })
  return [...new Set(ids)]
}

function outcome(events: readonly SessionEvent[], firstSeq: number): { summary: string, completed: boolean, error?: string } {
  let summary = ''
  let reason: Record<string, unknown> | undefined
  for (const event of events) {
    if (event.seq < firstSeq) continue
    if (event.type === 'assistant/message') {
      const text = event.data.message.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim()
      if (text) summary = text.slice(0, 4_000)
    }
    if (event.type === 'turn/end') reason = event.data.reason as unknown as Record<string, unknown>
  }
  const completed = reason?.kind === 'completed'
  const error = completed ? undefined : typeof (reason?.error as { message?: unknown } | undefined)?.message === 'string'
    ? String((reason!.error as { message: string }).message)
    : `background Agent stopped with '${String(reason?.kind ?? 'unknown')}'`
  return { summary, completed, ...(error === undefined ? {} : { error }) }
}

function publicJob(job: MutablePortraitJob | undefined): PortraitJobView | undefined {
  return job === undefined ? undefined : { ...job, targetIds: [...job.targetIds] }
}

export class PortraitJobCoordinator {
  private latest: MutablePortraitJob | undefined
  private activeHandle: Awaited<ReturnType<Context['agents']['create']>> | undefined
  private starting = false
  private disposed = false

  constructor(private readonly ctx: PortraitJobScope) {}

  snapshot(): PortraitJobView | undefined {
    return publicJob(this.latest)
  }

  async start(action: PortraitJobAction, ids: readonly string[] | undefined, approved: boolean): Promise<PortraitJobView> {
    if (this.disposed) throw new PortraitJobError(503, 'portrait job runner is unavailable')
    if (this.starting || (this.latest !== undefined && (this.latest.status === 'queued' || this.latest.status === 'running'))) {
      throw new PortraitJobError(409, 'a portrait background job is already running')
    }
    if (action === 'probe' && (!approved || ids === undefined)) {
      throw new PortraitJobError(400, 'live probes require explicit approval and exact target ids')
    }

    this.starting = true
    let prompt: string
    let selectedIds: readonly string[]
    let researchSources: readonly string[] = []
    try {
      if (action === 'research') {
        const prepared = await prepareModelPortraits(this.ctx, { ...(ids === undefined ? {} : { ids }), includeDisabled: false })
        const candidates = Array.isArray(prepared.candidates) ? prepared.candidates : []
        selectedIds = candidates.flatMap(candidate => typeof candidate === 'object' && candidate !== null && typeof (candidate as { id?: unknown }).id === 'string' ? [(candidate as { id: string }).id] : [])
        const manifest = {
          candidates,
          ontology: prepared.ontology,
          workflow: prepared.workflow,
          warnings: prepared.warnings,
        }
        researchSources = portraitResearchSources(manifest)
        prompt = buildPortraitResearchPrompt(manifest)
      } else {
        selectedIds = ids!
        prompt = buildPortraitProbePrompt(selectedIds, new Date().toISOString())
      }
    } finally {
      this.starting = false
    }

    const now = new Date().toISOString()
    this.latest = {
      id: `portrait-job-${randomUUID()}`,
      action,
      status: 'queued',
      targetIds: [...selectedIds],
      workspaceLabel: 'anonymous temporary workspace',
      phase: selectedIds.length === 0 ? 'nothing to update' : 'creating anonymous Agent workspace',
      startedAt: now,
      ...(selectedIds.length === 0 ? { status: 'completed', finishedAt: now, summary: 'No enabled portraits currently need research.' } : {}),
    }
    if (selectedIds.length > 0) void this.execute(prompt, action, researchSources)
    return publicJob(this.latest)!
  }

  async dispose(): Promise<void> {
    this.disposed = true
    await this.activeHandle?.dispose()
    this.activeHandle = undefined
  }

  private async execute(prompt: string, action: PortraitJobAction, researchSources: readonly string[]): Promise<void> {
    const job = this.latest!
    let workspace: string | undefined
    let completionSummary: string | undefined
    let failure: string | undefined
    try {
      workspace = await mkdtemp(join(tmpdir(), 'dsh-model-portrait-'))
      job.status = 'running'
      job.phase = 'background Agent is researching and validating'
      const selection = this.ctx.agentDefaultModel.currentSelection()
      if (!selection.provider || !selection.model) throw new Error('no default Agent language model is selected')
      const handle = await this.ctx.agents.create({
        sessionId: SessionId(`session-${randomUUID()}`),
        meta: { cwd: workspace },
        agentOptions: { provider: selection.provider, model: selection.model },
        setup: (agentCtx) => {
          installModelSelection(agentCtx, { current: selection, assembled: undefined })
          if (action === 'research') agentCtx.tools.register(portraitSourceTool(researchSources))
          const requiredTools = action === 'research'
            ? [FETCH_PORTRAIT_SOURCE_TOOL, 'ingest_portrait_research', 'upsert_model_portrait', 'validate_model_portrait', 'get_model_portrait']
            : ['get_model_portrait', 'validate_model_portrait']
          const visible = new Set(agentCtx.tools.schemas(agentCtx.agent).map(tool => tool.name))
          const missing = requiredTools.filter(name => !visible.has(name))
          if (missing.length > 0) throw new Error(`portrait background Agent is missing required tools: ${missing.join(', ')}`)
          const optionalWebTools = ['web_search', 'web_fetch'].filter(name => visible.has(name))
          // restrictions name global tools only; the scoped source reader remains visible by design
          agentCtx.tools.restrict({ allow: [...requiredTools.filter(name => name !== FETCH_PORTRAIT_SOURCE_TOOL), ...optionalWebTools] })
        },
      })
      this.activeHandle = handle
      await handle.agent.whenIdle()
      const firstSeq = handle.agent.session.seq
      handle.agent.followup(createUserMessage({
        content: [{ type: 'text', text: prompt }],
        source: { kind: 'plugin', plugin: 'multi-model-provider' },
      }))
      await handle.agent.whenIdle()
      const result = outcome(handle.agent.session.events, firstSeq)
      if (!result.completed) throw new Error(result.error)
      completionSummary = result.summary || `Completed ${job.targetIds.length} portrait target(s).`
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    } finally {
      const handle = this.activeHandle
      this.activeHandle = undefined
      await handle?.dispose().catch(() => undefined)
      if (workspace !== undefined) await rm(workspace, { recursive: true, force: true }).catch(() => undefined)
      if (failure === undefined) {
        job.status = 'completed'
        job.phase = 'results validated and stored; anonymous workspace removed'
        if (completionSummary !== undefined) job.summary = completionSummary
      } else {
        job.status = 'failed'
        job.phase = 'background job failed; anonymous workspace removed'
        job.error = failure
      }
      job.finishedAt = new Date().toISOString()
    }
  }
}

export function registerPortraitJobRoutes(ctx: Context): void {
  ctx.inject(['agents', 'agentDefaultModel', 'webServer'], (scope) => {
    const jobScope = scope as PortraitJobScope
    const coordinator = new PortraitJobCoordinator(jobScope)
    jobScope.effect(() => {
      const unregister = jobScope.webServer.register({
        kind: 'exact',
        path: PORTRAIT_JOBS_PATH,
        handler: async (req, res) => {
          if (req.method === 'GET') {
            sendJson(res, 200, { ok: true, job: coordinator.snapshot() })
            return
          }
          if (req.method !== 'POST') {
            res.writeHead(405, { allow: 'GET, POST' })
            res.end()
            return
          }
          if (req.headers[PORTRAIT_JOB_HEADER] !== '1' || !isSameOriginHttpRequest(req)) {
            sendJson(res, 403, { ok: false, error: 'portrait jobs require a same-origin Settings request' })
            return
          }
          try {
            const body = await readJson(req)
            if (body.action !== 'research' && body.action !== 'probe') throw new PortraitJobError(400, 'action must be research or probe')
            const job = await coordinator.start(body.action, targetIds(body.ids), body.approved === true)
            sendJson(res, 202, { ok: true, job })
          } catch (error) {
            const status = error instanceof PortraitJobError ? error.status : 500
            sendJson(res, status, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
        },
      })
      return () => {
        unregister()
        void coordinator.dispose()
      }
    }, 'multi-model-provider: portrait background jobs')
  })
}
