import { describe, expect, it } from 'vitest'
import {
  maxTasksPerDay,
  allowedTargetTiers,
  isWarmingUp,
  checkTaskEligibility,
  computeTrustScore,
  shouldPromote,
  isTaskExpired,
} from './task-rule'

const QT_SETTINGS = {
  starterMaxPerDay: 3,
  bronzeMaxPerDay: 5,
  silverMaxPerDay: 10,
  goldMaxPerDay: 15,
  warmupCount: 15,
  survivalCheckDays: 14,
  expirationHours: 2,
  cooldownMinutes: 15,
  cashoutThresholdCents: 3000,
}

describe('maxTasksPerDay', () => {
  it('returns correct limits per level', () => {
    expect(maxTasksPerDay('STARTER', QT_SETTINGS)).toBe(3)
    expect(maxTasksPerDay('BRONZE', QT_SETTINGS)).toBe(5)
    expect(maxTasksPerDay('SILVER', QT_SETTINGS)).toBe(10)
    expect(maxTasksPerDay('GOLD', QT_SETTINGS)).toBe(15)
  })
})

describe('allowedTargetTiers', () => {
  it('STARTER only gets SACRIFICIAL', () => {
    expect(allowedTargetTiers('STARTER')).toEqual(['SACRIFICIAL'])
  })
  it('GOLD gets all tiers', () => {
    expect(allowedTargetTiers('GOLD')).toEqual(['SACRIFICIAL', 'STANDARD', 'PREMIUM'])
  })
})

describe('isWarmingUp', () => {
  it('true when under warmup count', () => {
    expect(isWarmingUp(10, 15)).toBe(true)
  })
  it('false when at or above warmup count', () => {
    expect(isWarmingUp(15, 15)).toBe(false)
    expect(isWarmingUp(20, 15)).toBe(false)
  })
})

describe('checkTaskEligibility', () => {
  const now = new Date('2026-10-16T12:00:00Z')

  it('passes when under limits', () => {
    const r = checkTaskEligibility({ level: 'BRONZE', todayTaskCount: 2, lastTaskAt: null, now, settings: QT_SETTINGS })
    expect(r.ok).toBe(true)
  })

  it('fails when daily limit reached', () => {
    const r = checkTaskEligibility({ level: 'STARTER', todayTaskCount: 3, lastTaskAt: null, now, settings: QT_SETTINGS })
    expect(r).toEqual({ ok: false, reason: 'Daily limit reached (3)' })
  })

  it('fails during cooldown', () => {
    const lastTaskAt = new Date(now.getTime() - 5 * 60_000)
    const r = checkTaskEligibility({ level: 'BRONZE', todayTaskCount: 0, lastTaskAt, now, settings: QT_SETTINGS })
    expect(r.ok).toBe(false)
    expect((r as { reason: string }).reason).toMatch(/Cooldown/)
  })

  it('passes after cooldown', () => {
    const lastTaskAt = new Date(now.getTime() - 20 * 60_000)
    const r = checkTaskEligibility({ level: 'BRONZE', todayTaskCount: 0, lastTaskAt, now, settings: QT_SETTINGS })
    expect(r.ok).toBe(true)
  })
})

describe('computeTrustScore', () => {
  it('returns 0 with no tasks', () => {
    expect(computeTrustScore({ verifiedCount: 0, failedCount: 0, removedCount: 0, totalCount: 0 })).toBe(0)
  })

  it('returns 100 with perfect record', () => {
    expect(computeTrustScore({ verifiedCount: 20, failedCount: 0, removedCount: 0, totalCount: 20 })).toBe(100)
  })

  it('penalizes failures and removals', () => {
    const score = computeTrustScore({ verifiedCount: 18, failedCount: 2, removedCount: 1, totalCount: 20 })
    expect(score).toBeLessThan(100)
    expect(score).toBeGreaterThan(0)
  })
})

describe('shouldPromote', () => {
  it('promotes STARTER to BRONZE after warmup', () => {
    expect(shouldPromote({ currentLevel: 'STARTER', verifiedCount: 15, survivalRate: 0.9, visitsMissionsValidated: 0 })).toBe('BRONZE')
  })

  it('does not promote STARTER with low survival', () => {
    expect(shouldPromote({ currentLevel: 'STARTER', verifiedCount: 15, survivalRate: 0.7, visitsMissionsValidated: 0 })).toBeNull()
  })

  it('promotes SILVER to GOLD with field experience', () => {
    expect(shouldPromote({ currentLevel: 'SILVER', verifiedCount: 100, survivalRate: 0.95, visitsMissionsValidated: 5 })).toBe('GOLD')
  })

  it('does not promote SILVER without field visits', () => {
    expect(shouldPromote({ currentLevel: 'SILVER', verifiedCount: 100, survivalRate: 0.95, visitsMissionsValidated: 2 })).toBeNull()
  })

  it('returns null for GOLD', () => {
    expect(shouldPromote({ currentLevel: 'GOLD', verifiedCount: 200, survivalRate: 1, visitsMissionsValidated: 20 })).toBeNull()
  })
})

describe('isTaskExpired', () => {
  const past = new Date('2026-10-16T10:00:00Z')
  const now = new Date('2026-10-16T12:30:00Z')
  const future = new Date('2026-10-16T14:00:00Z')

  it('true when ASSIGNED and past expiry', () => {
    expect(isTaskExpired('ASSIGNED', past, now)).toBe(true)
  })
  it('false when ASSIGNED but not expired', () => {
    expect(isTaskExpired('ASSIGNED', future, now)).toBe(false)
  })
  it('false when already submitted', () => {
    expect(isTaskExpired('SUBMITTED', past, now)).toBe(false)
  })
})
