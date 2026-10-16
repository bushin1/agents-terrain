'use client'
import Link from 'next/link'
import { startTransition, useActionState, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { CodeForm } from '@/components/agent/code-form'
import { SubmitButton } from '@/components/agent/submit-button'
import { AVAILABILITY_SLOTS, DAYS, RADIUS_OPTIONS } from '@/modules/recruitment/apply-rule'
import { submitApplication, type ApplyState } from './actions'
import { STEPS, birthDateFromParts, firstStepWithError } from './apply-steps'

type Values = {
  firstName: string; lastName: string; email: string; phone: string
  month: string; day: string; year: string
  occupation: string; howDidYouHear: string
  zip: string; radiusMiles: string; hasCar: 'yes' | 'no' | ''; availability: string[]; confirm18: boolean
}

const EMPTY: Values = { firstName: '', lastName: '', email: '', phone: '', month: '', day: '', year: '', occupation: '', howDidYouHear: '', zip: '', radiusMiles: '10', hasCar: '', availability: [], confirm18: false }
const DAY_LABEL: Record<(typeof DAYS)[number], string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function Field({ id, label, error, help, children }: { id: string; label: string; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="mc-field">
      <label className="mc-label" htmlFor={id}>{label}</label>
      {children}
      {help && !error && <span className="mc-help">{help}</span>}
      {error && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{error}</p>}
    </div>
  )
}

export function ApplyForm() {
  const [state, action] = useActionState<ApplyState, FormData>(submitApplication, {})
  const [step, setStep] = useState(0)
  const [v, setV] = useState<Values>(EMPTY)
  const [verifying, setVerifying] = useState(false)
  const errors = state.fieldErrors ?? {}
  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((x) => ({ ...x, [k]: value }))

  // Réaction au retour de l'action, pendant le rendu (et non dans un effet) : on mémorise le dernier état traité.
  const [handled, setHandled] = useState(state)
  if (state !== handled) {
    setHandled(state)
    if (state.phone) setVerifying(true)
    else if (state.fieldErrors) {
      const s = firstStepWithError(state.fieldErrors)
      if (s >= 0) setStep(s)
    }
  }

  function toFormData(): FormData {
    const f = new FormData()
    f.set('firstName', v.firstName); f.set('lastName', v.lastName); f.set('email', v.email); f.set('phone', v.phone)
    f.set('birthDate', birthDateFromParts(v.month, v.day, v.year))
    f.set('occupation', v.occupation); f.set('howDidYouHear', v.howDidYouHear)
    f.set('zip', v.zip); f.set('radiusMiles', v.radiusMiles); f.set('hasCar', v.hasCar)
    v.availability.forEach((a) => f.append('availability', a))
    if (v.confirm18) f.set('confirm18', 'on')
    return f
  }

  if (verifying && state.phone) {
    return <CodeForm phone={state.phone} onResend={() => startTransition(() => action(toFormData()))} onEdit={() => { setVerifying(false); setStep(1) }} />
  }

  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const toggleSlot = (slot: string) => set('availability', v.availability.includes(slot) ? v.availability.filter((x) => x !== slot) : [...v.availability, slot])

  return (
    <form action={() => (last ? action(toFormData()) : setStep(step + 1))} style={{ display: 'contents' }}>
      <header className="mc-appbar">
        {step > 0 ? (
          <button type="button" className="mc-iconbtn" aria-label="Back" onClick={() => setStep(step - 1)}><Icon name="arrow-left" /></button>
        ) : (
          <Link className="mc-iconbtn" aria-label="Back" href="/"><Icon name="arrow-left" /></Link>
        )}
        <span className="mc-appbar__title">Apply</span>
        <span className="body-s mc-muted mc-num" style={{ paddingRight: 12 }}>{step + 1} of {STEPS.length}</span>
      </header>
      <div style={{ padding: '0 16px' }}>
        <div className="mc-progress" role="progressbar" aria-label={`Step ${step + 1} of ${STEPS.length}`} aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
      <div className="mc-scroll" style={{ paddingTop: 28 }}>
        <p className="overline mc-accent-text">{s.eyebrow}</p>
        <h1 className="h1" style={{ marginTop: 8 }}>{s.title}</h1>
        <div className="mc-stack" style={{ gap: 24, marginTop: 28 }}>
          {step === 0 && (
            <>
              <Field id="firstName" label="First name" error={errors.firstName}><input className="mc-input" id="firstName" autoComplete="given-name" value={v.firstName} onChange={(e) => set('firstName', e.target.value)} required /></Field>
              <Field id="lastName" label="Last name" error={errors.lastName}><input className="mc-input" id="lastName" autoComplete="family-name" value={v.lastName} onChange={(e) => set('lastName', e.target.value)} required /></Field>
              <Field id="email" label="Email" error={errors.email}><input className="mc-input" id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} required /></Field>
            </>
          )}
          {step === 1 && (
            <Field id="phone" label="Mobile number" error={errors.phone} help="We text you a one-time code. US, Canada (+1) and France (+33) supported.">
              <input className="mc-input mc-num" id="phone" type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1 617 555 0142 or +33 6 12 34 56 78" required />
            </Field>
          )}
          {step === 2 && (
            <>
              <p className="mc-muted" style={{ marginTop: -16 }}>Agents must be 18 or older.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 8 }}>
                <Field id="m" label="Month"><input className="mc-input mc-num" id="m" inputMode="numeric" maxLength={2} value={v.month} onChange={(e) => set('month', e.target.value.replace(/\D/g, ''))} required /></Field>
                <Field id="d" label="Day"><input className="mc-input mc-num" id="d" inputMode="numeric" maxLength={2} value={v.day} onChange={(e) => set('day', e.target.value.replace(/\D/g, ''))} required /></Field>
                <Field id="y" label="Year"><input className="mc-input mc-num" id="y" inputMode="numeric" maxLength={4} value={v.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} required /></Field>
              </div>
              {errors.birthDate && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.birthDate}</p>}
              <div className="mc-card mc-card--sunk" style={{ display: 'flex', gap: 12 }}>
                <Icon name="id" />
                <p className="body-s">We’ll confirm your age with a photo ID before your first payout. It’s also why you’ll sign an independent contractor agreement.</p>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <Field id="occupation" label="What do you do?" error={errors.occupation} help="Student, driver, freelancer — anything goes.">
                <input className="mc-input" id="occupation" value={v.occupation} onChange={(e) => set('occupation', e.target.value)} placeholder="e.g. College student" required />
              </Field>
              <Field id="howDidYouHear" label="How did you hear about us?" error={errors.howDidYouHear}>
                <input className="mc-input" id="howDidYouHear" value={v.howDidYouHear} onChange={(e) => set('howDidYouHear', e.target.value)} placeholder="e.g. Instagram ad, friend referral" required />
              </Field>
            </>
          )}
          {step === 4 && (
            <>
              <Field id="zip" label="Home ZIP code" error={errors.zip} help="Used to find missions near you. Never shown to businesses.">
                <input className="mc-input mc-num" id="zip" inputMode="numeric" maxLength={5} value={v.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, ''))} required />
              </Field>
              <div className="mc-field">
                <span className="mc-label" id="rad">How far will you travel?</span>
                <div className="mc-chips" role="radiogroup" aria-labelledby="rad">
                  {RADIUS_OPTIONS.map((r) => (
                    <button key={r} type="button" className="mc-chip" role="radio" aria-checked={v.radiusMiles === String(r)} onClick={() => set('radiusMiles', String(r))}>{r} mi</button>
                  ))}
                </div>
              </div>
              <div className="mc-field">
                <span className="mc-label" id="car">Do you have a car?</span>
                <div className="mc-seg" role="group" aria-labelledby="car">
                  <button type="button" aria-pressed={v.hasCar === 'yes'} onClick={() => set('hasCar', 'yes')}><Icon name="car" className="mc-ico--sm" /> Yes</button>
                  <button type="button" aria-pressed={v.hasCar === 'no'} onClick={() => set('hasCar', 'no')}>No</button>
                </div>
                {errors.hasCar ? <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.hasCar}</p> : <span className="mc-help">No car is fine — choose a radius you can reach by bike or transit.</span>}
              </div>
            </>
          )}
          {step === 5 && (
            <div className="mc-field">
              <span className="mc-label" id="avail">Pick every time you could visit a business</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 8, alignItems: 'center' }} role="group" aria-labelledby="avail">
                {DAYS.map((d) => (
                  <div key={d} style={{ display: 'contents' }}>
                    <span className="label">{DAY_LABEL[d]}</span>
                    {(['am', 'pm'] as const).map((half) => {
                      const slot = `${d}-${half}`
                      return (
                        <button key={slot} type="button" className="mc-chip" aria-pressed={v.availability.includes(slot)} onClick={() => toggleSlot(slot)}>
                          {half === 'am' ? 'Morning' : 'Afternoon'}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              {errors.availability && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.availability}</p>}
              <span className="mc-help">{v.availability.length} of {AVAILABILITY_SLOTS.length} selected. You can change this later.</span>
            </div>
          )}
          {step === 6 && (
            <>
              <div className="mc-card">
                <div className="mc-kv">
                  <div><span className="k">Name</span><span className="v">{v.firstName} {v.lastName}</span></div>
                  <div><span className="k">Mobile</span><span className="v">{v.phone}</span></div>
                  <div><span className="k">Occupation</span><span className="v">{v.occupation}</span></div>
                  <div><span className="k">ZIP · radius</span><span className="v">{v.zip} · {v.radiusMiles} mi</span></div>
                  <div><span className="k">Time slots</span><span className="v">{v.availability.length}</span></div>
                </div>
              </div>
              <label className="mc-check">
                <input type="checkbox" checked={v.confirm18} onChange={(e) => set('confirm18', e.target.checked)} />
                <span className="body-s" style={{ fontSize: 15 }}>I’m 18 or older. I understand field agents work as independent contractors.</span>
              </label>
              {errors.confirm18 && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.confirm18}</p>}
            </>
          )}
        </div>
      </div>
      <div className="mc-bottom">
        {last ? <SubmitButton disabled={!v.confirm18}>Submit application</SubmitButton> : <button type="submit" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Continue</button>}
        {s.next && <p className="body-s mc-muted" style={{ textAlign: 'center' }}>Next: {s.next}</p>}
      </div>
    </form>
  )
}
