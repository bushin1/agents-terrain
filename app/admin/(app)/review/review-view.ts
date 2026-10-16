import { STEP_LABELS, VALUE_LABELS } from '@/app/admin/_lib/labels'
import type { StepsData } from '@/modules/missions'

export interface StepRow { name: string; label: string; clientAt: string; receivedAt: string; detail: string }

type StepKey = keyof StepsData
const ORDER: StepKey[] = ['checkin', 'consent', 'profile', 'invite', 'verification', 'checkout']
const label = (value: string) => VALUE_LABELS[value] ?? value

const DETAILS: { [K in StepKey]: (s: NonNullable<StepsData[K]>) => string } = {
  checkin: (c) => `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)} (± ${Math.round(c.accuracy)} m)`,
  consent: (c) => `Signé par ${c.signerName} (texte ${c.textVersion})`,
  profile: (p) => `${p.listingName} · ${p.category} · ${p.city} ${p.zip} · ${label(p.mode)}`,
  invite: (i) => label(i.result),
  verification: (v) => (v.method ? `${label(v.result)} : ${v.method}` : label(v.result)),
  checkout: () => '',
}

/** Lignes du tableau « Étapes » : horodatages téléphone et serveur, et un résumé lisible de chaque étape. */
export function stepRows(steps: StepsData): StepRow[] {
  const rows: StepRow[] = []
  for (const name of ORDER) {
    const s = steps[name]
    if (!s) continue
    const detail = (DETAILS[name] as (step: typeof s) => string)(s)
    rows.push({ name, label: STEP_LABELS[name], clientAt: s.clientAt, receivedAt: s.receivedAt, detail })
  }
  return rows
}

/** Réponse du pro au SMS après visite (la note ne vient jamais de l'agent, spec §10). */
export function proReplyText(m: { postVisitSmsAt: Date | null; proDenied: boolean; proRating: number | null }): string {
  if (!m.postVisitSmsAt) return 'SMS après visite pas encore envoyé.'
  if (m.proDenied) return 'Le pro a répondu NO : il conteste la visite.'
  if (m.proRating != null) return `Note du pro : ${m.proRating}/5`
  return 'Pas encore de réponse du pro.'
}
