import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { authorizePaidModelProbe, isSameOriginHttpRequest, registerModelProbeRoute } from '../src/probe-route.ts'

describe('paid model probe authorization', () => {
  it('accepts a same-origin Settings request with the probe marker', () => {
    const req = {
      headers: {
        origin: 'http://127.0.0.1:3080',
        host: '127.0.0.1:3080',
        'x-dsh-model-probe': '1',
        'sec-fetch-site': 'same-origin',
      },
    }
    expect(isSameOriginHttpRequest(req)).toBe(true)
    expect(authorizePaidModelProbe(req)).toEqual({ ok: true })
  })

  it('reowns the route exactly once when webServer unloads and reactivates', async () => {
    const ctx = new Context()
    const activeRoutes = new Set<string>()
    const registrations: string[] = []
    const disposals: string[] = []
    const server = (owner: string) => ({
      register: vi.fn((route: { path: string }) => {
        const key = `${owner}:${route.path}`
        registrations.push(key)
        activeRoutes.add(key)
        return () => {
          disposals.push(key)
          activeRoutes.delete(key)
        }
      }),
    })
    ctx.provide('llm', {} as never)
    const first = ctx.provide('webServer', server('first') as never)
    const plugin = await ctx.plugin({ name: 'probe-route-test', apply: registerModelProbeRoute })
    expect(registrations).toEqual(['first:/dsh-multi-model-provider/probe'])
    expect([...activeRoutes]).toEqual(['first:/dsh-multi-model-provider/probe'])

    await first()
    expect(disposals).toEqual(['first:/dsh-multi-model-provider/probe'])
    expect(activeRoutes.size).toBe(0)

    const second = ctx.provide('webServer', server('second') as never)
    await Promise.resolve()
    expect(registrations).toEqual([
      'first:/dsh-multi-model-provider/probe',
      'second:/dsh-multi-model-provider/probe',
    ])
    expect([...activeRoutes]).toEqual(['second:/dsh-multi-model-provider/probe'])

    await plugin.dispose()
    expect(disposals).toEqual([
      'first:/dsh-multi-model-provider/probe',
      'second:/dsh-multi-model-provider/probe',
    ])
    expect(activeRoutes.size).toBe(0)
    await second()
  })

  it('rejects a missing marker, a cross-site Origin, or a non-same-origin fetch site', () => {
    expect(authorizePaidModelProbe({
      headers: { origin: 'http://127.0.0.1:3080', host: '127.0.0.1:3080' },
    })).toMatchObject({ ok: false, status: 403 })
    expect(authorizePaidModelProbe({
      headers: {
        origin: 'https://evil.example',
        host: '127.0.0.1:3080',
        'x-dsh-model-probe': '1',
      },
    })).toMatchObject({ ok: false, error: 'model probe must be a same-origin Settings request' })
    expect(authorizePaidModelProbe({
      headers: {
        origin: 'http://127.0.0.1:3080',
        host: '127.0.0.1:3080',
        'x-dsh-model-probe': '1',
        'sec-fetch-site': 'cross-site',
      },
    })).toMatchObject({ ok: false, error: 'model probe must be same-origin' })
  })
})
