'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/app/admin/_components/action-form'
import { Field, Table, inputClass, tdClass } from '@/app/admin/_components/ui'
import { importProsAction } from '../actions'
import type { ImportState } from '../csv-input'

const EXAMPLE = 'business_name,contact_name,phone,address,city,state,zip,trade\nDelgado Concrete,Frank Delgado,(617) 555-0142,120 Tremont St,Boston,MA,02108,Concrete contractor'

export function ImportForm() {
  const [state, formAction] = useActionState(importProsAction, {} as ImportState)
  const r = state.result
  return (
    <div className="space-y-6">
      <form action={formAction} className="max-w-3xl space-y-4">
        <Field label="Fichier CSV">
          <input type="file" name="file" accept=".csv,text/csv" className="text-sm" />
        </Field>
        <Field label="… ou contenu collé" help="Première ligne : les noms de colonnes.">
          <textarea name="csv" rows={8} placeholder={EXAMPLE} className={`${inputClass} font-mono`} />
        </Field>
        {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
        <SubmitButton>Importer</SubmitButton>
      </form>
      {r && (
        <section className="max-w-3xl space-y-3 text-sm">
          <p>
            <strong>{r.created}</strong> pro(s) créé(s)
            {r.withoutCoords > 0 && <>, dont <strong>{r.withoutCoords}</strong> sans coordonnées (adresse introuvable : à compléter depuis leur fiche)</>}.
          </p>
          {r.errors.length > 0 && (
            <Table head={['Ligne', 'Problème']}>
              {r.errors.map((e, i) => <tr key={i}><td className={tdClass}>{e.line}</td><td className={tdClass}>{e.message}</td></tr>)}
            </Table>
          )}
        </section>
      )}
    </div>
  )
}
