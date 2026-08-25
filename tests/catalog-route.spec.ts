import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { MODEL_CATALOG_PATH, registerModelCatalogRoute } from '../src/catalog-route.ts'

describe('model catalog HTTP route', () => {
  function fixture() {
    let handler: ((req: IncomingMessage, res: ServerResponse) => Promise<void>) | undefined
    const snapshot = vi.fn(async () => ({
      languageModels: [{ id: 'llm:deepseek-official/deepseek-v4-pro' }],
      taskModels: [],
      languageFailures: [],
    }))
    const scope = {
      modelCatalog: { snapshot },
      webServer: {
        register: vi.fn((route) => {
          expect(route.path).toBe(MODEL_CATALOG_PATH)
          handler = route.handler
          return vi.fn()
        }),
      },
      effect: vi.fn((mount) => mount()),
    }
    const ctx = { inject: vi.fn((_services, mount) => mount(scope)) } as unknown as Context
    registerModelCatalogRoute(ctx)
    return { handler: handler!, snapshot }
  }

  function response() {
    let status = 0
    let headers: Record<string, string> = {}
    let body = ''
    return {
      res: {
        writeHead: vi.fn((nextStatus: number, nextHeaders?: Record<string, string>) => {
          status = nextStatus
          headers = nextHeaders ?? {}
        }),
        end: vi.fn((value?: string) => { body = value ?? '' }),
      } as unknown as ServerResponse,
      value: () => ({ status, headers, body }),
    }
  }

  it('returns the exact secret-free modelCatalog snapshot without caching', async () => {
    const { handler, snapshot } = fixture()
    const output = response()
    await handler({ method: 'GET' } as IncomingMessage, output.res)
    expect(snapshot).toHaveBeenCalledOnce()
    expect(output.value()).toMatchObject({
      status: 200,
      headers: { 'cache-control': 'no-store' },
    })
    expect(JSON.parse(output.value().body).languageModels[0].id).toBe('llm:deepseek-official/deepseek-v4-pro')
  })

  it('rejects non-GET requests without reading the catalog', async () => {
    const { handler, snapshot } = fixture()
    const output = response()
    await handler({ method: 'POST' } as IncomingMessage, output.res)
    expect(snapshot).not.toHaveBeenCalled()
    expect(output.value().status).toBe(405)
  })
})
