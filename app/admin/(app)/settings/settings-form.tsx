'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/app/admin/_components/action-form'
import { Field, inputClass } from '@/app/admin/_components/ui'
import { LEVEL_LABELS, TIER_LABELS } from '@/app/admin/_lib/labels'
import { saveSettingsAction } from './actions'
import { LEVEL_NAMES, TIER_KEYS } from './settings-form-data'

const box = 'rounded-lg border border-gray-200 bg-white p-4'

export function SettingsForm({ defaults }: { defaults: Record<string, string> }) {
  const [state, formAction] = useActionState(saveSettingsAction, {})
  const v: Record<string, string | undefined> = { ...defaults, ...state.values }
  const err = state.fieldErrors ?? {}
  const num = (name: string, label: string) => (
    <Field label={label} error={err[name]}>
      <input name={name} inputMode="numeric" required defaultValue={v[name]} className={`${inputClass} w-28`} />
    </Field>
  )
  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <fieldset className={box}>
        <legend className="px-1 font-semibold">Montants des paliers (dollars)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {TIER_KEYS.map((tier) => (
            <Field key={tier} label={TIER_LABELS[tier]} error={err[`tier_${tier}`]}>
              <input name={`tier_${tier}`} inputMode="decimal" required defaultValue={v[`tier_${tier}`]} className={inputClass} />
            </Field>
          ))}
        </div>
      </fieldset>
      <fieldset className={box}>
        <legend className="px-1 font-semibold">Niveaux</legend>
        {err.levels && <p role="alert" className="mb-2 text-sm text-red-700">{err.levels}</p>}
        <div className="space-y-3">
          {LEVEL_NAMES.map((name, i) => (
            <div key={name} className="grid grid-cols-[6rem_1fr_1fr] items-end gap-4">
              <p className="pb-2 text-sm font-medium">{LEVEL_LABELS[name]}</p>
              {num(`level_${i}_minValidated`, 'À partir de (visites validées)')}
              {num(`level_${i}_bonusPct`, 'Bonus (%)')}
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className={box}>
        <legend className="px-1 font-semibold">Diffusion</legend>
        {num('widenRadiusMiles', 'Rayon du bouton « Élargir » (miles)')}
      </fieldset>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-sm text-emerald-700">{state.ok}</p>}
      <SubmitButton>Enregistrer</SubmitButton>
    </form>
  )
}
