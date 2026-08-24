import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { boundPortraitResearchTools, PORTRAIT_JOB_HEADER, PORTRAIT_JOBS_PATH, PortraitJobCoordinator } from '../src/portrait-jobs.ts'
import { buildPortraitProbePrompt, buildPortraitResearchPrompt, PORTRAIT_JOB_CONTRACT } from '../src/portraits/job-contract.ts'
import { TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'

async function waitForJob(coordinator: PortraitJobCoordinator) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = coordinator.snapshot()
    if (job?.status === 'completed' || job?.status === 'failed') return job
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  throw new Error('portrait job did not finish')
}

describe('portrait background jobs', () => {
  it('keeps the browser-to-Host job protocol versioned and aligned with the route', async () => {
    const contract = JSON.parse(await readFile(new URL('../spec/portrait-jobs.http.json', import.meta.url), 'utf8')) as {
      version: string
      transport: { path: string }
      authorization: { postRequiredHeaders: Record<string, string> }
    }
    expect(contract.version).toBe('1.2.0')
    expect(contract.transport.path).toBe(PORTRAIT_JOBS_PATH)
    expect(contract.authorization.postRequiredHeaders[PORTRAIT_JOB_HEADER]).toBe('1')
  })

  it('binds research mutation tools to exact targets and forces liveProbe=false', async () => {
    const calls: Array<{ name: string, args: Record<string, unknown> }> = []
    const sourceNames = ['ingest_portrait_research', 'upsert_model_portrait', 'validate_model_portrait', 'get_model_portrait']
    const tools = sourceNames.map(name => ({
      name,
      description: name,
      execute: vi.fn(async (args: Record<string, unknown>) => {
        calls.push({ name, args })
        return {}
      }),
    }))
    const bounded = boundPortraitResearchTools(tools as never, ['demo/image'])
    const validate = bounded.find(tool => tool.name === 'portrait_job_validate_portrait')!
    const exec = { signal: new AbortController().signal } as never
    await validate.execute({ id: 'demo/image', liveProbe: true }, exec)
    expect(calls).toContainEqual({ name: 'validate_model_portrait', args: { id: 'demo/image', liveProbe: false } })

    const upsert = bounded.find(tool => tool.name === 'portrait_job_upsert_portrait')!
    await expect(upsert.execute({ id: 'other/image', portrait: {} }, exec))
      .rejects.toThrow("portrait target 'other/image' is outside this research job")
  })

  it('keeps the plugin-owned research contract separate from Agent execution', () => {
    expect(PORTRAIT_JOB_CONTRACT.ownership.plugin).toContain('portrait schema and persistence tools')
    expect(PORTRAIT_JOB_CONTRACT.acceptance).toContain('research never writes performance.lastProbe')
    expect(buildPortraitResearchPrompt({ candidates: [{ id: 'demo/image' }] })).toContain('do not redefine the schema or ask the user to fill fields')
    expect(buildPortraitProbePrompt(['demo/image'], '2026-08-21T00:00:00.000Z')).toContain('exactly these portrait targets')
  })

  it('runs research in the configurable temporary Workspace and attaches the visible Session', async () => {
    let workspace = ''
    let createdSessionId = ''
    let prompt = ''
    let disposed = false
    const events: Array<Record<string, unknown>> = []
    const agent = {
      session: { seq: 0, events },
      whenIdle: vi.fn(async () => undefined),
      followup: vi.fn((message: { content: Array<{ type: string, text?: string }> }) => {
        prompt = message.content.find(block => block.type === 'text')?.text ?? ''
        events.push({
          seq: 0,
          type: 'assistant/message',
          data: { message: { content: [{ type: 'text', text: 'Saved and validated demo/image.' }] } },
        })
        events.push({ seq: 1, type: 'turn/end', data: { reason: { kind: 'completed' } } })
      }),
    }
    const ctx = {
      settings: {
        describe: vi.fn(() => [{
          ns: TASK_MODEL_SETTINGS_NAMESPACE,
          revision: 1,
          user: {
            models: {
              'demo/image': {
                connection: 'demo', model: 'image-1', task: 'image-generation',
              },
            },
          },
          value: {
            connections: { demo: { provider: 'demo' } },
            models: {
              'demo/image': {
                connection: 'demo', model: 'image-1', task: 'image-generation', input: ['text'], output: ['image'],
                execution: 'request-response', operations: ['generate'], capabilities: ['image.generate'], profile: {},
              },
            },
            defaults: {},
          },
        }]),
      },
      llm: { listProviders: vi.fn(() => []) },
      agentDefaultModel: { currentSelection: vi.fn(() => ({ provider: 'test', model: 'agent-model' })) },
      temporarySessions: {
        prepareWorkspace: vi.fn(async () => ({ workspaceId: 'temporary-workspace', path: '/tmp/dsh-temporary-sessions' })),
        attachSession: vi.fn(async () => ({ attached: true, workspaceId: 'temporary-workspace' })),
      },
      agents: {
        create: vi.fn(async (options: { sessionId?: string, meta?: { cwd?: string } }) => {
          workspace = options.meta?.cwd ?? ''
          createdSessionId = options.sessionId ?? ''
          return { agent, dispose: async () => { disposed = true } }
        }),
      },
    } as unknown as Context
    const coordinator = new PortraitJobCoordinator(ctx as never)

    const started = await coordinator.start('research', ['demo/image'], false)
    expect(started.workspaceLabel).toBe('temporary workspace')
    const finished = await waitForJob(coordinator)

    expect(finished).toMatchObject({ status: 'completed', targetIds: ['demo/image'], sessionId: createdSessionId })
    expect(workspace).toBe('/tmp/dsh-temporary-sessions')
    expect(prompt).toContain('The plugin owns the following contract')
    expect(prompt).toContain('portrait_job_validate_portrait')
    expect(prompt).toContain('validation always forces liveProbe=false')
    expect(ctx.temporarySessions.prepareWorkspace).toHaveBeenCalledOnce()
    expect(ctx.temporarySessions.attachSession).toHaveBeenCalledWith({ sessionId: createdSessionId })
    expect(disposed).toBe(true)
  })

  it('does not attach a Session when startup fails before Agent creation', async () => {
    const temporarySessions = {
      prepareWorkspace: vi.fn(async () => ({ workspaceId: 'temporary-workspace', path: '/tmp/dsh-temporary-sessions' })),
      attachSession: vi.fn(async () => ({ attached: true, workspaceId: 'temporary-workspace' })),
    }
    const ctx = {
      agentDefaultModel: { currentSelection: vi.fn(() => ({})) },
      temporarySessions,
      agents: { create: vi.fn() },
    } as unknown as Context
    const coordinator = new PortraitJobCoordinator(ctx as never)

    await coordinator.start('probe', ['demo/image'], true)
    await expect(waitForJob(coordinator)).resolves.toMatchObject({
      status: 'failed',
      phase: 'temporary Session could not start',
      error: 'no default Agent language model is selected',
    })
    expect(temporarySessions.prepareWorkspace).toHaveBeenCalledOnce()
    expect(temporarySessions.attachSession).not.toHaveBeenCalled()
    expect(ctx.agents.create).not.toHaveBeenCalled()
  })
})
