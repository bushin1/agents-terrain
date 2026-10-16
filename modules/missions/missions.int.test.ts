import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import {
  acceptMission, adminBoards, createMission, getMissionForAgent, listOpenMissionsFor,
  releaseMission, rescheduleMission, setUrgencyBonus, widenMission,
} from './missions'

const H = 3_600_000
const now = new Date('2026-10-16T12:00:00Z')
const later = (h: number) => new Date(now.getTime() + h * H)

describe('création de mission', () => {
  beforeEach(resetDb)

  it('crée une visite pour un pro AGREED, à l’heure locale du pro, et le passe MISSION_OPEN', async () => {
    const pro = await makePro({ status: 'AGREED' })
    const r = await createMission(pro.id, { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Concrete contractor', instructions: 'Owner has 3 trucks\nVideo verification likely' }, 'setter@allo-chantiers.fr', now)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.mission.slotAt.toISOString()).toBe('2026-10-20T14:00:00.000Z') // 10:00 à Boston (UTC−4)
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('MISSION_OPEN')
  })

  it('refuse un pro qui n’est pas AGREED, sans coordonnées, ou un créneau passé', async () => {
    const toCall = await makePro({ status: 'TO_CALL' })
    expect(await createMission(toCall.id, { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Fence' }, 'x', now)).toMatchObject({ ok: false })
    const noCoords = await makePro({ status: 'AGREED', lat: null, lng: null })
    expect(await createMission(noCoords.id, { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Fence' }, 'x', now))
      .toEqual({ ok: false, error: 'Coordonnées du pro manquantes : corrigez son adresse ou saisissez-les.' })
    const pro = await makePro({ status: 'AGREED' })
    expect(await createMission(pro.id, { slotLocal: '2026-10-01T10:00', suggestedCategory: 'Fence' }, 'x', now))
      .toEqual({ ok: false, error: 'Le créneau doit être dans le futur' })
  })

  it('deux créations simultanées pour le même pro : une seule passe', async () => {
    const pro = await makePro({ status: 'AGREED' })
    const input = { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Fence' }
    const results = await Promise.all([createMission(pro.id, input, 'a', now), createMission(pro.id, input, 'b', now)])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(await prisma.mission.count()).toBe(1)
  })
})

describe('missions vues par un agent', () => {
  beforeEach(resetDb)

  it('liste les missions visibles, triées par distance, sans nom ni adresse du pro', async () => {
    const agent = await makeAgent({ radiusMiles: 10 })
    const near = await makeMission({ slotAt: later(48) }) // centre de Boston
    await makeMission({ slotAt: later(48), proId: (await makePro({ lat: 42.2626, lng: -71.8023, city: 'Worcester' })).id }) // hors rayon
    await makeMission({ slotAt: later(-1) }) // créneau passé
    const list = await listOpenMissionsFor(agent, now)
    expect(list.map((m) => m.id)).toEqual([near.id])
    expect(list[0]).toMatchObject({ city: 'Boston', state: 'MA', trade: 'Concrete contractor', approx: { lat: 42.36, lng: -71.06 } })
    expect(JSON.stringify(list)).not.toContain('Tremont')
    expect(JSON.stringify(list)).not.toContain('Masonry')
  })

  it('un agent non ACTIVE ne voit rien', async () => {
    await makeMission({ slotAt: later(48) })
    expect(await listOpenMissionsFor(await makeAgent({ status: 'CERTIFIED' }), now)).toEqual([])
  })

  it('le détail révèle le pro seulement à l’agent qui a la mission ; la paie tient compte du niveau', async () => {
    const agent = await makeAgent()
    for (let i = 0; i < 4; i++) await makeMission({ agentId: agent.id, status: 'VALIDATED', validatedAt: now })
    const m = await makeMission({ slotAt: later(48), urgencyBonusCents: 1000 })
    const before = await getMissionForAgent(m.id, agent, now)
    expect(before?.pro).toBeNull()
    // 4 visites validées : celle-ci serait la 5e → Silver +10 % sur les 3 paliers (spec §6.2)
    expect(before?.pay).toEqual({ kind: 'VISIT', visitCents: 4000, liveCents: 2500, clientCents: 5000, returnVisitCents: 0, urgencyCents: 1000, levelName: 'SILVER', levelBonusPct: 10, levelBonusCents: 1150, upToCents: 13650 })
    await acceptMission(m.id, agent, now)
    expect((await getMissionForAgent(m.id, agent, now))?.pro?.businessName).toContain('Boston Concrete')
    expect(await getMissionForAgent(m.id, await makeAgent(), now)).toBeNull()
  })
})

describe('acceptation et désistement', () => {
  beforeEach(resetDb)

  it('accepte, prévient le pro par SMS, et refuse un second agent', async () => {
    const [maya, sam] = [await makeAgent(), await makeAgent({ firstName: 'Sam' })]
    const m = await makeMission({ slotAt: later(48) })
    expect(await acceptMission(m.id, maya, now)).toEqual({ ok: true })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ status: 'ACCEPTED', agentId: maya.id, acceptedAt: now })
    expect(memorySmsDriver.sent.at(-1)?.body).toContain('Maya will visit you on')
    expect(await acceptMission(m.id, sam, now)).toEqual({ ok: false, error: 'This mission is no longer available.' })
  })

  it('3 missions acceptées au maximum', async () => {
    const agent = await makeAgent()
    for (let i = 0; i < 3; i++) await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(48) })
    const m = await makeMission({ slotAt: later(48) })
    expect(await acceptMission(m.id, agent, now)).toEqual({ ok: false, error: 'You can hold 3 missions at a time. Finish or release one first.' })
  })

  it('désistement possible à 24 h ou plus, refusé en dessous', async () => {
    const agent = await makeAgent()
    const ok = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(30), acceptedAt: now, reminderSentAt: now })
    expect(await releaseMission(ok.id, agent, now)).toEqual({ ok: true })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: ok.id } })).toMatchObject({ status: 'OPEN', agentId: null, reminderSentAt: null, publishedAt: now })
    expect(memorySmsDriver.sent.at(-1)?.body).toContain('can no longer make your visit')
    const late = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(10) })
    expect(await releaseMission(late.id, agent, now)).toEqual({ ok: false, error: 'Less than 24 hours before the visit: contact support to cancel.' })
  })
})

