import type { FraudType, PhotoCategory } from '@prisma/client'
import { distanceMeters } from '@/modules/geo/distance'

const H = 3_600_000
export const CHECKIN_MAX_METERS = 150
export const CHECKIN_MAX_ACCURACY_METERS = 100
export const LATE_SYNC_HOURS = 12
export const EXIF_MAX_HOURS_BEFORE = 2
export const EXIF_MAX_METERS = 500
export const LOW_RATING_MAX = 2
// Photos censées être prises pendant la visite (un chantier ancien peut l'être bien avant).
const ON_SITE: readonly PhotoCategory[] = ['LOGO', 'VEHICLE', 'TEAM']

export interface FraudInput {
  pro: { lat: number | null; lng: number | null }
  checkin: { lat: number; lng: number; accuracy: number; clientAt: Date; receivedAt: Date } | null
  photos: { category: PhotoCategory; exifTakenAt: Date | null; exifLat: number | null; exifLng: number | null }[]
  // Missions VALIDATED d'AUTRES pros (proId différent) ayant le même téléphone ou la même adresse normalisée.
  // Le service exclut le pro lui-même : sinon une mission de retour se signalerait toujours.
  duplicateValidatedCount: number
  proRating: number | null
  proDenied: boolean
}

export interface FraudFinding { type: FraudType; detail: string }

/** Alertes, jamais des blocages : l'admin décide (spec §10). */
export function computeFraudFlags(i: FraudInput): FraudFinding[] {
  const out: FraudFinding[] = []
  const proPoint = i.pro.lat != null && i.pro.lng != null ? { lat: i.pro.lat, lng: i.pro.lng } : null

  if (i.checkin) {
    const d = proPoint ? Math.round(distanceMeters(i.checkin, proPoint)) : null
    if (d != null && d > CHECKIN_MAX_METERS) out.push({ type: 'CHECKIN_FAR', detail: `Check-in à ${d} m de l'adresse du pro` })
    else if (i.checkin.accuracy > CHECKIN_MAX_ACCURACY_METERS) out.push({ type: 'CHECKIN_FAR', detail: `Précision GPS de ${Math.round(i.checkin.accuracy)} m` })
    const lagH = (i.checkin.receivedAt.getTime() - i.checkin.clientAt.getTime()) / H
    if (lagH > LATE_SYNC_HOURS) out.push({ type: 'LATE_SYNC', detail: `Check-in reçu ${Math.round(lagH)} h après avoir été fait` })

    const suspicious = i.photos.filter((p) => {
      if (!ON_SITE.includes(p.category)) return false
      const tooOld = p.exifTakenAt != null && i.checkin!.clientAt.getTime() - p.exifTakenAt.getTime() > EXIF_MAX_HOURS_BEFORE * H
      const tooFar = p.exifLat != null && p.exifLng != null && proPoint != null && distanceMeters({ lat: p.exifLat, lng: p.exifLng }, proPoint) > EXIF_MAX_METERS
      return tooOld || tooFar
    })
    if (suspicious.length > 0) out.push({ type: 'PHOTO_EXIF_MISMATCH', detail: `${suspicious.length} photo(s) prise(s) avant la visite ou ailleurs` })
  }

  if (i.duplicateValidatedCount > 0) out.push({ type: 'DUPLICATE_PRO', detail: `${i.duplicateValidatedCount} autre(s) visite(s) validée(s) pour ce téléphone ou cette adresse` })
  if (i.proDenied) out.push({ type: 'PRO_DENIED', detail: 'Le pro répond que personne n’est venu' })
  if (i.proRating != null && i.proRating <= LOW_RATING_MAX) out.push({ type: 'LOW_PRO_RATING', detail: `Note du pro : ${i.proRating}/5` })
  return out
}

const ABBREVIATIONS: Record<string, string> = {
  street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', boulevard: 'blvd', lane: 'ln', court: 'ct',
  place: 'pl', parkway: 'pkwy', highway: 'hwy', suite: 'ste', apartment: 'apt', unit: 'unit',
  north: 'n', south: 's', east: 'e', west: 'w',
}

/** Adresse comparable : minuscules, sans ponctuation, abréviations USPS courantes, suivie du ZIP. */
export function normalizeAddress(address: string, zip: string): string {
  const words = address
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (Object.hasOwn(ABBREVIATIONS, w) ? ABBREVIATIONS[w] : w))
  return `${words.join(' ')}|${zip.trim()}`
}
