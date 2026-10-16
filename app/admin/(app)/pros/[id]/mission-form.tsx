'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/app/admin/_components/action-form'
import { Field, inputClass } from '@/app/admin/_components/ui'
import { createMissionAction } from '../actions'

export function MissionForm({ proId, timeZone, defaultCategory }: { proId: string; timeZone: string; defaultCategory: string }) {
  const [state, formAction] = useActionState(createMissionAction, {})
  const v = state.values ?? {}
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="proId" value={proId} />
      <Field label={`Créneau, à l’heure locale du pro (${timeZone})`}>
        <input type="datetime-local" name="slotLocal" required defaultValue={v.slotLocal} className={inputClass} />
      </Field>
      <Field label="Catégorie Google suggérée" help="En anglais, comme dans Google (ex. Concrete contractor).">
        <input name="suggestedCategory" required defaultValue={v.suggestedCategory ?? defaultCategory} className={inputClass} />
      </Field>
      <Field label="Consignes pour l’agent" help="En anglais, une consigne par ligne : l’agent les lit telles quelles.">
        <textarea name="instructions" rows={4} maxLength={1000} defaultValue={v.instructions} className={inputClass} />
      </Field>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <SubmitButton>Publier la mission</SubmitButton>
    </form>
  )
}
