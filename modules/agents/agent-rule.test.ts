import { describe, expect, it } from 'vitest'
import { canTransitionAgent, isAdult } from './agent-rule'

describe('canTransitionAgent (spec §7.1)', () => {
  it.each([
    ['APPLICANT', 'TRAINING'],
    ['TRAINING', 'CERTIFIED'],
    ['TRAINING', 'LOCKED'],
    ['LOCKED', 'TRAINING'],
    ['LOCKED', 'REFUSED'],
    ['CERTIFIED', 'ACTIVE'],
    ['ACTIVE', 'SUSPENDED'],
    ['SUSPENDED', 'ACTIVE'],
  ] as const)('%s → %s autorisé', (from, to) => {
    expect(canTransitionAgent(from, to)).toBe(true)
  })

  it.each([
    ['APPLICANT', 'ACTIVE'],
    ['TRAINING', 'ACTIVE'],
    ['REFUSED', 'TRAINING'],
    ['CERTIFIED', 'SUSPENDED'],
    ['SUSPENDED', 'TRAINING'],
  ] as const)('%s → %s refusé', (from, to) => {
    expect(canTransitionAgent(from, to)).toBe(false)
  })
})

describe('isAdult', () => {
  const now = new Date('2026-10-16T12:00:00Z')
  it('18 ans le jour même', () => {
    expect(isAdult(new Date('2008-10-16T00:00:00Z'), now)).toBe(true)
  })
  it('17 ans la veille de ses 18 ans', () => {
    expect(isAdult(new Date('2008-10-17T00:00:00Z'), now)).toBe(false)
  })
  it('largement majeur', () => {
    expect(isAdult(new Date('1990-01-01T00:00:00Z'), now)).toBe(true)
  })
})
