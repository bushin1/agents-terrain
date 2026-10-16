import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { getStorage } from '@/modules/storage'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { CONSENT_VERSION } from './consent-text'
import { addPhoto, getVisitState, saveStep, submitVisit } from './visit'

const clientAt = '2026-10-16T14:00:00.000Z'
const now = new Date('2026-10-16T14:00:05Z')
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
const steps = {
  checkin: { lat: 42.3565, lng: -71.0622, accuracy: 12, clientAt },
  consent: { signerName: 'Frank Delgado', textVersion: CONSENT_VERSION, signaturePng: PNG, clientAt },
  profile: { listingName: 'Delgado Concrete & Masonry', category: 'Concrete contractor', city: 'Boston', zip: '02108', mode: 'CREATED', clientAt },
  invite: { result: 'INVITE_SENT', clientAt },
  verification: { result: 'VIDEO_NOT_OFFERED', clientAt },
  checkout: { clientAt },
} as const

async function accepted() {
  const agent = await makeAgent()
  const mission = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: new Date('2026-10-16T14:00:00Z') })
  return { agent, mission }
}

async function completeVisit(agentId: string, missionId: string) {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } })
  for (const [name, data] of Object.entries(steps)) expect((await saveStep(agent, missionId, name, data, now)).ok).toBe(true)
  for (let i = 0; i < 10; i++) {
    expect((await addPhoto(agent, missionId, { bytes: JPEG, category: i < 2 ? 'LOGO' : 'JOB', clientAt }, now)).ok).toBe(true)
  }
  return agent
}

describe('checklist de visite', () => {
  beforeEach(resetDb)

  it('enregistre le check-in avec l’heure de réception serveur', async () => {
    const { agent, mission } = await accepted()
    const r = await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.steps.checkin).toMatchObject({ lat: 42.3565, receivedAt: now.toISOString() })
    expect(r.state.missing).not.toContain('checkin')
  })

  it('exige le check-in avant toute autre étape', async () => {
    const { agent, mission } = await accepted()
    expect(await saveStep(agent, mission.id, 'invite', steps.invite, now)).toEqual({ ok: false, status: 409, error: 'Check in first.' })
  })

  it('stocke la signature comme fichier et n’en garde que la clé', async () => {
    const { agent, mission } = await accepted()
    await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    const r = await saveStep(agent, mission.id, 'consent', steps.consent, now)
    if (!r.ok) throw new Error(r.error)
    const key = r.state.steps.consent!.signatureKey
    expect(key).toMatch(/^missions\/[a-z0-9]+\/signature-[a-f0-9]{32}\.png$/)
    expect(await getStorage().get(key)).not.toBeNull()
    expect(JSON.stringify(r.state.steps)).not.toContain('base64')
  })

  it('refuse un texte d’accord périmé et un fichier photo qui n’est pas un JPEG', async () => {
    const { agent, mission } = await accepted()
    await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    expect(await saveStep(agent, mission.id, 'consent', { ...steps.consent, textVersion: 'consent-v0' }, now))
      .toEqual({ ok: false, status: 409, error: 'The consent text changed. Reload the page.' })
    expect(await addPhoto(agent, mission.id, { bytes: Buffer.from('hello'), category: 'LOGO', clientAt }, now))
      .toEqual({ ok: false, status: 400, error: 'Photos must be JPEG images.' })
  })

  it('refuse la soumission tant qu’il manque des étapes', async () => {
    const { agent, mission } = await accepted()
    await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    const r = await submitVisit(agent, mission.id, now)
    expect(r).toMatchObject({ ok: false, status: 409 })
    if (!r.ok) expect(r.error).toContain('photos')
  })

  it('soumet une visite complète : SUBMITTED, SMS au pro, alertes calculées', async () => {
    const { agent, mission } = await accepted()
    await completeVisit(agent.id, mission.id)
    const r = await submitVisit(agent, mission.id, now)
    expect(r.ok).toBe(true)
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'SUBMITTED', submittedAt: now, postVisitSmsAt: now })
    expect(memorySmsDriver.sent.at(-1)?.body).toContain('Reply 1-5')
    expect(await prisma.fraudFlag.count()).toBe(0)
  })

  it('en NEEDS_FIX : check-in figé, photos modifiables, pas de second SMS au pro', async () => {
    const { agent, mission } = await accepted()
    await completeVisit(agent.id, mission.id)
    await submitVisit(agent, mission.id, now)
    await prisma.mission.update({ where: { id: mission.id }, data: { status: 'NEEDS_FIX', needsFixAt: now, fixMessage: 'Add a truck photo.' } })
    const sms = memorySmsDriver.sent.length
    expect(await saveStep(agent, mission.id, 'checkin', steps.checkin, now)).toEqual({ ok: false, status: 409, error: 'This step can no longer be changed.' })
    expect((await addPhoto(agent, mission.id, { bytes: JPEG, category: 'VEHICLE', clientAt }, now)).ok).toBe(true)
    expect((await submitVisit(agent, mission.id, now)).ok).toBe(true)
    expect(memorySmsDriver.sent.length).toBe(sms)
  })

  it('refuse un check-in plus de 24 h après le créneau, et un agent suspendu', async () => {
    const { agent, mission } = await accepted()
    const late = new Date(mission.slotAt.getTime() + 25 * 3_600_000)
    expect(await saveStep(agent, mission.id, 'checkin', steps.checkin, late)).toEqual({ ok: false, status: 409, error: 'Too late to check in for this visit. Contact support.' })
    const suspended = { ...agent, status: 'SUSPENDED' as const }
    expect(await saveStep(suspended, mission.id, 'checkin', steps.checkin, now)).toEqual({ ok: false, status: 409, error: 'Your account is not active. Contact support.' })
  })

  it('une mission reprise par l’équipe n’est plus modifiable par l’ancien agent', async () => {
    const { agent, mission } = await accepted()
    await prisma.mission.update({ where: { id: mission.id }, data: { status: 'OPEN', agentId: null } })
    expect(await saveStep(agent, mission.id, 'checkin', steps.checkin, now)).toEqual({ ok: false, status: 404, error: 'Mission not found.' })
    expect(await getVisitState(mission.id, agent)).toBeNull()
  })
})
