import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/modules/settings/defaults'
import { checkEligibility, computeAmount, levelFor } from './ledger-rule'

const settings = DEFAULT_SETTINGS
const DAY = 86_400_000
const now = new Date('2026-10-16T12:00:00Z')

describe('levelFor (spec §6.2)', () => {
  it.each([
    [0, 'BRONZE'], [4, 'BRONZE'], [5, 'SILVER'], [14, 'SILVER'], [15, 'GOLD'], [100, 'GOLD'],
  ] as const)('%i missions validées → %s', (n, level) => {
    expect(levelFor(n, settings.levels).name).toBe(level)
  })
})

describe('computeAmount', () => {
  it('VISIT au niveau Bronze', () => {
    expect(computeAmount({ tier: 'VISIT', validatedCount: 1, urgencyBonusCents: 0, settings }))
      .toEqual({ baseAmountCents: 4000, levelBonusPct: 0, amountCents: 4000 })
  })
  it('VISIT au niveau Silver (5e mission validée comprise)', () => {
    expect(computeAmount({ tier: 'VISIT', validatedCount: 5, urgencyBonusCents: 0, settings }).amountCents).toBe(4400)
  })
  it('LIVE au niveau Gold', () => {
    expect(computeAmount({ tier: 'LIVE', validatedCount: 15, urgencyBonusCents: 0, settings }).amountCents).toBe(3000)
  })
  it('URGENCY : montant de la mission, sans bonus de niveau', () => {
    expect(computeAmount({ tier: 'URGENCY', validatedCount: 20, urgencyBonusCents: 1500, settings }))
      .toEqual({ baseAmountCents: 1500, levelBonusPct: 0, amountCents: 1500 })
  })
  it('arrondit le bonus au cent le plus proche', () => {
    const custom = { ...settings, tierAmountsCents: { ...settings.tierAmountsCents, RETURN_VISIT: 3333 } }
    expect(computeAmount({ tier: 'RETURN_VISIT', validatedCount: 5, urgencyBonusCents: 0, settings: custom }).amountCents).toBe(3666)
  })
})

describe('checkEligibility (spec §6.3)', () => {
  const visit = { type: 'VISIT' as const, status: 'VALIDATED' as const, urgencyBonusCents: 0, validatedAt: new Date(now.getTime() - 10 * DAY) }

  it('VISIT : mission VISIT validée', () => {
    expect(checkEligibility({ tier: 'VISIT', mission: visit, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'VISIT', mission: { ...visit, status: 'SUBMITTED' }, now }).ok).toBe(false)
    expect(checkEligibility({ tier: 'VISIT', mission: { ...visit, type: 'RETURN_VISIT' }, now }).ok).toBe(false)
  })
  it('RETURN_VISIT : mission de retour validée', () => {
    expect(checkEligibility({ tier: 'RETURN_VISIT', mission: { ...visit, type: 'RETURN_VISIT' }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'RETURN_VISIT', mission: visit, now }).ok).toBe(false)
  })
  it('URGENCY : seulement avec un bonus', () => {
    expect(checkEligibility({ tier: 'URGENCY', mission: { ...visit, urgencyBonusCents: 1000 }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'URGENCY', mission: visit, now }).ok).toBe(false)
  })
  it('LIVE : dans les 60 jours après la validation de la visite', () => {
    expect(checkEligibility({ tier: 'LIVE', mission: { ...visit, validatedAt: new Date(now.getTime() - 60 * DAY) }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'LIVE', mission: { ...visit, validatedAt: new Date(now.getTime() - 61 * DAY) }, now }).ok).toBe(false)
  })
  it('CLIENT : dans les 90 jours', () => {
    expect(checkEligibility({ tier: 'CLIENT', mission: { ...visit, validatedAt: new Date(now.getTime() - 89 * DAY) }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'CLIENT', mission: { ...visit, validatedAt: new Date(now.getTime() - 91 * DAY) }, now }).ok).toBe(false)
  })
  it('LIVE et CLIENT exigent la mission VISIT d’origine', () => {
    expect(checkEligibility({ tier: 'LIVE', mission: { ...visit, type: 'RETURN_VISIT' }, now }).ok).toBe(false)
    expect(checkEligibility({ tier: 'CLIENT', mission: { ...visit, status: 'REJECTED' }, now }).ok).toBe(false)
  })
})
