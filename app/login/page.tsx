'use client'
import Link from 'next/link'
import { useActionState, useState, startTransition } from 'react'
import { Icon } from '@/components/mc/icons'
import { CodeForm } from '@/components/agent/code-form'
import { SubmitButton } from '@/components/agent/submit-button'
import { sendLoginCode, type CodeRequestState } from './actions'
import '@/app/agent/agent.css'

export default function LoginPage() {
  const [state, action] = useActionState<CodeRequestState, FormData>(sendLoginCode, {})
  const [editing, setEditing] = useState(false)
  const [lastPhone, setLastPhone] = useState('')

  if (state.phone && !editing) {
    const resend = () => {
      const f = new FormData()
      f.set('phone', state.phone!)
      startTransition(() => action(f))
    }
    return (
      <div className="mc mc-app" data-theme="light">
        <CodeForm phone={state.phone} onResend={resend} onEdit={() => setEditing(true)} />
      </div>
    )
  }

  return (
    <div className="mc mc-app" data-theme="light">
      <form action={(f) => { setLastPhone(String(f.get('phone') ?? '')); setEditing(false); action(f) }} style={{ display: 'contents' }}>
        <div className="mc-scroll" style={{ paddingTop: 48 }}>
          <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="phone" className="mc-ico--lg" /></span>
          <h1 className="h1" style={{ marginTop: 20 }}>Log in</h1>
          <p className="mc-muted" style={{ marginTop: 8 }}>Enter the mobile number you applied with. We’ll text you a code.</p>
          <div className="mc-field" style={{ marginTop: 28 }}>
            <label className="mc-label" htmlFor="phone">Mobile number</label>
            <input className={`mc-input mc-num${state.error ? ' mc-input--error' : ''}`} id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={lastPhone} placeholder="(617) 555-0142" required aria-invalid={!!state.error} />
            {state.error && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{state.error}</p>}
          </div>
          <p className="body-s mc-muted" style={{ marginTop: 24 }}>New here? <Link className="mc-link" href="/apply">Apply in 5 minutes</Link></p>
        </div>
        <div className="mc-bottom"><SubmitButton>Send code</SubmitButton></div>
      </form>
    </div>
  )
}
