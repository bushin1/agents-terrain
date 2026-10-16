import { describe, expect, it } from 'vitest'
import { pickTarget, buildReviewUrl, pickReviewText, type DispatchCandidate } from './dispatch'

function candidate(overrides: Partial<DispatchCandidate> = {}): DispatchCandidate {
  return {
    id: 'target-1',
    placeId: 'ChIJ_abc123',
    name: 'Test Fencing LLC',
    city: 'Austin',
    state: 'TX',
    trade: 'fencing',
    tier: 'SACRIFICIAL',
    reviewCount: 0,
    maxTotal: 20,
    maxPerDay: 1,
    todayCount: 0,
    lastReviewAt: null,
    ...overrides,
  }
}

describe('pickTarget', () => {
  it('returns a target when eligible', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'STARTER',
      agentState: 'TX',
      verifiedCount: 0,
      warmupCount: 15,
      alreadyReviewedTargetIds: [],
      candidates: [candidate()],
    })
    expect(result).toBeTruthy()
    expect(result!.id).toBe('target-1')
  })

  it('excludes already reviewed targets', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'STARTER',
      agentState: 'TX',
      verifiedCount: 0,
      warmupCount: 15,
      alreadyReviewedTargetIds: ['target-1'],
      candidates: [candidate()],
    })
    expect(result).toBeNull()
  })

  it('STARTER only sees SACRIFICIAL during warmup', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'STARTER',
      agentState: 'TX',
      verifiedCount: 5,
      warmupCount: 15,
      alreadyReviewedTargetIds: [],
      candidates: [candidate({ id: 't-std', tier: 'STANDARD' })],
    })
    expect(result).toBeNull()
  })

  it('BRONZE post-warmup can access STANDARD', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'BRONZE',
      agentState: 'TX',
      verifiedCount: 20,
      warmupCount: 15,
      alreadyReviewedTargetIds: [],
      candidates: [candidate({ id: 't-std', tier: 'STANDARD' })],
    })
    expect(result).toBeTruthy()
    expect(result!.id).toBe('t-std')
  })

  it('skips targets at daily max', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'BRONZE',
      agentState: 'TX',
      verifiedCount: 20,
      warmupCount: 15,
      alreadyReviewedTargetIds: [],
      candidates: [candidate({ todayCount: 1, maxPerDay: 1 }), candidate({ id: 'target-2', todayCount: 0, maxPerDay: 1 })],
    })
    expect(result).toBeTruthy()
    expect(result!.id).toBe('target-2')
  })

  it('prefers same-state targets', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'BRONZE',
      agentState: 'TX',
      verifiedCount: 20,
      warmupCount: 15,
      alreadyReviewedTargetIds: [],
      candidates: [
        candidate({ id: 'ca-1', state: 'CA' }),
        candidate({ id: 'tx-1', state: 'TX' }),
      ],
    })
    expect(result!.id).toBe('tx-1')
  })

  it('skips targets at total max', () => {
    const result = pickTarget({
      agentId: 'agent-1',
      agentLevel: 'STARTER',
      agentState: 'TX',
      verifiedCount: 0,
      warmupCount: 15,
      alreadyReviewedTargetIds: [],
      candidates: [candidate({ reviewCount: 20, maxTotal: 20 })],
    })
    expect(result).toBeNull()
  })
})

describe('buildReviewUrl', () => {
  it('builds correct Google review URL', () => {
    expect(buildReviewUrl('ChIJ_abc123')).toBe('https://search.google.com/local/writereview?placeid=ChIJ_abc123')
  })
})

describe('pickReviewText', () => {
  it('returns a non-empty string', () => {
    const text = pickReviewText('fencing')
    expect(text.length).toBeGreaterThan(10)
  })
})
