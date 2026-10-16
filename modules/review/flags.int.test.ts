import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { refreshFraudFlags } from './flags'

const at = '2026-10-16T14:00:00.000Z'
const checkin = (lat: number) => ({ checkin: { lat, lng: -71.0621, accuracy: 10, clientAt: at, receivedAt: at } })

describe('refreshFraudFlags', () => {
  beforeEach(resetDb)

  it('enregistre les alertes, puis marque résolues celles qui ne s’appliquent plus', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'SUBMITTED' })
    await prisma.submission.create({ data: { missionId: m.id, steps: checkin(42.36) } }) // ≈ 400 m du pro
    await refreshFraudFlags(m.id)
    expect((await prisma.fraudFlag.findMany()).map((f) => f.type)).toEqual(['CHECKIN_FAR'])
    await prisma.submission.update({ where: { missionId: m.id }, data: { steps: checkin(42.3564) } })
    await refreshFraudFlags(m.id)
    expect(await prisma.fraudFlag.count({ where: { resolved: false } })).toBe(0)
    expect(await prisma.fraudFlag.count({ where: { resolved: true } })).toBe(1)
  })

  it('DUPLICATE_PRO : même téléphone qu’un autre pro déjà visité, jamais le pro lui-même', async () => {
    const agent = await makeAgent()
    const other = await makePro({ phone: '+16175550142', status: 'VISITED' })
    await makeMission({ proId: other.id, agentId: agent.id, status: 'VALIDATED' })
    const pro = await makePro({ phone: '+16175550142' })
    await makeMission({ proId: pro.id, agentId: agent.id, status: 'VALIDATED' }) // visite d'origine du même pro
    const ret = await makeMission({ proId: pro.id, agentId: agent.id, type: 'RETURN_VISIT', status: 'SUBMITTED' })
    await refreshFraudFlags(ret.id)
    const flags = await prisma.fraudFlag.findMany()
    expect(flags.map((f) => f.type)).toEqual(['DUPLICATE_PRO'])
    expect(flags[0].detail).toContain('1 autre')
  })

  it('ne touche pas aux alertes NO_SHOW posées par la tâche d’absence', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'SUBMITTED' })
    await prisma.fraudFlag.create({ data: { missionId: m.id, agentId: agent.id, type: 'NO_SHOW', detail: 'x' } })
    await refreshFraudFlags(m.id)
    expect(await prisma.fraudFlag.count({ where: { type: 'NO_SHOW' } })).toBe(1)
  })
})
