import { describe, expect, it, vi } from 'vitest'
import { arkDraft, arkModelsFromIds, discoverArkSettings, loadArkSettings, saveArkSettings } from '../src/client/ark-settings.js'

const url = 'https://ark.cn-beijing.volces.com/api/v3'
const ok = (value: unknown) => ({ ok: true, value })
function fixture(profile: Record<string, unknown> = {}) {
  let namespace = { ns: 'llm-pi-ai', revision: 4, value: { providers: { volcengine: profile } } }
  const remote = {
    settings: {
      describe: vi.fn(async () => ok({ namespaces: [namespace], writable: true })),
      mutate: vi.fn(async (_ns, ops, revision) => {
        if (revision !== namespace.revision) return { ok: false, error: { message: 'settings conflict' } }
        const next = { ...namespace.value.providers.volcengine }
        for (const op of ops) next[op.path[2]] = op.value
        namespace = { ...namespace, revision: revision + 1, value: { providers: { volcengine: next } } }
        return ok(namespace)
      }),
    },
    credentials: { describe: vi.fn(async () => ok({ ARK_API_KEY: { configured: false } })), set: vi.fn(async () => ok(undefined)) },
    llm: { discoverModels: vi.fn(async () => ok([{ id: 'account-model' }])) },
  }
  return remote
}

describe('native Ark setup workflow', () => {
  it('prefills the official URL before any route or credential has been saved', async () => {
    const remote = fixture()
    const snapshot = await loadArkSettings(remote)
    expect(arkDraft(snapshot)).toEqual({ baseURL: url, models: [] })
    await expect(discoverArkSettings(remote, arkDraft(snapshot), ' test-key ')).resolves.toEqual([{ id: 'account-model' }])
    expect(remote.llm.discoverModels).toHaveBeenCalledWith('multi-model-provider', { provider: 'volcengine', baseURL: url, apiKey: 'test-key' })
    expect(remote.settings.mutate).not.toHaveBeenCalled()
    expect(remote.credentials.set).not.toHaveBeenCalled()
  })

  it('saves a manual model at the default URL with CAS, keeping unrelated configuration', async () => {
    const remote = fixture({ headers: { 'x-custom': 'keep' }, retryPolicy: { maxAttempts: 3 } })
    const snapshot = await loadArkSettings(remote)
    const committed = vi.fn()
    await saveArkSettings(remote, snapshot, { baseURL: '', models: [{ id: 'ep-test' }] }, '', committed)
    expect(committed.mock.calls[0][0].profile).toMatchObject({ baseURL: url, api: 'openai-completions', apiKeyEnv: 'ARK_API_KEY', models: [{ id: 'ep-test' }], headers: { 'x-custom': 'keep' } })
    expect(remote.credentials.set).not.toHaveBeenCalled()
    expect(JSON.stringify(remote.settings.mutate.mock.calls)).not.toContain('apiKey":')
  })

  it('does not turn a discovery failure into an empty successful catalog', async () => {
    const remote = fixture()
    remote.llm.discoverModels.mockResolvedValueOnce({ ok: false, error: { message: 'Ark answered 401; check the API key' } } as never)
    await expect(discoverArkSettings(remote, { baseURL: url }, 'bad-key')).rejects.toThrow('401')
    expect(remote.settings.mutate).not.toHaveBeenCalled()
  })

  it('keeps the new revision for a credential retry, and never writes a secret into settings', async () => {
    const remote = fixture()
    let snapshot = await loadArkSettings(remote)
    remote.credentials.set.mockResolvedValueOnce({ ok: false, error: { message: 'credential store unavailable' } } as never)
    const draft = { baseURL: url, models: [{ id: 'account-model' }] }
    await expect(saveArkSettings(remote, snapshot, draft, 'test-secret', next => { snapshot = next })).rejects.toThrow('credential store unavailable')
    expect(snapshot.namespace.revision).toBe(5)
    await saveArkSettings(remote, snapshot, draft, 'test-secret', next => { snapshot = next })
    expect(snapshot.namespace.revision).toBe(6)
    expect(JSON.stringify(remote.settings.mutate.mock.calls)).not.toContain('test-secret')
  })

  it('refuses stale writes before changing a credential', async () => {
    const remote = fixture()
    const snapshot = await loadArkSettings(remote)
    snapshot.namespace = { ...snapshot.namespace, revision: 2 }
    await expect(saveArkSettings(remote, snapshot, { baseURL: url, models: [{ id: 'm' }] }, 'new-key', vi.fn())).rejects.toThrow('conflict')
    expect(remote.credentials.set).not.toHaveBeenCalled()
  })

  it('distinguishes missing models from an endpoint problem', async () => {
    const remote = fixture()
    await expect(saveArkSettings(remote, await loadArkSettings(remote), { baseURL: url, models: [] }, '', vi.fn())).rejects.toThrow('at least one model')
    expect(remote.settings.mutate).not.toHaveBeenCalled()
  })

  it('preserves saved model options and does not persist discovered output capacity as a request cap', () => {
    expect(arkModelsFromIds('old\nnew', [{ id: 'old', maxTokens: 99, input: ['text', 'image'] }], [{ id: 'new', name: 'New', contextWindow: 200000, maxTokens: 100000 }])).toEqual([
      { id: 'old', maxTokens: 99, input: ['text', 'image'] }, { id: 'new', name: 'New', contextWindow: 200000 },
    ])
  })
})
