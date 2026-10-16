'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/mc/icons'

export const PHOTO_CATEGORIES = [
  { value: 'LOGO', label: 'Logo', target: 1 },
  { value: 'VEHICLE', label: 'Truck', target: 2 },
  { value: 'TEAM', label: 'Team', target: 2 },
  { value: 'EQUIPMENT', label: 'Equipment', target: 3 },
  { value: 'JOB', label: 'Past jobs', target: 4 },
] as const

type Uploaded = { id: string; category: string; url: string }
type Pending = { id: string; category: string; blob: Blob }

export function PhotoStep({ uploaded, pending, min, max, editable, onAdd, onDelete }: {
  uploaded: Uploaded[]
  pending: Pending[]
  min: number
  max: number
  editable: boolean
  onAdd: (files: File[], category: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [category, setCategory] = useState<string>('LOGO')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const total = uploaded.length + pending.length
  const pendingUrls = useMemo(() => pending.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })), [pending])
  useEffect(() => () => pendingUrls.forEach((p) => URL.revokeObjectURL(p.url)), [pendingUrls])
  const count = (c: string) => uploaded.filter((p) => p.category === c).length + pending.filter((p) => p.category === c).length
  const label = (c: string) => PHOTO_CATEGORIES.find((x) => x.value === c)?.label ?? c

  return (
    <>
      <div className="mc-between"><b className="mc-num">{total} of {min} minimum</b><span className="body-s mc-muted">up to {max}</span></div>
      <div className="mc-progress" style={{ marginTop: 8 }}><span style={{ width: `${Math.min(100, (total / min) * 100)}%` }} /></div>
      <div className="mc-chips" role="radiogroup" aria-label="Photo category" style={{ marginTop: 12 }}>
        {PHOTO_CATEGORIES.map((c) => (
          <button key={c.value} type="button" className="mc-chip" role="radio" aria-checked={category === c.value} onClick={() => setCategory(c.value)}>
            {count(c.value) >= c.target && <Icon name="check" className="mc-ico--sm" />} {c.label} <span className="mc-num">{count(c.value)}/{c.target}</span>
          </button>
        ))}
      </div>
      <div className="mc-slots" style={{ marginTop: 12 }}>
        {uploaded.map((p) => (
          <div key={p.id} className="mc-slot" data-filled role="img" aria-label={`${label(p.category)} photo`} style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover' }}>
            <span className="mc-slot__lbl">{label(p.category)}</span>
            {editable && <button type="button" className="mc-iconbtn" aria-label="Delete photo" style={{ position: 'absolute', left: 2, top: 2, background: 'var(--surface)' }} onClick={() => onDelete(p.id)}><Icon name="x" className="mc-ico--sm" /></button>}
          </div>
        ))}
        {pendingUrls.map((p) => (
          <div key={p.id} className="mc-slot" role="img" aria-label={`${label(p.category)} photo saved on phone`} style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover' }}>
            <span className="mc-slot__lbl">On phone</span>
          </div>
        ))}
        {editable && total < max && (
          <button type="button" className="mc-slot mc-slot--add" disabled={busy} onClick={() => input.current?.click()}>
            <Icon name="camera" className="mc-ico--lg" />{busy ? 'Saving…' : label(category)}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={async (e) => {
        const files = Array.from(e.target.files ?? []).slice(0, max - total)
        e.target.value = ''
        if (!files.length) return
        setBusy(true)
        try { await onAdd(files, category) } finally { setBusy(false) }
      }} />
      <div className="mc-card mc-card--sunk" style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <Icon name="info" />
        <p className="body-s">Shoot in daylight, landscape. Ask before photographing anyone, and skip customers’ homes or house numbers.</p>
      </div>
    </>
  )
}
