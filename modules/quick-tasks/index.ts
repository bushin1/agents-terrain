import crypto from 'node:crypto'
import type { PrismaClient, AgentLevel, QuickTaskStatus } from '@prisma/client'
import { pickTarget, pickReviewText, buildReviewUrl, type DispatchCandidate } from './dispatch'
import { checkTaskEligibility, computeTrustScore, shouldPromote, REVIEW_LINK_TTL_MS } from './task-rule'
import type { Settings } from '@/modules/settings/defaults'

const DAY_MS = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function assignTask(db: PrismaClient, agentId: string, settings: Settings) {
  const agent = await db.agent.findUniqueOrThrow({ where: { id: agentId }, select: { id: true, level: true, status: true, lat: true, lng: true, zip: true } })
  if (agent.status !== 'ACTIVE') return { ok: false as const, reason: 'Agent not active' }

  const state = agent.zip.length >= 2 ? '' : ''
  const now = new Date()
  const dayStart = startOfDay(now)

  const todayTaskCount = await db.quickTaskResult.count({
    where: { agentId, createdAt: { gte: dayStart } },
  })

  const lastTask = await db.quickTaskResult.findFirst({
    where: { agentId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true },
  })

  const eligibility = checkTaskEligibility({
    level: agent.level as AgentLevel,
    todayTaskCount,
    lastTaskAt: lastTask?.createdAt ?? null,
    now,
    settings: settings.quickTask,
  })
  if (!eligibility.ok) return { ok: false as const, reason: eligibility.reason }

  const alreadyReviewed = await db.quickTaskResult.findMany({
    where: { agentId }, select: { targetId: true },
  })
  const alreadyReviewedIds = alreadyReviewed.map((r) => r.targetId)

  const rawCandidates = await db.reviewTarget.findMany({
    where: { active: true },
    select: { id: true, placeId: true, name: true, city: true, state: true, trade: true, tier: true, reviewCount: true, maxTotal: true, maxPerDay: true, lastReviewAt: true },
  })

  const todayCounts = await db.quickTaskResult.groupBy({
    by: ['targetId'],
    where: { createdAt: { gte: dayStart } },
    _count: true,
  })
  const todayMap = new Map(todayCounts.map((r) => [r.targetId, r._count]))

  const candidates: DispatchCandidate[] = rawCandidates.map((t) => ({
    ...t,
    todayCount: todayMap.get(t.id) ?? 0,
  }))

  const verifiedCount = await db.quickTaskResult.count({ where: { agentId, status: 'VERIFIED' } })

  const agentState = agent.zip.substring(0, 2)

  const target = pickTarget({
    agentId,
    agentLevel: agent.level as AgentLevel,
    agentState,
    verifiedCount,
    warmupCount: settings.quickTask.warmupCount,
    alreadyReviewedTargetIds: alreadyReviewedIds,
    candidates,
  })

  if (!target) return { ok: false as const, reason: 'No targets available right now' }

  const reviewText = pickReviewText(target.trade)
  const expiresAt = new Date(now.getTime() + settings.quickTask.expirationHours * 3_600_000)

  const mission = await db.mission.create({
    data: {
      type: 'QUICK_TASK',
      status: 'ACCEPTED',
      agentId,
      slotAt: now,
      acceptedAt: now,
      suggestedCategory: target.trade,
    },
  })

  const result = await db.quickTaskResult.create({
    data: {
      missionId: mission.id,
      targetId: target.id,
      agentId,
      reviewText,
      expiresAt,
    },
  })

  const token = crypto.createHash('sha256').update(`${result.id}:${agentId}`).digest('hex').substring(0, 16)

  return {
    ok: true as const,
    task: {
      id: result.id,
      missionId: mission.id,
      businessName: target.name,
      city: target.city,
      trade: target.trade,
      reviewText,
      reviewUrl: buildReviewUrl(target.placeId),
      token,
      expiresAt,
    },
  }
}

