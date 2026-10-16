import { describe, expect, it } from 'vitest'
import { centsToDollarsInput, dollarsToCents, formatParis, formatStamp, formatUsd, mapsUrl, missionHref } from './format'

describe('dollarsToCents', () => {
  it.each([
    ['40', 4000],
    ['40.5', 4050],
    ['40,50', 4050],
    [' $15 ', 1500],
    ['0.07', 7],
  ])('« %s » → %i cents', (input, cents) => {
    expect(dollarsToCents(input)).toBe(cents)
  })
  it.each(['', 'abc', '-5', '1.234', '1e3', '1234567'])('refuse « %s »', (input) => {
    expect(dollarsToCents(input)).toBeNull()
  })
})

describe('montants', () => {
  it('affiche en dollars à la française, et en valeur de champ de saisie', () => {
    expect(formatUsd(13650)).toBe('136,50 $')
    expect(formatUsd(7)).toBe('0,07 $')
    expect(centsToDollarsInput(4050)).toBe('40.50')
    expect(centsToDollarsInput(7)).toBe('0.07')
  })
})

describe('dates', () => {
  it('horodatage interne à l’heure de Paris (été puis hiver)', () => {
    expect(formatParis(new Date('2026-10-16T12:05:00Z'))).toBe('16/10/2026 14:05')
    expect(formatParis(new Date('2026-12-01T08:00:00Z'))).toBe('01/12/2026 09:00')
  })
  it('horodatage d’étape à la seconde, à l’heure du pro', () => {
    expect(formatStamp('2026-10-16T14:00:05.000Z', 'America/New_York')).toBe('16/10 10:00:05')
    expect(formatStamp(new Date('2026-10-16T14:00:05Z'), 'America/Los_Angeles')).toBe('16/10 07:00:05')
  })
})

describe('liens', () => {
  it('Google Maps vers des coordonnées', () => {
    expect(mapsUrl(42.3567, -71.0624)).toBe('https://www.google.com/maps/search/?api=1&query=42.3567,-71.0624')
  })
  it('une visite soumise ou décidée s’ouvre dans la validation, sinon sur la fiche du pro', () => {
    expect(missionHref({ id: 'm1', proId: 'p1', status: 'SUBMITTED' })).toBe('/admin/review/m1')
    expect(missionHref({ id: 'm1', proId: 'p1', status: 'VALIDATED' })).toBe('/admin/review/m1')
    expect(missionHref({ id: 'm1', proId: 'p1', status: 'OPEN' })).toBe('/admin/pros/p1#mission-m1')
  })
})
