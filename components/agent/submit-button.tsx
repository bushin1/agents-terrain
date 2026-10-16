'use client'
import { useFormStatus } from 'react-dom'

/** Bouton d'envoi qui se désactive pendant l'envoi (évite les doubles clics). */
export function SubmitButton({ children, className = 'mc-btn mc-btn--primary mc-btn--lg mc-btn--block', disabled }: { children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={disabled || pending} aria-busy={pending}>
      {pending ? 'Please wait…' : children}
    </button>
  )
}
