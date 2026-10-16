'use client'
import { useActionState } from 'react'
import { Icon } from '@/components/mc/icons'
import { SubmitButton } from '@/components/agent/submit-button'
import { sign, type SignState } from './actions'

export function ContractForm() {
  const [state, action] = useActionState<SignState, FormData>(sign, {})
  return (
    <form action={action} style={{ display: 'contents' }}>
      <div className="mc-scroll" style={{ paddingTop: 0 }}>
        <div className="mc-field">
          <label className="mc-label" htmlFor="sig">Tapez votre nom légal complet pour signer</label>
          <input className="mc-input" id="sig" name="signedName" autoComplete="name" required style={{ fontFamily: ‘var(--font-display)’, fontSize: 19 }} />
        </div>
        <label className="mc-check" style={{ marginTop: 16 }}>
          <input type="checkbox" name="agree" />
          <span className="body-s" style={{ fontSize: 15 }}>J&apos;ai lu le contrat et j&apos;ai 18 ans ou plus.</span>
        </label>
        {state.error && <p className="mc-error" role="alert" style={{ marginTop: 12 }}><Icon name="alert" className="mc-ico--sm" />{state.error}</p>}
      </div>
      <div className="mc-bottom"><SubmitButton>Signer et continuer</SubmitButton></div>
    </form>
  )
}
