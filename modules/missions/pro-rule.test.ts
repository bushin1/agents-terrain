import { describe, expect, it } from 'vitest'
import { STATUSES_CANCELLED_ON_LOST, canCreateVisitFor, canSetProStatusManually, proStatusAfter } from './pro-rule'

describe('proStatusAfter (spec §7.3)', () => {
  it('création d’une mission VISIT : AGREED → MISSION_OPEN', () => {
    expect(proStatusAfter('AGREED', { kind: 'CREATED', missionType: 'VISIT' })).toBe('MISSION_OPEN')
  })
  it('visite validée → VISITED', () => {
    expect(proStatusAfter('MISSION_OPEN', { kind: 'VALIDATED', missionType: 'VISIT' })).toBe('VISITED')
  })
  it('visite rejetée ou annulée → AGREED, ou LOST si demandé', () => {
    expect(proStatusAfter('MISSION_OPEN', { kind: 'REJECTED', missionType: 'VISIT' })).toBe('AGREED')
    expect(proStatusAfter('MISSION_OPEN', { kind: 'CANCELLED', missionType: 'VISIT' })).toBe('AGREED')
    expect(proStatusAfter('MISSION_OPEN', { kind: 'CANCELLED', missionType: 'VISIT', markLost: true })).toBe('LOST')
  })
  it('un pro LOST reste LOST, même si sa visite soumise est validée', () => {
    expect(proStatusAfter('LOST', { kind: 'VALIDATED', missionType: 'VISIT' })).toBe('LOST')
  })
  it('une mission de retour ne change jamais le statut du pro', () => {
    for (const kind of ['CREATED', 'VALIDATED', 'REJECTED', 'CANCELLED'] as const) {
      expect(proStatusAfter('VISITED', { kind, missionType: 'RETURN_VISIT' })).toBe('VISITED')
    }
  })
})

describe('canSetProStatusManually', () => {
  it('le setter passe un pro de TO_CALL à AGREED et inversement', () => {
    expect(canSetProStatusManually('TO_CALL', 'AGREED')).toBe(true)
    expect(canSetProStatusManually('AGREED', 'TO_CALL')).toBe(true)
  })
  it('LOST depuis n’importe quel statut sauf LOST', () => {
    expect(canSetProStatusManually('VISITED', 'LOST')).toBe(true)
    expect(canSetProStatusManually('LOST', 'LOST')).toBe(false)
  })
  it('les autres statuts ne se posent pas à la main', () => {
    expect(canSetProStatusManually('AGREED', 'VISITED')).toBe(false)
    expect(canSetProStatusManually('MISSION_OPEN', 'AGREED')).toBe(false)
  })
})

describe('canCreateVisitFor', () => {
  it('seulement pour un pro AGREED', () => {
    expect(canCreateVisitFor('AGREED')).toBe(true)
    expect(canCreateVisitFor('TO_CALL')).toBe(false)
    expect(canCreateVisitFor('VISITED')).toBe(false)
  })
})

describe('STATUSES_CANCELLED_ON_LOST', () => {
  it('annule les missions encore en cours', () => {
    expect([...STATUSES_CANCELLED_ON_LOST].sort()).toEqual(['ACCEPTED', 'NEEDS_FIX', 'OPEN'])
  })
})
