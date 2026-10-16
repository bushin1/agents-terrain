'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Icon } from '@/components/mc/icons'
import { STEPS_BY_TYPE, type StepName } from '@/modules/missions/checklist-rule'
import type { VisitState } from '@/modules/missions/visit'
import { compressToJpeg, getPosition, readExif } from './device'
import { Outbox, idbStore, type Job } from './outbox'
import { CheckinPanel, CheckoutPanel, ConsentPanel, InvitePanel, ProfilePanel, VerificationPanel } from './panels'
import { PhotoStep } from './photo-step'
import { SESSION_EXPIRED, sendJob } from './send'

const META: Record<StepName, { title: string; meta: string }> = {
  checkin: { title: 'Check in', meta: 'Tap when you arrive' },
  consent: { title: 'Consent signature', meta: 'Signed by the owner' },
  profile: { title: 'Profile setup', meta: 'Created on the owner’s phone' },
  invite: { title: 'Manager invite', meta: 'Owner adds us as a manager' },
  photos: { title: 'Photos', meta: 'Logo, truck, team, equipment, past jobs' },
  verification: { title: 'Verification', meta: 'Video verification, if offered' },
  checkout: { title: 'Check out', meta: 'Confirm you’re leaving' },
}

// Abonnement à l'état de connexion du navigateur (useSyncExternalStore).
function subscribeOnline(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => { window.removeEventListener('online', onChange); window.removeEventListener('offline', onChange) }
}

