import type { AgentLevel, QuickTaskStatus, TargetTier } from '@prisma/client'
import type { Settings } from '@/modules/settings/defaults'

export const REVIEW_LINK_TTL_MS = 2 * 3_600_000

export function maxTasksPerDay(level: AgentLevel, settings: Settings['quickTask']): number {
  switch (level) {
    case 'STARTER': return settings.starterMaxPerDay
    case 'BRONZE': return settings.bronzeMaxPerDay
    case 'SILVER': return settings.silverMaxPerDay
    case 'GOLD': return settings.goldMaxPerDay
  }
}

export function allowedTargetTiers(level: AgentLevel): TargetTier[] {
  switch (level) {
    case 'STARTER': return ['SACRIFICIAL']
    case 'BRONZE': return ['SACRIFICIAL', 'STANDARD']
    case 'SILVER': return ['SACRIFICIAL', 'STANDARD', 'PREMIUM']
    case 'GOLD': return ['SACRIFICIAL', 'STANDARD', 'PREMIUM']
  }
}

export function isWarmingUp(verifiedCount: number, warmupCount: number): boolean {
  return verifiedCount < warmupCount
}

export type TaskEligibility = { ok: true } | { ok: false; reason: string }

export function checkTaskEligibility(input: {
  level: AgentLevel
  todayTaskCount: number
  lastTaskAt: Date | null
  now: Date
  settings: Settings['quickTask']
}): TaskEligibility {
  const max = maxTasksPerDay(input.level, input.settings)
  if (input.todayTaskCount >= max) return { ok: false, reason: `Daily limit reached (${max})` }
  if (input.lastTaskAt && input.settings.cooldownMinutes > 0) {
    const elapsed = input.now.getTime() - input.lastTaskAt.getTime()
    if (elapsed < input.settings.cooldownMinutes * 60_000) {
      const remaining = Math.ceil((input.settings.cooldownMinutes * 60_000 - elapsed) / 60_000)
      return { ok: false, reason: `Cooldown: ${remaining} min remaining` }
    }
  }
  return { ok: true }
}

export function computeTrustScore(input: {
  verifiedCount: number
  failedCount: number
  removedCount: number
  totalCount: number
}): number {
  if (input.totalCount === 0) return 0
  const survivalRate = input.totalCount > 0 ? (input.verifiedCount - input.removedCount) / input.totalCount : 0
  const failPenalty = input.failedCount * 5
  return Math.max(0, Math.min(100, Math.round(survivalRate * 100) - failPenalty))
}

export function shouldPromote(input: {
  currentLevel: AgentLevel
  verifiedCount: number
  survivalRate: number
  visitsMissionsValidated: number
}): AgentLevel | null {
  const { currentLevel, verifiedCount, survivalRate, visitsMissionsValidated } = input
  if (currentLevel === 'GOLD') return null
  if (currentLevel === 'SILVER' && verifiedCount >= 100 && survivalRate >= 0.9 && visitsMissionsValidated >= 5) return 'GOLD'
  if (currentLevel === 'BRONZE' && verifiedCount >= 50 && survivalRate >= 0.9) return 'SILVER'
  if (currentLevel === 'STARTER' && verifiedCount >= 15 && survivalRate >= 0.85) return 'BRONZE'
  return null
}

export function isTaskExpired(status: QuickTaskStatus, expiresAt: Date, now: Date): boolean {
  return status === 'ASSIGNED' && now >= expiresAt
}
