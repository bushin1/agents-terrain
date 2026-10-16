import type { AgentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { balanceOf, levelFor } from '@/modules/ledger'
import { notifyProAgentChanged } from '@/modules/missions'
import { RELEASE_RESET, moveMission } from '@/modules/missions/transition'
import { getSettings } from '@/modules/settings'
import { canTransitionAgent, isAdult } from './agent-rule'

export { canTransitionAgent, isAdult }

/** Suspend un agent ACTIVE et remet ses missions acceptées en OPEN (spec §7.1). */
export async function suspendAgent(agentId: string, actor: string, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  const released = await prisma.$transaction(async (tx) => {
    // Même verrou que acceptMission : une acceptation en cours se termine avant, ou voit l'agent suspendu.
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${agentId}))) AS l`
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    if (!canTransitionAgent(agent.status, 'SUSPENDED')) throw new Error(`Transition refusée : ${agent.status} → SUSPENDED`)
    await tx.agent.update({ where: { id: agentId }, data: { status: 'SUSPENDED' } })
    const held = await tx.mission.findMany({ where: { agentId, status: 'ACCEPTED' } })
    for (const m of held) await moveMission(tx, m.id, 'OPEN', actor, { data: { ...RELEASE_RESET, publishedAt: new Date() }, reason: 'Agent suspendu' })
    await logAudit(tx, { actor, action: 'agent.suspend', entity: 'Agent', entityId: agentId, reason })
    return { ids: held.map((m) => m.id), firstName: agent.firstName }
  })
  for (const id of released.ids) await notifyProAgentChanged(id, released.firstName)
}

export async function reactivateAgent(agentId: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    if (!canTransitionAgent(agent.status, 'ACTIVE') || agent.status !== 'SUSPENDED') throw new Error(`Transition refusée : ${agent.status} → ACTIVE`)
    await tx.agent.update({ where: { id: agentId }, data: { status: 'ACTIVE' } })
    await logAudit(tx, { actor, action: 'agent.reactivate', entity: 'Agent', entityId: agentId })
  })
}

export async function listAgents(filter: { status?: AgentStatus } = {}) {
  return prisma.agent.findMany({ where: filter.status ? { status: filter.status } : {}, orderBy: { createdAt: 'desc' }, take: 300 })
}

export async function agentStats(agentId: string) {
  const grouped = await prisma.mission.groupBy({ by: ['status'], where: { agentId }, _count: { _all: true } })
  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<string, number>>
  const decided = (byStatus.VALIDATED ?? 0) + (byStatus.REJECTED ?? 0)
  const rating = await prisma.mission.aggregate({ where: { agentId, proRating: { not: null } }, _avg: { proRating: true } })
  const settings = await getSettings()
  return {
    byStatus,
    level: levelFor(byStatus.VALIDATED ?? 0, settings.levels).name,
    validationRatePct: decided ? Math.round(((byStatus.VALIDATED ?? 0) * 100) / decided) : null,
    avgProRating: rating._avg.proRating != null ? Math.round(rating._avg.proRating * 10) / 10 : null,
    openFlags: await prisma.fraudFlag.count({ where: { agentId, resolved: false } }),
    balanceCents: await balanceOf(agentId),
  }
}

export async function getAgent(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      missions: { orderBy: { slotAt: 'desc' }, take: 50, include: { pro: { select: { businessName: true, city: true, state: true } } } },
      flags: { where: { resolved: false }, orderBy: { createdAt: 'desc' } },
      attempts: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
}
