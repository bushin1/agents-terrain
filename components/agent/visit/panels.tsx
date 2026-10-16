'use client'
import { useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { SignaturePad } from './signature-pad'

const now = () => new Date().toISOString()
type Save = (data: Record<string, unknown>) => Promise<void>

export function CheckinPanel({ onSave, locate }: { onSave: Save; locate: () => Promise<{ lat: number; lng: number; accuracy: number }> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <p className="body-s">Tap when you’re at the business. We record your location once, to confirm the visit.</p>
      {error && <p className="mc-error" role="alert" style={{ marginTop: 8 }}><Icon name="alert" className="mc-ico--sm" />{error}</p>}
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ marginTop: 12 }} disabled={busy} onClick={async () => {
        setBusy(true); setError(null)
        try { await onSave({ ...(await locate()), clientAt: now() }) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
      }}>
        <Icon name="check-in" className="mc-ico--sm" /> {busy ? 'Locating…' : 'Check in here'}
      </button>
    </>
  )
}

export function ConsentPanel({ text, version, defaultName, onSave }: { text: string[]; version: string; defaultName: string; onSave: Save }) {
  const [name, setName] = useState(defaultName)
  const [png, setPng] = useState<string | null>(null)
  return (
    <>
      <p className="body-s" style={{ fontWeight: 600 }}>Hand your phone to the owner. They read and sign:</p>
      <ul style={{ margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {text.map((t) => <li key={t} className="body-s">• {t}</li>)}
      </ul>
      <div className="mc-field">
        <label className="mc-label" htmlFor="signer">Owner’s full name</label>
        <input className="mc-input" id="signer" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginTop: 12 }}><SignaturePad onChange={setPng} /></div>
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ marginTop: 8 }} disabled={!png || name.trim().length < 2}
        onClick={() => onSave({ signerName: name.trim(), textVersion: version, signaturePng: png, clientAt: now() })}>
        <Icon name="pen" className="mc-ico--sm" /> Save signature
      </button>
    </>
  )
}

export function ProfilePanel({ defaults, onSave }: { defaults: { listingName: string; category: string; city: string; zip: string; claim: boolean }; onSave: Save }) {
  const [v, setV] = useState({ ...defaults, mode: defaults.claim ? 'CLAIMED' : 'CREATED' })
  const field = (id: keyof typeof v, label: string, help?: string) => (
    <div className="mc-field">
      <label className="mc-label" htmlFor={`pf-${id}`}>{label}</label>
      <input className="mc-input" id={`pf-${id}`} value={String(v[id])} onChange={(e) => setV({ ...v, [id]: e.target.value })} />
      {help && <span className="mc-help">{help}</span>}
    </div>
  )
  return (
    <div className="mc-stack" style={{ gap: 16 }}>
      <p className="body-s">The owner types on their own phone, in their own Google account. Enter what they used.</p>
      <div className="mc-seg" role="group" aria-label="Profile">
        <button type="button" aria-pressed={v.mode === 'CREATED'} onClick={() => setV({ ...v, mode: 'CREATED' })}>Created new</button>
        <button type="button" aria-pressed={v.mode === 'CLAIMED'} onClick={() => setV({ ...v, mode: 'CLAIMED' })}>Claimed existing</button>
      </div>
      {field('listingName', 'Business name on the profile', 'The real name on their sign or license. No extra keywords.')}
      {field('category', 'Primary category')}
      {field('city', 'City')}
      {field('zip', 'ZIP code')}
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ alignSelf: 'flex-start' }}
        onClick={() => onSave({ listingName: v.listingName, category: v.category, city: v.city, zip: v.zip, mode: v.mode, clientAt: now() })}>
        <Icon name="store" className="mc-ico--sm" /> Save profile details
      </button>
    </div>
  )
}

export function InvitePanel({ email, onSave }: { email: string; onSave: Save }) {
  return (
    <>
      <p className="body-s">Ask the owner to add <b>{email}</b> as a manager in their profile settings, so we can confirm it goes live. They can remove it anytime.</p>
      <div className="mc-stack" style={{ marginTop: 12, gap: 8 }}>
        <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" onClick={() => onSave({ result: 'INVITE_SENT', clientAt: now() })}><Icon name="check" className="mc-ico--sm" /> Owner sent the invite</button>
        <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm" onClick={() => onSave({ result: 'INVITE_NOT_ALLOWED_YET', clientAt: now() })}>Google doesn’t offer this yet</button>
      </div>
    </>
  )
}

export function VerificationPanel({ onSave }: { onSave: Save }) {
  const [result, setResult] = useState<'VIDEO_DONE' | 'VIDEO_NOT_OFFERED' | 'OTHER_METHOD_STARTED' | null>(null)
  const [method, setMethod] = useState('')
  const options = [
    ['VIDEO_DONE', 'Video verification done', 'The owner recorded it from their own account.'],
    ['VIDEO_NOT_OFFERED', 'Not offered yet', 'Normal: Google may offer it later.'],
    ['OTHER_METHOD_STARTED', 'Another method started', 'Postcard, phone or email.'],
  ] as const
  return (
    <div className="mc-stack" role="radiogroup" aria-label="Verification" style={{ gap: 8 }}>
      {options.map(([value, title, hint]) => (
        <label key={value} className="mc-card mc-card--flat mc-check" style={{ padding: 12, ...(result === value ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : {}) }}>
          <input type="radio" name="verification" checked={result === value} onChange={() => setResult(value)} />
          <span><b>{title}</b><br /><span className="body-s mc-muted">{hint}</span></span>
        </label>
      ))}
      {result === 'OTHER_METHOD_STARTED' && (
        <div className="mc-field"><label className="mc-label" htmlFor="vm">Which method?</label><input className="mc-input" id="vm" value={method} onChange={(e) => setMethod(e.target.value)} /></div>
      )}
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ alignSelf: 'flex-start' }}
        disabled={!result || (result === 'OTHER_METHOD_STARTED' && method.trim().length < 2)}
        onClick={() => onSave({ result, ...(result === 'OTHER_METHOD_STARTED' ? { method: method.trim() } : {}), clientAt: now() })}>
        <Icon name="video" className="mc-ico--sm" /> Save verification
      </button>
    </div>
  )
}

export function CheckoutPanel({ onSave }: { onSave: Save }) {
  return (
    <>
      <p className="body-s">Before you leave: thank the owner and tell them they’ll get a short text about today’s visit.</p>
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ marginTop: 12 }} onClick={() => onSave({ clientAt: now() })}>
        <Icon name="check-out" className="mc-ico--sm" /> Check out now
      </button>
    </>
  )
}
