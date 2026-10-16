import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { agentStats, reactivateAgent, suspendAgent } from './index'

describe('agents (équipe)', () => {
  beforeEach(resetDb)

  it('suspendre libère ses missions acceptées (spec §7.1)', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', acceptedAt: new Date() })
    await suspendAgent(agent.id, 'marvin@allo-chantiers.fr', 'Photos réutilisées')
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } })).status).toBe('SUSPENDED')
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ status: 'OPEN', agentId: null, acceptedAt: null })
    expect(await prisma.auditLog.count({ where: { action: 'agent.suspend' } })).toBe(1)
  })

  it('réactive un agent suspendu ; refuse de suspendre un agent qui n’est pas ACTIVE', async () => {
    const a = await makeAgent({ status: 'SUSPENDED' })
    await reactivateAgent(a.id, 'x')
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('ACTIVE')
    const t = await makeAgent({ status: 'TRAINING' })
    await expect(suspendAgent(t.id, 'x', 'y')).rejects.toThrow('TRAINING → SUSPENDED')
  })

  it('statistiques : missions par statut, taux de validation, note moyenne, alertes ouvertes, solde', async () => {
    const agent = await makeAgent()
    const v1 = await makeMission({ agentId: agent.id, status: 'VALIDATED', proRating: 5 })
    await makeMission({ agentId: agent.id, status: 'VALIDATED', proRating: 3 })
    await makeMission({ agentId: agent.id, status: 'REJECTED' })
    await prisma.earning.create({ data: { agentId: agent.id, missionId: v1.id, tier: 'VISIT', baseAmountCents: 4000, levelBonusPct: 0, amountCents: 4000 } })
    await prisma.fraudFlag.create({ data: { missionId: v1.id, agentId: agent.id, type: 'LATE_SYNC', detail: 'x' } })
    expect(await agentStats(agent.id)).toEqual({
      byStatus: { VALIDATED: 2, REJECTED: 1 },
      level: 'BRONZE',
      validationRatePct: 67,
      avgProRating: 4,
      openFlags: 1,
      balanceCents: 4000,
    })
  })
})
