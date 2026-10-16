'use client'

import { useActionState, useState } from 'react'
import { SubmitButton, type FormAction } from '@/app/admin/_components/action-form'
import { Field, inputClass } from '@/app/admin/_components/ui'
import { US_TIME_ZONES, defaultTimeZoneForState } from '@/lib/time'

export function ProForm({ action, initial, submitLabel }: { action: FormAction; initial: Record<string, string>; submitLabel: string }) {
  const [state, formAction] = useActionState(action, {})
  const values: Record<string, string | undefined> = { ...initial, ...state.values }
  const errors = state.fieldErrors ?? {}
  const [stateCode, setStateCode] = useState(values.state ?? '')
  const proposedZone = defaultTimeZoneForState(stateCode)

  const text = (name: string, label: string, opts: { required?: boolean; placeholder?: string; help?: string } = {}) => (
    <Field label={label} help={opts.help} error={errors[name]}>
      <input name={name} required={opts.required} placeholder={opts.placeholder} defaultValue={values[name]} className={inputClass} />
    </Field>
  )

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      {initial.proId && <input type="hidden" name="proId" value={initial.proId} />}
      {state.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {text('businessName', 'Entreprise', { required: true, placeholder: 'Delgado Concrete & Masonry LLC' })}
        {text('contactName', 'Contact', { placeholder: 'Frank Delgado' })}
        {text('phone', 'Téléphone (US)', { required: true, placeholder: '(617) 555-0142' })}
        {text('trade', 'Métier', { required: true, placeholder: 'Concrete contractor', help: 'En anglais ; proposé comme catégorie Google des missions.' })}
      </div>
      <div className="grid gap-4 sm:grid-cols-[2fr_1fr_5rem_7rem]">
        {text('address', 'Adresse', { required: true, placeholder: '120 Tremont Street' })}
        {text('city', 'Ville', { required: true, placeholder: 'Boston' })}
        <Field label="État" error={errors.state}>
          <input name="state" required maxLength={2} placeholder="MA" defaultValue={values.state} onChange={(e) => setStateCode(e.target.value)} className={`${inputClass} uppercase`} />
        </Field>
        {text('zip', 'ZIP', { required: true, placeholder: '02108' })}
      </div>
      <Field label="Fuseau horaire" error={errors.timeZone} help="Les créneaux des missions se saisissent à l’heure de ce fuseau.">
        <select name="timeZone" defaultValue={values.timeZone ?? ''} className={inputClass}>
          <option value="">{proposedZone ? `Selon l’État (${proposedZone})` : 'Selon l’État'}</option>
          {US_TIME_ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {text('lat', 'Latitude', { placeholder: '42.3564', help: 'Seulement si l’adresse est introuvable. Videz les deux champs pour regéocoder une adresse modifiée.' })}
        {text('lng', 'Longitude', { placeholder: '-71.0621' })}
      </div>
      {text('existingPlaceId', 'Place ID d’une fiche existante', { placeholder: 'ChIJ…', help: 'Si le pro a déjà une fiche publique sur Maps : la mission demandera de la revendiquer.' })}
      <Field label="Notes d’appel" error={errors.notes}>
        <textarea name="notes" rows={4} maxLength={2000} defaultValue={values.notes} className={inputClass} />
      </Field>
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  )
}
