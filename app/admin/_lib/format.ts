import type { MissionStatus } from '@prisma/client'

// Formats et liens du back-office. Les créneaux s'affichent à l'heure du pro (formatSlot, lib/time.ts) ;
// les horodatages internes (création, soumission, journal) à l'heure de Paris, celle de l'équipe.

const DOLLARS = /^\d{1,6}(\.\d{1,2})?$/

/** Saisie en dollars (« 40 », « 40.5 », « 40,50 », « $15 ») → cents ; null si illisible ou négative. */
export function dollarsToCents(raw: string): number | null {
  const v = raw.trim().replace(/^\$/, '').trim().replace(',', '.')
  if (!DOLLARS.test(v)) return null
  const [whole, decimals = ''] = v.split('.')
  return Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
}

/** 13650 → « 136,50 $ » */
export function formatUsd(cents: number): string {
  const abs = Math.abs(Math.round(cents))
  return `${cents < 0 ? '-' : ''}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')} $`
}

/** 4050 → « 40.50 » (valeur d'un champ de saisie en dollars) */
export function centsToDollarsInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

function zonedParts(date: Date, timeZone: string): Record<string, string> {
  const out: Record<string, string> = {}
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value
  return out
}

/** « 16/10/2026 14:05 », heure de Paris. */
export function formatParis(date: Date): string {
  const p = zonedParts(date, 'Europe/Paris')
  return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

/** « 16/10 10:00:05 » dans le fuseau donné (horodatages des étapes et des photos). */
export function formatStamp(value: Date | string, timeZone: string): string {
  const p = zonedParts(new Date(value), timeZone)
  return `${p.day}/${p.month} ${p.hour}:${p.minute}:${p.second}`
}

export function mapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** Une visite a été soumise : la mission se consulte dans la validation (lecture seule hors SUBMITTED). */
export function isReviewable(status: MissionStatus): boolean {
  return status === 'SUBMITTED' || status === 'NEEDS_FIX' || status === 'VALIDATED' || status === 'REJECTED'
}

/** Statuts qu'une annulation par l'équipe accepte (machine d'état, spec §7.2). */
export function isCancellable(status: MissionStatus): boolean {
  return status === 'OPEN' || status === 'ACCEPTED' || status === 'NEEDS_FIX'
}

export function missionHref(m: { id: string; proId: string | null; status: MissionStatus }): string {
  if (isReviewable(m.status)) return `/admin/review/${m.id}`
  if (m.proId) return `/admin/pros/${m.proId}#mission-${m.id}`
  return `/admin/missions`
}
