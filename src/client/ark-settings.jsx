import { useEffect, useState } from 'react'
import { VOLCENGINE_ARK_BASE_URL } from '../volcengine-defaults.ts'
import { arkDraft, arkModelsFromIds, discoverArkSettings, loadArkSettings, saveArkSettings } from './ark-settings.js'

/** Provider setup inside DSH's native Models page, backed by its own Remotes. */
export function ArkSetup({ remote, t }) {
  const [open, setOpen] = useState(false)
  return <div className="mmp-page">
    <button className="mmp-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{t('arkSetup')}</button>
    {open && <ArkForm remote={remote} t={t} />}
  </div>
}

function ArkForm({ remote, t }) {
  const [snapshot, setSnapshot] = useState()
  const [baseURL, setBaseURL] = useState(VOLCENGINE_ARK_BASE_URL)
  const [ids, setIds] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let active = true
    loadArkSettings(remote).then(next => {
      if (!active) return
      setSnapshot(next)
      const draft = arkDraft(next)
      setBaseURL(draft.baseURL)
      setIds(draft.models.map(model => model.id).join('\n'))
    }).catch(error => { if (active) setError(error.message) })
    return () => { active = false }
  }, [remote])
  const run = async action => {
    setBusy(true); setError(''); setNotice('')
    try { await action() } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  const discover = () => run(async () => {
    setCandidates([])
    const found = await discoverArkSettings(remote, { baseURL }, apiKey)
    setCandidates(found)
    setNotice(found.length ? t('arkChooseModels') : t('arkEmptyModels'))
  })
  const save = () => run(async () => {
    await saveArkSettings(remote, snapshot, {
      baseURL, models: arkModelsFromIds(ids, snapshot.profile.models ?? [], candidates),
    }, apiKey, setSnapshot)
    setSnapshot(await loadArkSettings(remote))
    setApiKey('')
    setNotice(t('arkSaved'))
  })
  const selected = new Set(ids.split('\n').map(id => id.trim()).filter(Boolean))
  const toggle = id => {
    if (selected.has(id)) selected.delete(id); else selected.add(id)
    setIds([...selected].join('\n'))
  }
  return <div className="mmp-card">
    <div className="mmp-subtitle">{t('arkTitle')}</div>
    <div className="mmp-muted">{t('arkHint')}</div>
    <label>Base URL<input className="mmp-input" aria-label="Ark Base URL" value={baseURL} disabled={busy} onChange={event => { setBaseURL(event.target.value); setCandidates([]) }} /></label>
    <button type="button" className="mmp-button" disabled={busy} onClick={() => { setBaseURL(VOLCENGINE_ARK_BASE_URL); setCandidates([]) }}>{t('arkDefaultUrl')}</button>
    <label>API Key<input className="mmp-input" aria-label="Ark API Key" type="password" autoComplete="off" value={apiKey} disabled={busy} placeholder={snapshot?.keyConfigured ? t('arkKeyStored') : t('arkKeyRequired')} onChange={event => setApiKey(event.target.value)} /></label>
    <button type="button" className="mmp-button" disabled={busy || !snapshot || (!apiKey.trim() && !snapshot.keyConfigured)} onClick={discover}>{t('arkFetchModels')}</button>
    {candidates.length > 0 && <div className="mmp-list">{candidates.map(model => <label className="mmp-row" key={model.id}>
      <input type="checkbox" disabled={busy} checked={selected.has(model.id)} onChange={() => toggle(model.id)} />
      <span>{model.name ? `${model.name} · ` : ''}{model.id}</span>
    </label>)}</div>}
    <label>{t('arkModelIds')}<textarea className="mmp-input" aria-label="Ark model IDs" rows={4} disabled={busy} value={ids} onChange={event => setIds(event.target.value)} /></label>
    <div className="mmp-muted">{t('arkManualHint')}</div>
    {error && <div className="mmp-error" role="alert">{error}</div>}
    {notice && <div role="status">{notice}</div>}
    <button type="button" className="mmp-button" disabled={busy || !snapshot?.writable || !ids.trim()} onClick={save}>{t('arkSave')}</button>
  </div>
}
