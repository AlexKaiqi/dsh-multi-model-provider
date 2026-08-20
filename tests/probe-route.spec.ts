import { describe, expect, it } from 'vitest'
import { authorizePaidModelProbe, isSameOriginHttpRequest } from '../src/probe-route.ts'

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
