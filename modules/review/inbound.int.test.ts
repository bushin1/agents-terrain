import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { handleInboundSms, listInbound, markInboundHandled } from './inbound'

const now = new Date('2026-10-16T20:00:00Z')

async function visited(postVisitSmsAt = new Date('2026-10-16T15:00:00Z')) {
  const agent = await makeAgent()
  const pro = await makePro({ phone: '+16175550142' })
  const mission = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED', postVisitSmsAt })
  return { agent, pro, mission }
}

describe('SMS entrants', () => {
  beforeEach(resetDb)

  it('une note 1–5 du pro est rattachée à sa dernière visite', async () => {
    const { mission } = await visited()
    expect(await handleInboundSms('(617) 555-0142', '5', now)).toEqual({ matched: true, missionId: mission.id })
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).proRating).toBe(5)
    expect(await prisma.inboundSms.findFirstOrThrow()).toMatchObject({ handled: true, missionId: mission.id })
  })

  it('NO marque la visite comme contestée et lève l’alerte PRO_DENIED', async () => {
    const { mission } = await visited()
    await handleInboundSms('+16175550142', 'No', now)
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).proDenied).toBe(true)
    expect((await prisma.fraudFlag.findMany()).map((f) => f.type)).toEqual(['PRO_DENIED'])
  })

  it('tout autre message arrive dans « SMS reçus », relié à la dernière mission du pro', async () => {
    const { mission } = await visited()
    expect(await handleInboundSms('+16175550142', 'Can we move to Friday?', now)).toEqual({ matched: false, missionId: null })
    const [row] = await listInbound({ handled: false })
    expect(row).toMatchObject({ body: 'Can we move to Friday?', missionId: mission.id, handled: false })
    await markInboundHandled(row.id, 'x')
    expect(await listInbound({ handled: false })).toEqual([])
  })

  it('un renvoi Twilio du même message (même MessageSid) n’est traité qu’une fois', async () => {
    await visited()
    await handleInboundSms('+16175550142', 'Thanks!', now, 'SM123')
    expect(await handleInboundSms('+16175550142', 'Thanks!', now, 'SM123')).toEqual({ matched: false, missionId: null, duplicate: true })
    expect(await prisma.inboundSms.count()).toBe(1)
  })

  it('une seconde note, ou une note après 7 jours, n’est pas rattachée', async () => {
    const { mission } = await visited()
    await handleInboundSms('+16175550142', '4', now)
    expect((await handleInboundSms('+16175550142', '1', now)).matched).toBe(false)
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).proRating).toBe(4)
    await resetDb()
    await visited(new Date('2026-10-08T15:00:00Z'))
    expect((await handleInboundSms('+16175550142', '5', now)).matched).toBe(false)
  })
})
