import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { runNeedsFixSweep, runNoShowSweep, runReminderSweep } from './sweeps'
import { TOO_LATE, saveStep } from './visit'

const H = 3_600_000
const now = new Date('2026-10-16T18:00:00Z')
const at = (h: number) => new Date(now.getTime() + h * H)

describe('tâches planifiées', () => {
  beforeEach(resetDb)

  it('absence : SMS à l’agent à +2 h, une seule fois', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: at(-3) })
    expect(await runNoShowSweep(now)).toEqual({ sms: 1, released: 0 })
    expect(await runNoShowSweep(now)).toEqual({ sms: 0, released: 0 })
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).noShowSmsAt).toEqual(now)
    expect(memorySmsDriver.sent.map((s) => s.to)).toEqual([agent.phone])
  })

  it('absence : à +24 h, la mission repasse OPEN et l’agent reçoit une alerte NO_SHOW', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: at(-25), noShowSmsAt: at(-23) })
    expect(await runNoShowSweep(now)).toEqual({ sms: 0, released: 1 })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ status: 'OPEN', agentId: null })
    expect(await prisma.fraudFlag.findFirstOrThrow()).toMatchObject({ agentId: agent.id, type: 'NO_SHOW' })
    // Check-in synchronisé après coup : refusé avec un message clair (spec §4.5, §12).
    const late = await saveStep(agent, m.id, 'checkin', { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt: at(-24.5).toISOString() }, now)
    expect(late).toEqual({ ok: false, status: 409, error: TOO_LATE })
  })

  it('absence : rien si le check-in est arrivé', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: at(-30) })
    await prisma.submission.create({ data: { missionId: m.id, steps: { checkin: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt: at(-30).toISOString(), receivedAt: at(-30).toISOString() } } } })
    expect(await runNoShowSweep(now)).toEqual({ sms: 0, released: 0 })
  })

  it('correction non faite sous 7 jours → REJECTED, pro de nouveau AGREED', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, agentId: agent.id, status: 'NEEDS_FIX', needsFixAt: at(-7 * 24) })
    await makeMission({ agentId: agent.id, status: 'NEEDS_FIX', needsFixAt: at(-24) }) // trop récent
    expect(await runNeedsFixSweep(now)).toBe(1)
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).status).toBe('REJECTED')
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('AGREED')
  })

  it('rappel la veille au pro et à l’agent, une seule fois', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ phone: '+16175550142' })
    await makeMission({ proId: pro.id, agentId: agent.id, status: 'ACCEPTED', slotAt: at(20), acceptedAt: at(-72) })
    expect(await runReminderSweep(now)).toBe(1)
    expect(await runReminderSweep(now)).toBe(0)
    expect(memorySmsDriver.sent.map((s) => s.to).sort()).toEqual([agent.phone, '+16175550142'].sort())
  })
})