export function VisitClient({ initial, defaults }: {
  initial: VisitState
  defaults: { contactName: string; city: string; zip: string; category: string }
}) {
  const router = useRouter()
  const missionId = initial.missionId
  const [state, setState] = useState(initial)
  const [queue, setQueue] = useState<Job[]>([])
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true)
  const [syncing, setSyncing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const outbox = useMemo(() => new Outbox(idbStore(), sendJob), [])

  const refreshQueue = useCallback(async () => setQueue((await outbox.pending()).filter((j) => j.missionId === missionId)), [outbox, missionId])
  const flush = useCallback(async () => {
    setSyncing(true)
    const r = await outbox.flush()
    // La file est commune à toutes les missions : on n'affiche que l'état de CELLE-CI.
    if (r.state && (r.state as VisitState).missionId === missionId) setState(r.state as VisitState)
    if (r.rejected.length) setError(r.rejected.map((x) => x.error).join(' '))
    else if (r.stopped === SESSION_EXPIRED) setError('Your session expired. Log in again to upload your visit — everything is saved on this phone.')
    else if (r.stopped && navigator.onLine) setError(`Not uploaded yet (${r.stopped}). We’ll retry automatically.`)
    await refreshQueue()
    setSyncing(false)
  }, [outbox, refreshQueue, missionId])

  useEffect(() => {
    // Premier passage au montage, lancé de façon asynchrone (pas de setState synchrone dans l'effet).
    void Promise.resolve().then(refreshQueue).then(flush)
    const on = () => void flush()
    window.addEventListener('online', on)
    const timer = window.setInterval(() => void flush(), 30_000)
    return () => { window.removeEventListener('online', on); window.clearInterval(timer) }
  }, [flush, refreshQueue])

  async function add(job: Job) {
    setError(null)
    await outbox.enqueue(job)
    await refreshQueue()
    if (navigator.onLine) await flush()
    else setNotice('You’re offline. This is saved on your phone and will upload when you reconnect.')
  }
  const saveStep = (step: string) => (data: Record<string, unknown>) => add({ id: crypto.randomUUID(), kind: 'step', missionId, step, data })

  async function addPhotos(files: File[], category: string) {
    for (const file of files) {
      const exif = await readExif(file)
      const blob = await compressToJpeg(file)
      await outbox.enqueue({ id: crypto.randomUUID(), kind: 'photo', missionId, blob, category, clientAt: new Date().toISOString(), exifTakenAt: exif.takenAt, exifLat: exif.lat, exifLng: exif.lng })
    }
    await refreshQueue()
    if (navigator.onLine) await flush()
    else setNotice(`You’re offline. ${files.length} photo${files.length > 1 ? 's are' : ' is'} saved on this phone and will upload when you reconnect.`)
  }

  async function deletePhoto(id: string) {
    const res = await fetch(`/api/agent/missions/${missionId}/photos/${id}`, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))
    if (res.ok) setState(body.state)
    else setError(body.error ?? 'Could not delete this photo. Check your connection.')
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent/missions/${missionId}/submit`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) return router.push(`/agent/missions/${missionId}`)
      setError(body.error ?? 'Could not submit. Try again.')
    } catch {
      setError('You’re offline. Submit when you’re back online.')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = STEPS_BY_TYPE[state.type]
  const pendingSteps = new Set(queue.flatMap((j) => (j.kind === 'step' ? [j.step] : [])))
  const pendingPhotos = queue.flatMap((j) => (j.kind === 'photo' ? [{ id: j.id, category: j.category, blob: j.blob }] : []))
  const isDone = (s: StepName) => (s === 'photos' ? state.photos.length + pendingPhotos.length >= state.minPhotos : !!state.steps[s as Exclude<StepName, 'photos'>] || pendingSteps.has(s))
  const doneCount = steps.filter(isDone).length
  const current = steps.find((s) => !isDone(s) && state.editable.includes(s)) ?? null
  // Étape ouverte à la main, avec l'étape courante au moment du choix. Quand l'étape courante change, on garde
  // l'étape choisie si elle n'est pas terminée, sinon on ouvre la nouvelle étape courante.
  const [manual, setManual] = useState<{ step: StepName | null; current: StepName | null } | null>(null)
  const open = !manual ? current : manual.current === current || (manual.step && !isDone(manual.step)) ? manual.step : current

  const remaining = steps.length - doneCount
  const canSubmit = state.missing.length === 0 && queue.length === 0 && online
  const sync = !online && queue.length > 0
    ? <span className="mc-sync mc-sync--offline"><Icon name="wifi-off" className="mc-ico--sm" /> Offline · saved</span>
    : syncing || queue.length > 0
      ? <span className="mc-sync mc-sync--syncing"><Icon name="refresh" className="mc-ico--sm" /> Syncing</span>
      : <span className="mc-sync"><Icon name="cloud-check" className="mc-ico--sm" /> Synced</span>

  const panel = (s: StepName) => {
    switch (s) {
      case 'checkin': return <CheckinPanel onSave={saveStep('checkin')} locate={getPosition} />
      case 'consent': return <ConsentPanel text={state.consent.text} version={state.consent.version} defaultName={defaults.contactName} onSave={saveStep('consent')} />
      case 'profile': return <ProfilePanel defaults={{ listingName: state.businessName, category: defaults.category, city: defaults.city, zip: defaults.zip, claim: state.claimExisting }} onSave={saveStep('profile')} />
      case 'invite': return <InvitePanel email={state.managerEmail} onSave={saveStep('invite')} />
      case 'photos': return <PhotoStep uploaded={state.photos} pending={pendingPhotos} min={state.minPhotos} max={state.maxPhotos} editable={state.editable.includes('photos')} onAdd={addPhotos} onDelete={deletePhoto} />
      case 'verification': return <VerificationPanel onSave={saveStep('verification')} />
      case 'checkout': return <CheckoutPanel onSave={saveStep('checkout')} />
    }
  }

  return (
    <>
      <header className="mc-appbar">
        <Link href={`/agent/missions/${missionId}`} className="mc-iconbtn" aria-label="Back"><Icon name="arrow-left" /></Link>
        <span className="mc-appbar__title">Visit in progress</span>
        <span style={{ marginRight: 8 }}>{sync}</span>
      </header>
      <div style={{ padding: '0 16px 12px' }}>
        <div className="mc-between"><span className="body-s mc-muted">{state.businessName}</span><span className="body-s mc-num"><b>{doneCount}</b> of {steps.length}</span></div>
        <div className="mc-progress" style={{ marginTop: 8 }} role="progressbar" aria-label={`${doneCount} of ${steps.length} steps done`} aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      </div>
      {state.fixMessage && state.status === 'NEEDS_FIX' && (
        <div className="mc-card mc-card--sunk" style={{ margin: '0 16px 12px', display: 'flex', gap: 12 }} role="status"><Icon name="alert" /><p className="body-s"><b>What to fix:</b> {state.fixMessage}</p></div>
      )}
      <main className="mc-scroll">
        <div className="mc-stepper">
          {steps.map((s, i) => {
            const done = isDone(s)
            const editable = state.editable.includes(s)
            const st = done ? 'done' : s === current ? 'current' : 'todo'
            return (
              <div key={s}>
                <button type="button" className="mc-step" data-state={st} aria-expanded={open === s} disabled={!editable && !done} onClick={() => setManual({ step: open === s ? null : s, current })}>
                  <span className="mc-step__dot">{done ? <Icon name="check" className="mc-ico--sm" /> : i + 1}</span>
                  <span><span className="mc-step__title">{META[s].title}</span><br /><span className="mc-step__meta">{pendingSteps.has(s) ? 'Saved on phone · uploading' : META[s].meta}</span></span>
                  <span className="mc-step__status">{done ? 'Done' : st === 'current' ? 'Now' : ''}</span>
                </button>
                {open === s && editable && <div className="mc-step__panel">{panel(s)}</div>}
              </div>
            )
          })}
        </div>
        {notice && (
          <div className="mc-toast mc-toast--offline" role="status" style={{ marginTop: 16 }}>
            <span className="mc-toast__icon"><Icon name="wifi-off" /></span><span>{notice}</span>
            <button type="button" className="mc-toast__btn" onClick={() => setNotice(null)}>OK</button>
          </div>
        )}
        {error && <p className="mc-error" role="alert" style={{ marginTop: 16 }}><Icon name="alert" className="mc-ico--sm" />{error}</p>}
      </main>
      <div className="mc-bottom">
        <button type="button" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block" disabled={!canSubmit || submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit visit'}</button>
        <p className="body-s mc-muted" style={{ textAlign: 'center' }}>
          {remaining > 0 ? `Finish ${remaining} more step${remaining > 1 ? 's' : ''} to submit`
            : queue.length > 0 ? `Waiting to upload ${queue.length} item${queue.length > 1 ? 's' : ''}`
            : !online ? 'Reconnect to submit'
            : 'All steps done. Ready to submit.'}
        </p>
      </div>
    </>
  )
}
