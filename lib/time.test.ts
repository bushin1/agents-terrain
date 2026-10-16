import { describe, expect, it } from 'vitest'
import { defaultTimeZoneForState, formatSlot, toZonedLocalInput, zonedLocalToUtc } from './time'

describe('zonedLocalToUtc', () => {
  it('heure d’été à New York (UTC−4)', () => {
    expect(zonedLocalToUtc('2026-07-01T10:00', 'America/New_York').toISOString()).toBe('2026-07-01T14:00:00.000Z')
  })
  it('heure d’hiver à New York (UTC−5), après le changement du 1er novembre 2026', () => {
    expect(zonedLocalToUtc('2026-11-03T10:00', 'America/New_York').toISOString()).toBe('2026-11-03T15:00:00.000Z')
  })
  it('Phoenix ne change pas d’heure (UTC−7)', () => {
    expect(zonedLocalToUtc('2026-07-01T09:30', 'America/Phoenix').toISOString()).toBe('2026-07-01T16:30:00.000Z')
  })
  it('refuse un format invalide', () => {
    expect(() => zonedLocalToUtc('2026-07-01 10:00', 'America/New_York')).toThrow()
  })
})

describe('formatSlot', () => {
  it('affiche le créneau dans le fuseau du pro', () => {
    const s = formatSlot(new Date('2026-07-01T14:00:00Z'), 'America/New_York')
    expect(s).toContain('10:00')
    expect(s).toContain('Jul')
  })
})

describe('toZonedLocalInput', () => {
  it('repasse un instant UTC à l’heure locale du pro, aller-retour exact', () => {
    const utc = new Date('2026-11-03T15:00:00Z')
    expect(toZonedLocalInput(utc, 'America/New_York')).toBe('2026-11-03T10:00')
    expect(zonedLocalToUtc(toZonedLocalInput(utc, 'America/Chicago'), 'America/Chicago').toISOString()).toBe(utc.toISOString())
  })
})

describe('defaultTimeZoneForState', () => {
  it('propose un fuseau par État', () => {
    expect(defaultTimeZoneForState('MA')).toBe('America/New_York')
    expect(defaultTimeZoneForState('tx')).toBe('America/Chicago')
    expect(defaultTimeZoneForState('AZ')).toBe('America/Phoenix')
  })
  it('renvoie null pour un code inconnu', () => {
    expect(defaultTimeZoneForState('ZZ')).toBeNull()
  })
})
