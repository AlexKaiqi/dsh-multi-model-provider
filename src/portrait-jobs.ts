import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { installModelSelection } from '@deepseek-ai/dsh-agent'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolRunContext } from '@deepseek-ai/dsh-tools'
import { isSameOriginHttpRequest } from './probe-route.ts'
import { buildPortraitProbePrompt, buildPortraitResearchPrompt } from './portraits/job-contract.ts'
import { FETCH_PORTRAIT_SOURCE_TOOL, portraitResearchSources, portraitSourceTool } from './portraits/source-fetch.ts'
import { prepareModelPortraits } from './portraits/workflow.ts'
import { modelManagerTools } from './tools.ts'

export const PORTRAIT_JOBS_PATH = '/dsh-multi-model-provider/portrait-jobs'
export const PORTRAIT_JOB_HEADER = 'x-dsh-portrait-job'

type PortraitJobAction = 'research' | 'probe'
type PortraitJobStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface PortraitJobView {
  readonly id: string
  readonly action: PortraitJobAction
  readonly status: PortraitJobStatus
  readonly targetIds: readonly string[]
  readonly workspaceLabel: 'temporary session'
  /** Visible DSH Session created for this collection run once the Agent is mounted. */
  readonly sessionId?: string
  readonly phase: string
  readonly startedAt: string
  readonly finishedAt?: string
  readonly summary?: string
  readonly error?: string
}

type MutablePortraitJob = {
  -readonly [Key in keyof PortraitJobView]: PortraitJobView[Key]
}

interface TemporarySessionReservation {
  readonly reservationId: string
  readonly path: string
}

interface TemporarySessionReservationResult {
  readonly found: boolean
}

interface PortraitTemporarySessions {
  reserve(): Promise<TemporarySessionReservation>
  keep(request: { reservationId: string }): Promise<TemporarySessionReservationResult>
  discard(request: { reservationId: string }): Promise<TemporarySessionReservationResult>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Scratch directories adopted by visible portrait collection Sessions. */
    temporarySessions: PortraitTemporarySessions
  }
}

type PortraitJobScope = Context & {
  readonly agents: Context['agents']
  readonly agentDefaultModel: Context['agentDefaultModel']
  readonly temporarySessions: PortraitTemporarySessions
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

const RESEARCH_TOOL_NAMES = {
  ingest_portrait_research: 'portrait_job_ingest_research',
  upsert_model_portrait: 'portrait_job_upsert_portrait',
  validate_model_portrait: 'portrait_job_validate_portrait',
  get_model_portrait: 'portrait_job_get_portrait',
} as const

export function boundPortraitResearchTools(
  tools: ReturnType<typeof modelManagerTools>,
  targetIds: readonly string[],
) {
  const allowed = new Set(targetIds)
  const source = new Map(tools.map(tool => [tool.name, tool]))
  return Object.entries(RESEARCH_TOOL_NAMES).map(([sourceName, name]) => {
    const tool = source.get(sourceName)
    if (tool === undefined) throw new Error(`portrait research wrapper source '${sourceName}' is unavailable`)
    return {
      ...tool,
      name,
      description: `${tool.description} This job-scoped wrapper accepts only the exact portrait targets selected by Settings.`,
      execute: async (args: Record<string, unknown>, exec: ToolRunContext) => {
        const id = typeof args.id === 'string' ? args.id : ''
        if (!allowed.has(id)) throw new Error(`portrait target '${id}' is outside this research job`)
        const bounded = sourceName === 'validate_model_portrait' ? { ...args, liveProbe: false } : args
        return tool.execute(bounded as never, exec)
      },
    }
  })
}

function portraitResearchTools(ctx: Context, targetIds: readonly string[]) {
  return boundPortraitResearchTools(modelManagerTools(ctx), targetIds)
}

async function waitUntilIdle(
  agent: Awaited<ReturnType<Context['agents']['create']>>['agent'],
  signal: AbortSignal,
  timeoutMs = 30 * 60_000,
): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: (() => void) | undefined
  const interrupted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(new Error('portrait background job was cancelled'))
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('portrait background job timed out')), timeoutMs)
  })
  try {
    await Promise.race([agent.whenIdle(), interrupted, timedOut])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
    if (abort !== undefined) signal.removeEventListener('abort', abort)
  }
}

