'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { ActionState } from '@/app/admin/_lib/forms'

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>

const TONES = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800',
  secondary: 'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50',
  danger: 'bg-red-700 text-white hover:bg-red-800',
}

/** Bouton d'envoi, désactivé pendant l'exécution de la server action (évite le double clic). */
export function SubmitButton({ tone = 'primary', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${TONES[tone]}`}>
      {pending ? 'Patientez…' : children}
    </button>
  )
}

/** Formulaire relié à une server action : affiche le message d'erreur ou de succès qu'elle renvoie. */
export function ActionForm({ action, className = 'flex flex-wrap items-center gap-2', children }: { action: FormAction; className?: string; children: React.ReactNode }) {
  const [state, formAction] = useActionState(action, {})
  return (
    <form action={formAction}>
      <div className={className}>{children}</div>
      {state.error && <p role="alert" className="mt-1 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="mt-1 text-sm text-emerald-700">{state.ok}</p>}
    </form>
  )
}
