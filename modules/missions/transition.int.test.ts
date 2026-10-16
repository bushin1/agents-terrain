import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { RELEASE_RESET, moveMission } from './transition'

describe('moveMission', () => {
  beforeEach(resetDb)

  it('valide une visite : mission VALIDATED, pro VISITED, action tracée', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED' })
    const at = new Date()
    const out = await moveMission(prisma, m.id, 'VALIDATED', 'marvin@allo-chantiers.fr', { data: { validatedAt: at } })
    expect(out).toMatchObject({ status: 'VALIDATED', validatedAt: at })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('VISITED')
    expect(await prisma.auditLog.count({ where: { action: 'mission.validated', entityId: m.id } })).toBe(1)
  })

  it('rejet d’une visite : pro AGREED, ou LOST avec le motif', async () => {
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, status: 'SUBMITTED' })
    await moveMission(prisma, m.id, 'REJECTED', 'x', { reason: 'Pas venu', markProLost: true })
    expect(await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).toMatchObject({ status: 'LOST', lostReason: 'Pas venu' })
  })

  it('refuse une transition interdite, ou un statut qui a changé depuis la lecture', async () => {
    const m = await makeMission({ status: 'OPEN' })
    await expect(moveMission(prisma, m.id, 'VALIDATED', 'x')).rejects.toThrow('OPEN → VALIDATED')
    const s = await makeMission({ status: 'SUBMITTED' })
    await expect(moveMission(prisma, s.id, 'REJECTED', 'x', { expectFrom: 'NEEDS_FIX' })).rejects.toThrow('a changé entre-temps')
  })

  it('remet à zéro les champs de l’agent quand la mission repasse OPEN', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', acceptedAt: new Date(), reminderSentAt: new Date(), noShowSmsAt: new Date() })
    const out = await moveMission(prisma, m.id, 'OPEN', 'system', { data: RELEASE_RESET })
    expect(out).toMatchObject({ status: 'OPEN', agentId: null, acceptedAt: null, reminderSentAt: null, noShowSmsAt: null })
  })
})
