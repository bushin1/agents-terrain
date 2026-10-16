import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { award, balanceOf, voidEarning } from './index'

async function validated(agentId: string, data: Record<string, unknown> = {}) {
  return makeMission({ agentId, status: 'VALIDATED', validatedAt: new Date(), ...data })
}

describe('ledger', () => {
  beforeEach(resetDb)

  it('crée le gain VISIT d’une mission validée, une seule fois', async () => {
    const agent = await makeAgent()
    const m = await validated(agent.id)
    const first = await award(m.id, 'VISIT')
    expect(first).toMatchObject({ ok: true, created: true })
    if (first.ok) expect(first.earning).toMatchObject({ amountCents: 4000, levelBonusPct: 0, status: 'PAYABLE' })
    expect(await award(m.id, 'VISIT')).toMatchObject({ ok: true, created: false })
    expect(await prisma.earning.count()).toBe(1)
  })

  it('applique le niveau Silver à la 5e mission validée', async () => {
    const agent = await makeAgent()
    for (let i = 0; i < 4; i++) await validated(agent.id)
    const fifth = await validated(agent.id)
    const r = await award(fifth.id, 'VISIT')
    expect(r.ok && r.earning.amountCents).toBe(4400)
  })

  it('URGENCY reprend le bonus de la mission', async () => {
    const agent = await makeAgent()
    const m = await validated(agent.id, { urgencyBonusCents: 1500 })
    const r = await award(m.id, 'URGENCY')
    expect(r.ok && r.earning.amountCents).toBe(1500)
  })

  it('refuse une mission non validée ou sans agent', async () => {
    const agent = await makeAgent()
    const submitted = await makeMission({ agentId: agent.id, status: 'SUBMITTED' })
    expect(await award(submitted.id, 'VISIT')).toEqual({ ok: false, reason: 'mission non validée' })
    expect(await prisma.earning.count()).toBe(0)
  })

  it('le solde ne compte que les gains PAYABLE ; une annulation est tracée', async () => {
    const agent = await makeAgent()
    const a = await award((await validated(agent.id)).id, 'VISIT')
    await award((await validated(agent.id)).id, 'VISIT')
    expect(await balanceOf(agent.id)).toBe(8000)
    if (!a.ok) throw new Error('award')
    await voidEarning(a.earning.id, 'Photos réutilisées', 'marvin@allo-chantiers.fr')
    expect(await balanceOf(agent.id)).toBe(4000)
    expect((await prisma.earning.findUniqueOrThrow({ where: { id: a.earning.id } })).voidReason).toBe('Photos réutilisées')
    await expect(voidEarning(a.earning.id, 'x', 'x')).rejects.toThrow('déjà VOID')
  })
})
