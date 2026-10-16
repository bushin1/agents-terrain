'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/app/admin/_components/action-form'
import { validateAction } from '../actions'

export function ValidateForm({ missionId }: { missionId: string }) {
  const [state, formAction] = useActionState(validateAction, {})
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="missionId" value={missionId} />
      {state.needsConfirmation && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmFlags" required className="mt-0.5" /> Je confirme malgré l’alerte du pro
        </label>
      )}
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton>Valider la visite</SubmitButton>
    </form>
  )
}
