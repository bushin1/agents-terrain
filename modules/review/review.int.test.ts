import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { getReviewDetail, listQueue, reject, requestFix, validate } from './index'

const now = new Date('2026-10-16T18:00:00Z')

async function submitted(data: Record<string, unknown> = {}) {
  const agent = await makeAgent()
  const pro = await makePro({ status: 'MISSION_OPEN' })
  const mission = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED', submittedAt: now, ...data })
  return { agent, pro, mission }
}

describe('validation', () => {
  beforeEach(resetDb)

  it('file : la plus ancienne soumission en premier', async () => {
    const a = await submitted({ submittedAt: new Date('2026-10-16T10:00:00Z') })
    const b = await submitted({ submittedAt: new Date('2026-10-16T09:00:00Z') })
    expect((await listQueue()).map((m) => m.id)).toEqual([b.mission.id, a.mission.id])
  })

  it('valider : VALIDATED, pro VISITED, gains VISIT + URGENCY, SMS à l’agent', async () => {
    const { agent, pro, mission } = await submitted({ urgencyBonusCents: 1000 })
    expect(await validate(mission.id, 'marvin@allo-chantiers.fr', {}, now)).toEqual({ ok: true, earnedCents: 5000 })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'VALIDATED', validatedAt: now })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('VISITED')
    expect((await prisma.earning.findMany({ where: { agentId: agent.id } })).map((e) => e.tier).sort()).toEqual(['URGENCY', 'VISIT'])
    expect(memorySmsDriver.sent.at(-1)).toEqual({ to: agent.phone, body: expect.stringContaining('$50.00 was added') })
  })

  it('une mission de retour rapporte le palier RETURN_VISIT et ne touche pas au pro', async () => {
    const { pro, mission } = await submitted({ type: 'RETURN_VISIT' })
    await prisma.pro.update({ where: { id: pro.id }, data: { status: 'VISITED' } })
    expect(await validate(mission.id, 'x', {}, now)).toEqual({ ok: true, earnedCents: 2000 })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('VISITED')
  })

  it('exige une confirmation si le pro a répondu NO ou mis une note basse', async () => {
    const { mission, agent } = await submitted({ proDenied: true })
    await prisma.fraudFlag.create({ data: { missionId: mission.id, agentId: agent.id, type: 'PRO_DENIED', detail: 'x' } })
    expect(await validate(mission.id, 'x', {}, now)).toEqual({ ok: false, needsConfirmation: true, error: 'Le pro a signalé un problème : confirmez pour valider quand même.' })
    expect((await validate(mission.id, 'x', { confirmFlags: true }, now)).ok).toBe(true)
  })

  it('exige aussi la confirmation sur la réponse brute du pro, même sans alerte enregistrée', async () => {
    const { mission } = await submitted({ proRating: 2 })
    expect(await validate(mission.id, 'x', {}, now)).toMatchObject({ ok: false, needsConfirmation: true })
  })

  it('demander une correction : NEEDS_FIX, message enregistré et envoyé', async () => {
    const { mission, agent } = await submitted()
    await requestFix(mission.id, 'x', 'Add a photo of the truck.', now)
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'NEEDS_FIX', needsFixAt: now, fixMessage: 'Add a photo of the truck.' })
    expect(memorySmsDriver.sent.at(-1)).toEqual({ to: agent.phone, body: expect.stringContaining('Add a photo of the truck.') })
  })

  it('rejeter : REJECTED, pro de nouveau AGREED (ou LOST), motif obligatoire', async () => {
    const { mission, pro } = await submitted()
    await expect(reject(mission.id, 'x', ' ')).rejects.toThrow('Motif obligatoire')
    await reject(mission.id, 'x', 'Check-in 2 km away from the business.')
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'REJECTED', rejectReason: 'Check-in 2 km away from the business.' })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('AGREED')
  })

  it('le détail donne la distance du check-in à l’adresse du pro', async () => {
    const { mission } = await submitted()
    await prisma.submission.create({ data: { missionId: mission.id, steps: { checkin: { lat: 42.36, lng: -71.0621, accuracy: 10, clientAt: now.toISOString(), receivedAt: now.toISOString() } } } })
    const d = await getReviewDetail(mission.id)
    expect(d?.checkinDistanceMeters).toBeGreaterThan(380)
    expect(d?.checkinDistanceMeters).toBeLessThan(420)
  })
})
