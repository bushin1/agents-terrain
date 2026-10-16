'use client'
import { useActionState, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { verifyCode, type VerifyState } from '@/app/login/actions'
import { OtpInput } from './otp-input'
import { SubmitButton } from './submit-button'

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, '').slice(-10)
  return `(${d.slice(0, 3)}) •••-${d.slice(6)}`
}

export function CodeForm({ phone, onResend, onEdit }: { phone: string; onResend: () => void; onEdit: () => void }) {
  const [state, action] = useActionState<VerifyState, FormData>(verifyCode, {})
  const [code, setCode] = useState('')
  const complete = /^\d{6}$/.test(code)
  return (
    <form action={action} style={{ display: 'contents' }}>
      <input type="hidden" name="phone" value={phone} />
      <div className="mc-scroll" style={{ paddingTop: 20 }}>
        <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="phone" className="mc-ico--lg" /></span>
        <h1 className="h1" style={{ marginTop: 20 }}>Check your texts</h1>
        <p className="mc-muted" style={{ marginTop: 8 }}>
          We sent a 6-digit code to <b className="mc-num" style={{ color: 'var(--ink)' }}>{maskPhone(phone)}</b>.
        </p>
        <div className="mc-field" style={{ marginTop: 28 }}>
          <span className="mc-label">Verification code</span>
          <OtpInput onCodeChange={setCode} />
          {state.error && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{state.error}</p>}
        </div>
        <div className="mc-stack" style={{ marginTop: 24, gap: 4 }}>
          <button type="button" className="mc-btn mc-btn--ghost" style={{ justifyContent: 'flex-start', padding: 0 }} onClick={onResend}>
            Didn’t get it? <span className="mc-accent-text">&nbsp;Resend code</span>
          </button>
          <button type="button" className="mc-btn mc-btn--ghost" style={{ justifyContent: 'flex-start', padding: 0 }} onClick={onEdit}>
            Wrong number? <span className="mc-accent-text">&nbsp;Edit</span>
          </button>
        </div>
        <p className="body-s mc-muted" style={{ marginTop: 16 }}>Message and data rates may apply. We only text you about your account and missions.</p>
      </div>
      <div className="mc-bottom">
        <SubmitButton disabled={!complete}>Verify</SubmitButton>
        {!complete && <p className="body-s mc-muted" style={{ textAlign: 'center' }}>Enter all 6 digits to continue</p>}
      </div>
    </form>
  )
}
