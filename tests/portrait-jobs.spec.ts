import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { PortraitJobCoordinator } from '../src/portrait-jobs.ts'
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
  it('keeps the plugin-owned research contract separate from Agent execution', () => {
    expect(PORTRAIT_JOB_CONTRACT.ownership.plugin).toContain('portrait schema and persistence tools')
    expect(PORTRAIT_JOB_CONTRACT.acceptance).toContain('research never writes performance.lastProbe')
    expect(buildPortraitResearchPrompt({ candidates: [{ id: 'demo/image' }] })).toContain('do not redefine the schema or ask the user to fill fields')
    expect(buildPortraitProbePrompt(['demo/image'], '2026-08-21T00:00:00.000Z')).toContain('exactly these portrait targets')
  })

  it('runs research in an anonymous temporary cwd and disposes it after the Agent finishes', async () => {
    let workspace = ''
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
      agents: {
        create: vi.fn(async (options: { meta?: { cwd?: string } }) => {
          workspace = options.meta?.cwd ?? ''
          return { agent, dispose: async () => { disposed = true } }
        }),
      },
    } as unknown as Context
    const coordinator = new PortraitJobCoordinator(ctx as never)

    const started = await coordinator.start('research', ['demo/image'], false)
    expect(started.workspaceLabel).toBe('anonymous temporary workspace')
    const finished = await waitForJob(coordinator)

    expect(finished).toMatchObject({ status: 'completed', targetIds: ['demo/image'] })
    expect(workspace.startsWith(`${tmpdir()}/dsh-model-portrait-`)).toBe(true)
    expect(workspace).not.toContain(process.cwd())
    expect(prompt).toContain('The plugin owns the following contract')
    expect(prompt).toContain('validate_model_portrait with liveProbe=false')
    expect(disposed).toBe(true)
    expect(existsSync(workspace)).toBe(false)
  })
})
