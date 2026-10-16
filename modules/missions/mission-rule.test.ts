import { describe, expect, it } from 'vitest'
import { canRelease, canTransitionMission, needsFixExpired, noShowAction, reminderDue } from './mission-rule'

const H = 3_600_000
const now = new Date('2026-10-16T12:00:00Z')
const at = (hours: number) => new Date(now.getTime() + hours * H)

describe('canTransitionMission (spec §7.2)', () => {
  it.each([
    ['OPEN', 'ACCEPTED'], ['OPEN', 'CANCELLED'],
    ['ACCEPTED', 'SUBMITTED'], ['ACCEPTED', 'OPEN'], ['ACCEPTED', 'CANCELLED'],
    ['SUBMITTED', 'VALIDATED'], ['SUBMITTED', 'NEEDS_FIX'], ['SUBMITTED', 'REJECTED'],
    ['NEEDS_FIX', 'SUBMITTED'], ['NEEDS_FIX', 'REJECTED'], ['NEEDS_FIX', 'CANCELLED'],
  ] as const)('%s → %s autorisé', (from, to) => {
    expect(canTransitionMission(from, to)).toBe(true)
  })
  it.each([
    ['OPEN', 'SUBMITTED'], ['SUBMITTED', 'CANCELLED'], ['VALIDATED', 'REJECTED'], ['REJECTED', 'OPEN'], ['CANCELLED', 'OPEN'],
  ] as const)('%s → %s refusé', (from, to) => {
    expect(canTransitionMission(from, to)).toBe(false)
  })
})

describe('canRelease', () => {
  it('possible jusqu’à 24 h avant le créneau', () => {
    expect(canRelease(at(24), now)).toBe(true)
    expect(canRelease(at(23.9), now)).toBe(false)
  })
})

describe('needsFixExpired', () => {
  it('7 jours sans nouvelle soumission', () => {
    expect(needsFixExpired(new Date(now.getTime() - 7 * 24 * H), now)).toBe(true)
    expect(needsFixExpired(new Date(now.getTime() - 6.9 * 24 * H), now)).toBe(false)
  })
})

describe('noShowAction (spec §4.5)', () => {
  const base = { hasCheckin: false, noShowSmsAt: null }
  it('rien avant 2 h après le créneau, ou si le check-in est reçu', () => {
    expect(noShowAction({ ...base, slotAt: at(-1.9) }, now)).toBe('NONE')
    expect(noShowAction({ ...base, slotAt: at(-30), hasCheckin: true }, now)).toBe('NONE')
  })
  it('SMS à l’agent à partir de 2 h, une seule fois', () => {
    expect(noShowAction({ ...base, slotAt: at(-2) }, now)).toBe('SMS')
    expect(noShowAction({ ...base, slotAt: at(-3), noShowSmsAt: at(-1) }, now)).toBe('NONE')
  })
  it('remise en OPEN à partir de 24 h', () => {
    expect(noShowAction({ ...base, slotAt: at(-24) }, now)).toBe('RELEASE')
    expect(noShowAction({ ...base, slotAt: at(-30), noShowSmsAt: at(-28) }, now)).toBe('RELEASE')
  })
})

describe('reminderDue', () => {
  const base = { status: 'ACCEPTED' as const, reminderSentAt: null, acceptedAt: at(-72) }
  it('dans les 24 h avant le créneau', () => {
    expect(reminderDue({ ...base, slotAt: at(20) }, now)).toBe(true)
    expect(reminderDue({ ...base, slotAt: at(25) }, now)).toBe(false)
  })
  it('jamais deux fois, jamais après le créneau, seulement si ACCEPTED', () => {
    expect(reminderDue({ ...base, slotAt: at(20), reminderSentAt: at(-1) }, now)).toBe(false)
    expect(reminderDue({ ...base, slotAt: at(-1) }, now)).toBe(false)
    expect(reminderDue({ ...base, status: 'OPEN', slotAt: at(20) }, now)).toBe(false)
  })
  it('pas de rappel si la mission a été acceptée moins de 24 h avant le créneau', () => {
    expect(reminderDue({ ...base, acceptedAt: at(-1), slotAt: at(20) }, now)).toBe(false)
  })
})
