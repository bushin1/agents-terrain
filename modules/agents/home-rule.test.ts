import { describe, expect, it } from 'vitest'
import { homePathFor } from './home-rule'

describe('homePathFor', () => {
  it.each([
    ['TRAINING', '/agent/academy'],
    ['CERTIFIED', '/agent/contract'],
    ['ACTIVE', '/agent/missions'],
    ['APPLICANT', '/agent/status'],
    ['LOCKED', '/agent/status'],
    ['REFUSED', '/agent/status'],
    ['SUSPENDED', '/agent/status'],
  ] as const)('%s → %s', (status, path) => {
    expect(homePathFor(status)).toBe(path)
  })
})
