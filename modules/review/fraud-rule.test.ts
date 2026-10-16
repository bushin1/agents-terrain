import { describe, expect, it } from 'vitest'
import { computeFraudFlags, normalizeAddress, type FraudInput } from './fraud-rule'

const H = 3_600_000
const checkinAt = new Date('2026-10-16T14:00:00Z')
const pro = { lat: 42.3564, lng: -71.0621 }
const clean: FraudInput = {
  pro,
  checkin: { lat: 42.3565, lng: -71.0622, accuracy: 15, clientAt: checkinAt, receivedAt: new Date(checkinAt.getTime() + 5000) },
  photos: [{ category: 'LOGO', exifTakenAt: new Date(checkinAt.getTime() + 10 * 60_000), exifLat: 42.3564, exifLng: -71.0621 }],
  duplicateValidatedCount: 0,
  proRating: 5,
  proDenied: false,
}
const types = (i: FraudInput) => computeFraudFlags(i).map((f) => f.type).sort()

describe('computeFraudFlags (spec §10)', () => {
  it('aucune alerte pour une visite propre', () => {
    expect(computeFraudFlags(clean)).toEqual([])
  })
  it('CHECKIN_FAR : à plus de 150 m, ou GPS imprécis', () => {
    expect(types({ ...clean, checkin: { ...clean.checkin!, lat: 42.3600 } })).toEqual(['CHECKIN_FAR']) // ≈ 400 m
    expect(types({ ...clean, checkin: { ...clean.checkin!, accuracy: 150 } })).toEqual(['CHECKIN_FAR'])
  })
  it('LATE_SYNC : reçu plus de 12 h après', () => {
    expect(types({ ...clean, checkin: { ...clean.checkin!, receivedAt: new Date(checkinAt.getTime() + 13 * H) } })).toEqual(['LATE_SYNC'])
  })
  it('PHOTO_EXIF_MISMATCH : photo de logo prise plus de 2 h avant le check-in, ou à plus de 500 m', () => {
    const old = { ...clean.photos[0], exifTakenAt: new Date(checkinAt.getTime() - 3 * H) }
    expect(types({ ...clean, photos: [old] })).toEqual(['PHOTO_EXIF_MISMATCH'])
    const far = { ...clean.photos[0], exifLat: 42.3700 } // ≈ 1,5 km
    expect(types({ ...clean, photos: [far] })).toEqual(['PHOTO_EXIF_MISMATCH'])
  })
  it('une vieille photo de chantier (JOB) ou sans EXIF n’est pas suspecte', () => {
    const job = { category: 'JOB' as const, exifTakenAt: new Date(checkinAt.getTime() - 300 * H), exifLat: null, exifLng: null }
    const noExif = { category: 'TEAM' as const, exifTakenAt: null, exifLat: null, exifLng: null }
    expect(types({ ...clean, photos: [job, noExif] })).toEqual([])
  })
  it('DUPLICATE_PRO, LOW_PRO_RATING, PRO_DENIED', () => {
    expect(types({ ...clean, duplicateValidatedCount: 1 })).toEqual(['DUPLICATE_PRO'])
    expect(types({ ...clean, proRating: 2 })).toEqual(['LOW_PRO_RATING'])
    expect(types({ ...clean, proRating: 3 })).toEqual([])
    expect(types({ ...clean, proRating: null, proDenied: true })).toEqual(['PRO_DENIED'])
  })
  it('GPS imprécis signalé même sans coordonnées du pro', () => {
    expect(types({ ...clean, pro: { lat: null, lng: null }, checkin: { ...clean.checkin!, accuracy: 500 } })).toEqual(['CHECKIN_FAR'])
  })
  it('sans check-in, aucune alerte de position', () => {
    expect(types({ ...clean, checkin: null })).toEqual([])
  })
})

describe('normalizeAddress', () => {
  it('rapproche deux écritures de la même adresse', () => {
    expect(normalizeAddress('120 Tremont Street, Suite 4', '02108')).toBe(normalizeAddress('120 tremont st. ste 4', '02108'))
  })
  it('distingue deux codes postaux', () => {
    expect(normalizeAddress('120 Tremont St', '02108')).not.toBe(normalizeAddress('120 Tremont St', '02109'))
  })
})
