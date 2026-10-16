import type { EarningStatus, EarningTier, MissionStatus, MissionType } from '@prisma/client'

export type TrackState = 'done' | 'pending' | 'waiting'
export interface TrackStep { tier: EarningTier; state: TrackState; amountCents: number }

/** Les paliers d'une mission pour l'écran de suivi : gagné, en attente (en cours), ou pas encore atteint. */
export function trackerSteps(input: {
  type: MissionType
  status: MissionStatus
  earnings: { tier: EarningTier; amountCents: number; status: EarningStatus }[]
  amounts: { VISIT: number; LIVE: number; CLIENT: number; RETURN_VISIT: number }
}): TrackStep[] {
  const earned = new Map(input.earnings.filter((e) => e.status !== 'VOID').map((e) => [e.tier, e.amountCents]))
  const inReview = input.status === 'SUBMITTED' || input.status === 'NEEDS_FIX'
  if (input.type === 'RETURN_VISIT') {
    const got = earned.get('RETURN_VISIT')
    return [{ tier: 'RETURN_VISIT', state: got != null ? 'done' : inReview ? 'pending' : 'waiting', amountCents: got ?? input.amounts.RETURN_VISIT }]
  }
  const visit = earned.get('VISIT')
  const live = earned.get('LIVE')
  const client = earned.get('CLIENT')
  return [
    { tier: 'VISIT', state: visit != null ? 'done' : inReview ? 'pending' : 'waiting', amountCents: visit ?? input.amounts.VISIT },
    { tier: 'LIVE', state: live != null ? 'done' : visit != null ? 'pending' : 'waiting', amountCents: live ?? input.amounts.LIVE },
    { tier: 'CLIENT', state: client != null ? 'done' : 'waiting', amountCents: client ?? input.amounts.CLIENT },
  ]
}
