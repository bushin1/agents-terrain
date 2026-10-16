import { ActionForm, SubmitButton } from '@/app/admin/_components/action-form'
import { inputClass } from '@/app/admin/_components/ui'
import { cancelMissionAction } from './actions'

/** Annulation d'une mission : motif obligatoire, option « pro perdu » (annule aussi ses autres missions). */
export function CancelMissionForm({ missionId }: { missionId: string }) {
  return (
    <details className="mt-1 text-sm">
      <summary className="cursor-pointer text-red-700">Annuler la mission</summary>
      <ActionForm action={cancelMissionAction} className="mt-2 space-y-2">
        <input type="hidden" name="missionId" value={missionId} />
        <input name="reason" required placeholder="Motif (ex. le pro a annulé par SMS)" aria-label="Motif de l’annulation" className={inputClass} />
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" name="markProLost" /> Marquer le pro perdu
        </label>
        <SubmitButton tone="danger">Confirmer l’annulation</SubmitButton>
      </ActionForm>
    </details>
  )
}
