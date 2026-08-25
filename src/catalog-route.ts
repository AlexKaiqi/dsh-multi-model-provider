import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { ModelCatalog } from './catalog.ts'

/** Secret-free unified registry snapshot consumed by the Settings portrait page. */
export const MODEL_CATALOG_PATH = '/dsh-multi-model-provider/catalog'

type CatalogRouteScope = Context & {
  readonly modelCatalog: ModelCatalog
  readonly webServer: {
    register(route: {
      kind: 'exact'
      path: string
      handler(req: IncomingMessage, res: ServerResponse): Promise<void>
    }): () => void
  }
}

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(value))
}

/** Mount the browser-readable view of the same modelCatalog service peer plugins consume. */
export function registerModelCatalogRoute(ctx: Context): void {
  ctx.inject(['modelCatalog', 'webServer'], (scope) => {
    const catalogScope = scope as CatalogRouteScope
    catalogScope.effect(() => catalogScope.webServer.register({
      kind: 'exact',
      path: MODEL_CATALOG_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405, { allow: 'GET' })
          res.end()
          return
        }
        try {
          sendJson(res, 200, await catalogScope.modelCatalog.snapshot())
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }))
  })
}