export async function submitTask(db: PrismaClient, taskId: string, agentId: string, screenshotKey: string) {
  const task = await db.quickTaskResult.findUnique({ where: { id: taskId }, include: { mission: true } })
  if (!task || task.agentId !== agentId) return { ok: false as const, reason: 'Task not found' }
  if (task.status !== 'ASSIGNED') return { ok: false as const, reason: `Cannot submit: status is ${task.status}` }
  if (new Date() > task.expiresAt) {
    await db.quickTaskResult.update({ where: { id: taskId }, data: { status: 'EXPIRED' } })
    await db.mission.update({ where: { id: task.missionId }, data: { status: 'CANCELLED', cancelReason: 'Task expired' } })
    return { ok: false as const, reason: 'Task expired' }
  }

  await db.$transaction([
    db.quickTaskResult.update({ where: { id: taskId }, data: { status: 'SUBMITTED', screenshotKey } }),
    db.mission.update({ where: { id: task.missionId }, data: { status: 'SUBMITTED', submittedAt: new Date() } }),
  ])

  return { ok: true as const }
}

export async function verifyTask(db: PrismaClient, taskId: string, approved: boolean, settings: Settings) {
  const task = await db.quickTaskResult.findUnique({ where: { id: taskId }, include: { target: true, agent: true } })
  if (!task) return { ok: false as const, reason: 'Task not found' }
  if (task.status !== 'SUBMITTED') return { ok: false as const, reason: `Cannot verify: status is ${task.status}` }

  const now = new Date()
  const newStatus: QuickTaskStatus = approved ? 'VERIFIED' : 'FAILED'

  const ops = [
    db.quickTaskResult.update({ where: { id: taskId }, data: { status: newStatus, verifiedAt: now } }),
    db.mission.update({ where: { id: task.missionId }, data: { status: approved ? 'VALIDATED' : 'REJECTED', validatedAt: approved ? now : undefined, rejectReason: approved ? undefined : 'Review not verified' } }),
  ]

  if (approved) {
    ops.push(
      db.reviewTarget.update({ where: { id: task.targetId }, data: { reviewCount: { increment: 1 }, lastReviewAt: now } }),
      db.earning.create({
        data: {
          agentId: task.agentId,
          missionId: task.missionId,
          tier: 'QUICK_TASK',
          baseAmountCents: settings.tierAmountsCents.QUICK_TASK,
          levelBonusPct: 0,
          amountCents: settings.tierAmountsCents.QUICK_TASK,
        },
      }),
    )
  }

  await db.$transaction(ops)

  await updateAgentLevel(db, task.agentId, settings)

  return { ok: true as const }
}

export async function checkSurvival(db: PrismaClient, taskId: string, survived: boolean) {
  const now = new Date()
  await db.quickTaskResult.update({ where: { id: taskId }, data: { survivedCheck: survived, survivedAt: now } })
  if (!survived) {
    const task = await db.quickTaskResult.findUniqueOrThrow({ where: { id: taskId } })
    await db.fraudFlag.create({
      data: { missionId: task.missionId, agentId: task.agentId, type: 'REVIEW_REMOVED', detail: 'Review removed within survival check window' },
    })
  }
}

async function updateAgentLevel(db: PrismaClient, agentId: string, settings: Settings) {
  const agent = await db.agent.findUniqueOrThrow({ where: { id: agentId }, select: { level: true } })
  const [verified, failed, removed, total, visits] = await Promise.all([
    db.quickTaskResult.count({ where: { agentId, status: 'VERIFIED' } }),
    db.quickTaskResult.count({ where: { agentId, status: 'FAILED' } }),
    db.quickTaskResult.count({ where: { agentId, survivedCheck: false } }),
    db.quickTaskResult.count({ where: { agentId } }),
    db.mission.count({ where: { agentId, type: 'VISIT', status: 'VALIDATED' } }),
  ])

  const trustScore = computeTrustScore({ verifiedCount: verified, failedCount: failed, removedCount: removed, totalCount: total })
  const survivalRate = total > 0 ? (verified - removed) / total : 0
  const newLevel = shouldPromote({ currentLevel: agent.level as AgentLevel, verifiedCount: verified, survivalRate, visitsMissionsValidated: visits })

  const data: Record<string, unknown> = { trustScore }
  if (newLevel) data.level = newLevel

  await db.agent.update({ where: { id: agentId }, data })
}

export async function expireStaleTasks(db: PrismaClient) {
  const now = new Date()
  const stale = await db.quickTaskResult.findMany({
    where: { status: 'ASSIGNED', expiresAt: { lt: now } },
    select: { id: true, missionId: true },
  })

  for (const task of stale) {
    await db.$transaction([
      db.quickTaskResult.update({ where: { id: task.id }, data: { status: 'EXPIRED' } }),
      db.mission.update({ where: { id: task.missionId }, data: { status: 'CANCELLED', cancelReason: 'Task expired' } }),
    ])
  }

  return stale.length
}