describe('outils du back-office', () => {
  beforeEach(resetDb)

  it('replanifie une mission ouverte et la republie', async () => {
    const m = await makeMission({ slotAt: later(-5), publishedAt: later(-100) })
    expect(await rescheduleMission(m.id, '2026-10-22T09:30', 'x', now)).toEqual({ ok: true })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ slotAt: new Date('2026-10-22T13:30:00Z'), publishedAt: now })
  })

  it('élargit le rayon et ajoute un bonus urgence', async () => {
    const m = await makeMission({ slotAt: later(48) })
    await widenMission(m.id, 50, 'x')
    await setUrgencyBonus(m.id, 1500, 'x')
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ broadcastRadiusMiles: 50, urgencyBonusCents: 1500 })
  })

  it('encarts : non prises, à replanifier, visites sans nouvelles', async () => {
    const agent = await makeAgent()
    const untaken = await makeMission({ slotAt: later(48), publishedAt: later(-49) })
    const past = await makeMission({ slotAt: later(-3) })
    const silent = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(-3) })
    await makeMission({ slotAt: later(48), publishedAt: later(-1) }) // récente : dans aucun encart
    const b = await adminBoards(now)
    expect(b.untaken.map((m) => m.id)).toEqual([untaken.id])
    expect(b.toReschedule.map((m) => m.id)).toEqual([past.id])
    expect(b.silent.map((m) => m.id)).toEqual([silent.id])
  })
})
