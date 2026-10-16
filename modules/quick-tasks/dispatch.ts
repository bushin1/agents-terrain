import type { AgentLevel, TargetTier } from '@prisma/client'
import { allowedTargetTiers, isWarmingUp } from './task-rule'

export interface DispatchCandidate {
  id: string
  placeId: string
  name: string
  city: string
  state: string
  trade: string
  tier: TargetTier
  reviewCount: number
  maxTotal: number
  maxPerDay: number
  todayCount: number
  lastReviewAt: Date | null
}

export interface DispatchInput {
  agentId: string
  agentLevel: AgentLevel
  agentState: string
  verifiedCount: number
  warmupCount: number
  alreadyReviewedTargetIds: string[]
  candidates: DispatchCandidate[]
}

export interface DispatchResult {
  target: DispatchCandidate
  reviewText: string
}

const REVIEW_TEMPLATES: Record<string, string[]> = {
  default: [
    'Great service and very professional team. Would definitely recommend to anyone looking for quality work.',
    'Hired them for a project and they exceeded my expectations. Fair pricing and excellent craftsmanship.',
    'Very responsive and completed the job on time. The crew was respectful and cleaned up after themselves.',
    'Outstanding work quality. They took the time to explain everything and made sure I was satisfied.',
    'Professional from start to finish. Communication was great and the final result looks amazing.',
  ],
}

export function pickTarget(input: DispatchInput): DispatchCandidate | null {
  const tiers = allowedTargetTiers(input.agentLevel)
  const warming = isWarmingUp(input.verifiedCount, input.warmupCount)

  const eligible = input.candidates.filter((c) => {
    if (input.alreadyReviewedTargetIds.includes(c.id)) return false
    if (!tiers.includes(c.tier)) return false
    if (warming && c.tier !== 'SACRIFICIAL') return false
    if (c.reviewCount >= c.maxTotal) return false
    if (c.todayCount >= c.maxPerDay) return false
    return true
  })

  if (eligible.length === 0) return null

  const sameState = eligible.filter((c) => c.state === input.agentState)
  const pool = sameState.length > 0 ? sameState : eligible

  const sorted = [...pool].sort((a, b) => {
    if (a.tier !== b.tier) {
      const tierOrder: Record<TargetTier, number> = { SACRIFICIAL: 0, STANDARD: 1, PREMIUM: 2 }
      if (warming) return tierOrder[a.tier] - tierOrder[b.tier]
      return tierOrder[b.tier] - tierOrder[a.tier]
    }
    const ratioA = a.reviewCount / a.maxTotal
    const ratioB = b.reviewCount / b.maxTotal
    return ratioA - ratioB
  })

  return sorted[0]
}

export function pickReviewText(trade: string): string {
  const templates = REVIEW_TEMPLATES[trade.toLowerCase()] ?? REVIEW_TEMPLATES.default
  return templates[Math.floor(Math.random() * templates.length)]
}

export function buildReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${placeId}`
}
