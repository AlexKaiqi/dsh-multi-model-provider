import { access, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { TemporaryWorkspaceService } from 'dsh-temporary-workspace'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PortraitJobCoordinator } from '../src/portrait-jobs.ts'
import { TASK_MODEL_SETTINGS_NAMESPACE } from '../src/registry.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

async function waitForJob(coordinator: PortraitJobCoordinator) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const job = coordinator.snapshot()
    if (job?.status === 'completed' || job?.status === 'failed') return job
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  throw new Error('portrait job did not finish')
}

function modelSettings() {
  return [{
    ns: TASK_MODEL_SETTINGS_NAMESPACE,
    revision: 1,
    user: {
      models: {
        'demo/image': { connection: 'demo', model: 'image-1', task: 'image-generation' },
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
  }]
}

describe('multi-model temporary Workspace integration', () => {
  it('creates, adopts, and isolates a real Workspace for each portrait job', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'dsh-temporary-workspace-e2e-'))
    roots.push(parent)
    const root = join(parent, 'workspaces')
    let revision = 0
    let settingsValue = { root }
    const settingsScope = {
      get: () => settingsValue,
      watch: () => () => {},
      update: async () => {},
      replace: async () => {},
    }
    const host = new Context()
    host.provide('settings', {
      writable: true,
      register: () => settingsScope,
      describe: () => [{ ns: 'temporary-workspace', revision }],
      replace: async (_namespace: string, section: { root: string }) => {
        settingsValue = section
        revision += 1
      },
    } as never)
    host.provide('directoryPicker', {
      capability: () => ({ kind: 'browse' as const }),
    } as never)

    const sessionCwds = new Map<string, string>()
    const workspaces = new Map<string, { id: string; path: string; sessionIds: string[] }>()
    const order: string[] = []
    host.provide('workspaceRegistry', {
      create: async (path: string) => {
        let workspace = workspaces.get(path)
        if (workspace === undefined) {
          workspace = { id: `workspace-${workspaces.size + 1}`, path, sessionIds: [] }
          workspaces.set(path, workspace)
        }
        return {
          ...workspace,
          attachSession: async (sessionId: string) => {
            if (sessionCwds.get(sessionId) !== path) throw new Error('Session cwd does not match Workspace path')
            if (!workspace!.sessionIds.includes(sessionId)) workspace!.sessionIds.unshift(sessionId)
          },
        }
      },
      insertBefore: async (workspaceId: string) => {
        const current = order.indexOf(workspaceId)
        if (current >= 0) order.splice(current, 1)
        order.push(workspaceId)
        return [...order]
      },
    } as never)
    const temporaryWorkspaces = new TemporaryWorkspaceService(host, { root })

    const createdCwds: string[] = []
    const agents = {
      create: vi.fn(async (options: { sessionId: string; meta: { cwd: string } }) => {
        sessionCwds.set(options.sessionId, options.meta.cwd)
        createdCwds.push(options.meta.cwd)
        const events: Array<Record<string, unknown>> = []
        const agent = {
          session: { seq: 0, events },
          whenIdle: async () => undefined,
          followup: () => {
            events.push({
              seq: 0,
              type: 'assistant/message',
              data: { message: { content: [{ type: 'text', text: 'Portrait saved and validated.' }] } },
            })
            events.push({ seq: 1, type: 'turn/end', data: { reason: { kind: 'completed' } } })
          },
        }
        return { agent, dispose: async () => undefined }
      }),
    }
    const coordinator = new PortraitJobCoordinator({
      settings: { describe: vi.fn(modelSettings) },
      llm: { listProviders: vi.fn(() => []) },
      agentDefaultModel: { currentSelection: () => ({ provider: 'test', model: 'agent-model' }) },
      temporaryWorkspaces,
      agents,
    } as never)

    for (let index = 0; index < 2; index += 1) {
      await coordinator.start('research', ['demo/image'], false)
      await expect(waitForJob(coordinator)).resolves.toMatchObject({ status: 'completed' })
    }

    expect(createdCwds).toHaveLength(2)
    expect(new Set(createdCwds).size).toBe(2)
    expect(createdCwds.every(path => path.startsWith(`${root}/workspace-`))).toBe(true)
    expect(workspaces.size).toBe(2)
    expect(order).toHaveLength(2)
    for (const [path, workspace] of workspaces) {
      expect(workspace.sessionIds).toHaveLength(1)
      expect(sessionCwds.get(workspace.sessionIds[0]!)).toBe(path)
      await expect(access(join(path, '.reservation-pending'))).rejects.toMatchObject({ code: 'ENOENT' })
    }
    expect((await readdir(root)).sort()).toEqual(createdCwds.map(path => path.split('/').at(-1)!).sort())
  })
})