export class PortraitJobCoordinator {
  private latest: MutablePortraitJob | undefined
  private activeHandle: Awaited<ReturnType<Context['agents']['create']>> | undefined
  private activeRun: Promise<void> | undefined
  private activeAbort: AbortController | undefined
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
      workspaceLabel: 'temporary session',
      phase: selectedIds.length === 0 ? 'nothing to update' : 'creating temporary Session',
      startedAt: now,
      ...(selectedIds.length === 0 ? { status: 'completed', finishedAt: now, summary: 'No enabled portraits currently need research.' } : {}),
    }
    if (selectedIds.length > 0) {
      const controller = new AbortController()
      this.activeAbort = controller
      const run = this.execute(prompt, action, researchSources, controller.signal)
      this.activeRun = run
      void run.finally(() => {
        if (this.activeRun === run) this.activeRun = undefined
        if (this.activeAbort === controller) this.activeAbort = undefined
      })
    }
    return publicJob(this.latest)!
  }

  async dispose(): Promise<void> {
    this.disposed = true
    this.activeAbort?.abort()
    await this.activeHandle?.dispose().catch(() => undefined)
    await this.activeRun?.catch(() => undefined)
    this.activeHandle = undefined
    this.activeRun = undefined
    this.activeAbort = undefined
  }

  private async execute(
    prompt: string,
    action: PortraitJobAction,
    researchSources: readonly string[],
    signal: AbortSignal,
  ): Promise<void> {
    const job = this.latest!
    let reservation: TemporarySessionReservation | undefined
    let sessionCreated = false
    let reservationAdopted = false
    let completionSummary: string | undefined
    let failure: string | undefined
    try {
      reservation = await this.ctx.temporarySessions.reserve()
      if (signal.aborted) throw new Error('portrait background job was cancelled')
      job.status = 'running'
      job.phase = 'temporary Session is starting'
      const selection = this.ctx.agentDefaultModel.currentSelection()
      if (!selection.provider || !selection.model) throw new Error('no default Agent language model is selected')
      const sessionId = SessionId(`session-${randomUUID()}`)
      const handle = await this.ctx.agents.create({
        sessionId,
        meta: { cwd: reservation.path },
        agentOptions: { provider: selection.provider, model: selection.model },
        setup: (agentCtx) => {
          installModelSelection(agentCtx, { current: selection, assembled: undefined })
          if (action === 'research') {
            agentCtx.tools.register(portraitSourceTool(researchSources))
            for (const tool of portraitResearchTools(this.ctx, job.targetIds)) agentCtx.tools.register(tool)
          }
          const requiredTools = action === 'research'
            ? [FETCH_PORTRAIT_SOURCE_TOOL, ...Object.values(RESEARCH_TOOL_NAMES)]
            : ['get_model_portrait', 'validate_model_portrait']
          const visible = new Set(agentCtx.tools.schemas(agentCtx.agent).map(tool => tool.name))
          const missing = requiredTools.filter(name => !visible.has(name))
          if (missing.length > 0) throw new Error(`portrait background Agent is missing required tools: ${missing.join(', ')}`)
          const optionalWebTools = ['web_search', 'web_fetch'].filter(name => visible.has(name))
          agentCtx.tools.restrict({ allow: [...requiredTools, ...optionalWebTools] })
        },
      })
      this.activeHandle = handle
      sessionCreated = true
      job.sessionId = String(sessionId)
      if (signal.aborted) throw new Error('portrait background job was cancelled')
      const adopted = await this.ctx.temporarySessions.keep({ reservationId: reservation.reservationId })
      if (!adopted.found) throw new Error('temporary Session reservation expired before adoption')
      reservationAdopted = true
      job.phase = 'temporary Session Agent is researching and validating'
      await waitUntilIdle(handle.agent, signal)
      const firstSeq = handle.agent.session.seq
      handle.agent.followup(createUserMessage({
        content: [{ type: 'text', text: prompt }],
        source: { kind: 'plugin', plugin: 'multi-model-provider' },
      }))
      await waitUntilIdle(handle.agent, signal)
      const result = outcome(handle.agent.session.events, firstSeq)
      if (!result.completed) throw new Error(result.error)
      completionSummary = result.summary || `Completed ${job.targetIds.length} portrait target(s).`
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error)
    } finally {
      const handle = this.activeHandle
      this.activeHandle = undefined
      await handle?.dispose().catch(() => undefined)
      if (reservation !== undefined && !reservationAdopted) {
        await this.ctx.temporarySessions.discard({ reservationId: reservation.reservationId }).catch(() => undefined)
      }
      if (failure === undefined) {
        job.status = 'completed'
        job.phase = 'results validated and stored in the temporary Session'
        if (completionSummary !== undefined) job.summary = completionSummary
      } else {
        job.status = 'failed'
        job.phase = sessionCreated ? 'temporary Session stopped with an error' : 'temporary Session could not start'
        job.error = failure
      }
      job.finishedAt = new Date().toISOString()
    }
  }
}

export function registerPortraitJobRoutes(ctx: Context): void {
  ctx.inject(['agents', 'agentDefaultModel', 'webServer', 'temporarySessions'], (scope) => {
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
            if (body.action !== 'research') {
              throw new PortraitJobError(400, 'Settings portrait jobs only run research; live probes require separate explicit Agent approval')
            }
            const job = await coordinator.start('research', targetIds(body.ids), false)
            sendJson(res, 202, { ok: true, job })
          } catch (error) {
            const status = error instanceof PortraitJobError ? error.status : 500
            sendJson(res, status, { ok: false, error: error instanceof Error ? error.message : String(error) })
          }
        },
      })
      return async () => {
        unregister()
        await coordinator.dispose()
      }
    }, 'multi-model-provider: portrait background jobs')
  })
}
