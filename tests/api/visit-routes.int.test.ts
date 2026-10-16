import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Agent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { POST as postSteps } from '@/app/api/agent/missions/[id]/steps/route'
import { POST as postPhoto } from '@/app/api/agent/missions/[id]/photos/route'
import { POST as postSubmit } from '@/app/api/agent/missions/[id]/submit/route'
import { DELETE as deletePhotoRoute } from '@/app/api/agent/missions/[id]/photos/[photoId]/route'

const session = vi.hoisted(() => ({ agent: null as Agent | null }))
vi.mock('@/lib/session', () => ({ currentAgent: async () => session.agent, currentAdmin: async () => null }))

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (body: unknown) => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const clientAt = new Date().toISOString()

describe('routes de visite', () => {
  beforeEach(async () => {
    await resetDb()
    session.agent = null
  })

  it('401 sans agent connecté', async () => {
    const res = await postSteps(json({ step: 'checkin', data: {} }), ctx('m1'))
    expect(res.status).toBe(401)
  })

  it('enregistre une étape et renvoie l’état de la visite', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    const res = await postSteps(json({ step: 'checkin', data: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt } }), ctx(m.id))
    expect(res.status).toBe(200)
    expect((await res.json()).state.steps.checkin.lat).toBe(42.3564)
  })

  it('400 sur un JSON illisible, statut du service sinon', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    const bad = new Request('http://localhost/api', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } })
    expect((await postSteps(bad, ctx(m.id))).status).toBe(400)
    const early = await postSteps(json({ step: 'invite', data: { result: 'INVITE_SENT', clientAt } }), ctx(m.id))
    expect(early.status).toBe(409)
    expect(await early.json()).toEqual({ error: 'Check in first.' })
  })

  it('reçoit une photo en multipart', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    await postSteps(json({ step: 'checkin', data: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt } }), ctx(m.id))
    const form = new FormData()
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'p.jpg', { type: 'image/jpeg' }))
    form.set('category', 'LOGO')
    form.set('clientAt', clientAt)
    form.set('exifLat', '42.3564')
    form.set('exifLng', '-71.0621')
    const res = await postPhoto(new Request('http://localhost/api', { method: 'POST', body: form }), ctx(m.id))
    expect(res.status).toBe(200)
    expect(await prisma.photo.count()).toBe(1)
  })

  it('400 sur un corps JSON null ; suppression d’une photo', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    expect((await postSteps(json(null), ctx(m.id))).status).toBe(400)
    await postSteps(json({ step: 'checkin', data: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt } }), ctx(m.id))
    const form = new FormData()
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'p.jpg', { type: 'image/jpeg' }))
    form.set('category', 'TEAM')
    form.set('clientAt', clientAt)
    await postPhoto(new Request('http://localhost/api', { method: 'POST', body: form }), ctx(m.id))
    const photo = await prisma.photo.findFirstOrThrow()
    const res = await deletePhotoRoute(new Request('http://localhost/api', { method: 'DELETE' }), { params: Promise.resolve({ id: m.id, photoId: photo.id }) })
    expect(res.status).toBe(200)
    expect(await prisma.photo.count()).toBe(0)
  })

  it('la soumission incomplète renvoie 409 avec les étapes manquantes', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    const res = await postSubmit(new Request('http://localhost/api', { method: 'POST' }), ctx(m.id))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('checkin')
  })
})
