import { randomUUID } from 'node:crypto'
import type { Agent, Mission, PhotoCategory, Pro } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { managerInviteEmail } from '@/lib/brand'
import { logAudit } from '@/modules/audit'
import { refreshFraudFlags } from '@/modules/review/flags'
import { sendSms, smsTemplates } from '@/modules/sms'
import { getStorage } from '@/modules/storage'
import { MIN_PHOTOS, editableSteps, missingSteps, parseStepInput, type StepName, type StepsData } from './checklist-rule'
import { CONSENT_VERSION, consentText } from './consent-text'
import { NO_SHOW_RELEASE_HOURS } from './mission-rule'
import { moveMission } from './transition'

export const MAX_PHOTOS = 20
const MAX_PHOTO_BYTES = 3_000_000
const CATEGORIES: PhotoCategory[] = ['LOGO', 'VEHICLE', 'TEAM', 'EQUIPMENT', 'JOB']

export interface VisitState {
  missionId: string
  type: Mission['type']
  status: Mission['status']
  businessName: string
  steps: StepsData
  photos: { id: string; category: PhotoCategory; url: string }[]
  missing: StepName[]
  editable: StepName[]
  minPhotos: number
  maxPhotos: number
  consent: { version: string; text: string[] }
  managerEmail: string
  claimExisting: boolean
  fixMessage: string | null
}

export type VisitResult = { ok: true; state: VisitState } | { ok: false; status: 400 | 404 | 409; error: string }

const fail = (status: 400 | 404 | 409, error: string) => ({ ok: false as const, status, error })
const isPng = (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
const fileId = () => randomUUID().replaceAll('-', '')

type Loaded = Mission & { pro: Pro; submission: { steps: unknown; photos: { id: string; category: PhotoCategory; storageKey: string }[] } | null }

async function load(missionId: string, agentId: string): Promise<Loaded | null> {
  const m = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { pro: true, submission: { include: { photos: { orderBy: { receivedAt: 'asc' } } } } },
  })
  return m && m.agentId === agentId ? m : null
}

function toState(m: Loaded): VisitState {
  const steps = (m.submission?.steps ?? {}) as StepsData
  const photos = m.submission?.photos ?? []
  return {
    missionId: m.id,
    type: m.type,
    status: m.status,
    businessName: m.pro.businessName,
    steps,
    photos: photos.map((p) => ({ id: p.id, category: p.category, url: `/api/files/${p.storageKey}` })),
    missing: missingSteps(m.type, steps, photos.length),
    editable: editableSteps(m.type, m.status),
    minPhotos: MIN_PHOTOS,
    maxPhotos: MAX_PHOTOS,
    consent: { version: CONSENT_VERSION, text: consentText() },
    managerEmail: managerInviteEmail(),
    claimExisting: m.pro.existingPlaceId != null,
    fixMessage: m.fixMessage,
  }
}

export async function getVisitState(missionId: string, agent: Agent): Promise<VisitState | null> {
  const m = await load(missionId, agent.id)
  return m ? toState(m) : null
}

async function reload(missionId: string, agent: Agent): Promise<VisitResult> {
  const m = await load(missionId, agent.id)
  return m ? { ok: true, state: toState(m) } : fail(404, 'Mission not found.')
}

export const TOO_LATE = 'Too late to check in for this visit. Contact support.'

/** Seul un agent ACTIVE modifie une visite (un agent suspendu ne corrige plus ses missions). */
const inactive = (agent: Agent) => (agent.status !== 'ACTIVE' ? fail(409, 'Your account is not active. Contact support.') : null)

/** Enregistre une étape de la checklist (spec §4.6, §7.2). Les sauvegardes d'une même mission sont sérialisées. */
export async function saveStep(agent: Agent, missionId: string, step: string, data: unknown, now: Date = new Date()): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  const parsed = parseStepInput(step, data)

  // La signature est envoyée au stockage AVANT la transaction (pas d'appel réseau sous verrou).
  let signatureKey: string | null = null
  if (parsed.success && parsed.step === 'consent') {
    const c = parsed.data as unknown as { textVersion: string; signaturePng: string }
    if (c.textVersion !== CONSENT_VERSION) return fail(409, 'The consent text changed. Reload the page.')
    const png = Buffer.from(c.signaturePng.slice(c.signaturePng.indexOf(',') + 1), 'base64')
    if (!isPng(png)) return fail(400, 'Invalid signature image.')
    const owned = await prisma.mission.findUnique({ where: { id: missionId }, select: { agentId: true } })
    if (owned?.agentId !== agent.id) return fail(404, 'Mission not found.')
    signatureKey = `missions/${missionId}/signature-${fileId()}.png`
    await getStorage().put(signatureKey, png)
  }

  const out = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${missionId}))) AS l`
    const m = await tx.mission.findUnique({ where: { id: missionId }, include: { submission: true } })
    if (!m || m.agentId !== agent.id) {
      // Mission reprise pour absence (tâche planifiée) : on le dit à l'agent plutôt qu'un « introuvable ».
      const noShow = await tx.fraudFlag.findUnique({ where: { missionId_agentId_type: { missionId, agentId: agent.id, type: 'NO_SHOW' } } })
      return noShow ? fail(409, TOO_LATE) : fail(404, 'Mission not found.')
    }
    if (m.status !== 'ACCEPTED' && m.status !== 'NEEDS_FIX') return fail(409, 'This visit can no longer be edited.')
    if (!parsed.success) return fail(400, parsed.error)
    if (!editableSteps(m.type, m.status).includes(parsed.step)) return fail(409, 'This step can no longer be changed.')
    const current = (m.submission?.steps ?? {}) as StepsData
    if (parsed.step !== 'checkin' && !current.checkin) return fail(409, 'Check in first.')
    // Check-in tardif refusé (spec §4.5) : au-delà de 24 h après le créneau, la mission doit être reprise.
    if (parsed.step === 'checkin' && !current.checkin && now.getTime() - m.slotAt.getTime() >= NO_SHOW_RELEASE_HOURS * 3_600_000) {
      return fail(409, TOO_LATE)
    }
    let value: Record<string, unknown> = parsed.data
    if (parsed.step === 'consent') {
      const c = parsed.data as { signerName: string; textVersion: string; clientAt: string }
      value = { signerName: c.signerName, textVersion: c.textVersion, signatureKey, clientAt: c.clientAt }
    }
    const next = { ...current, [parsed.step]: { ...value, receivedAt: now.toISOString() } }
    await tx.submission.upsert({ where: { missionId }, create: { missionId, steps: next }, update: { steps: next } })
    return { ok: true as const }
  })
  return out.ok ? reload(missionId, agent) : out
}

export interface PhotoInput {
  bytes: Buffer
  category: string
  clientAt: string
  exifTakenAt?: string | null
  exifLat?: number | null
  exifLng?: number | null
}

export async function addPhoto(agent: Agent, missionId: string, input: PhotoInput, now: Date = new Date()): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  if (!CATEGORIES.includes(input.category as PhotoCategory)) return fail(400, 'Unknown photo category.')
  if (!isJpeg(input.bytes)) return fail(400, 'Photos must be JPEG images.')
  if (input.bytes.length > MAX_PHOTO_BYTES) return fail(400, 'Photo too large.')
  const clientAt = new Date(input.clientAt)
  if (Number.isNaN(clientAt.getTime())) return fail(400, 'Invalid photo time.')
  const m = await load(missionId, agent.id)
  if (!m) return fail(404, 'Mission not found.')
  const taken = input.exifTakenAt ? new Date(input.exifTakenAt) : null
  const geoOk = input.exifLat != null && input.exifLng != null && Math.abs(input.exifLat) <= 90 && Math.abs(input.exifLng) <= 180

  // Fichier envoyé avant la transaction ; contrôles et plafond refaits sous le verrou de la mission.
  const storageKey = `missions/${missionId}/photos/${fileId()}.jpg`
  await getStorage().put(storageKey, input.bytes)
  const out = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${missionId}))) AS l`
    const fresh = await tx.mission.findUnique({ where: { id: missionId }, include: { submission: { include: { _count: { select: { photos: true } } } } } })
    if (!fresh || fresh.agentId !== agent.id) return fail(404, 'Mission not found.')
    if (!editableSteps(fresh.type, fresh.status).includes('photos')) return fail(409, 'Photos can no longer be changed.')
    if (!((fresh.submission?.steps ?? {}) as StepsData).checkin) return fail(409, 'Check in first.')
    if ((fresh.submission?._count.photos ?? 0) >= MAX_PHOTOS) return fail(409, `You can add up to ${MAX_PHOTOS} photos.`)
    const submission = await tx.submission.upsert({ where: { missionId }, create: { missionId }, update: {} })
    await tx.photo.create({
      data: {
        submissionId: submission.id,
        storageKey,
        category: input.category as PhotoCategory,
        exifTakenAt: taken && !Number.isNaN(taken.getTime()) ? taken : null,
        exifLat: geoOk ? input.exifLat! : null,
        exifLng: geoOk ? input.exifLng! : null,
        clientAt,
        receivedAt: now,
      },
    })
    return { ok: true as const }
  })
  return out.ok ? reload(missionId, agent) : out
}

export async function deletePhoto(agent: Agent, missionId: string, photoId: string): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  const m = await load(missionId, agent.id)
  if (!m) return fail(404, 'Mission not found.')
  if (!editableSteps(m.type, m.status).includes('photos')) return fail(409, 'Photos can no longer be changed.')
  await prisma.photo.deleteMany({ where: { id: photoId, submission: { missionId } } })
  return reload(missionId, agent)
}

/** Soumission (spec §4.6) : toutes les étapes faites ; SMS au pro à la première soumission seulement. */
export async function submitVisit(agent: Agent, missionId: string, now: Date = new Date()): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  const m = await load(missionId, agent.id)
  if (!m) return fail(404, 'Mission not found.')
  if (m.status !== 'ACCEPTED' && m.status !== 'NEEDS_FIX') return fail(409, 'This visit was already submitted.')
  const missing = missingSteps(m.type, (m.submission?.steps ?? {}) as StepsData, m.submission?.photos.length ?? 0)
  if (missing.length > 0) return fail(409, `Finish these steps first: ${missing.join(', ')}.`)

  const firstSubmission = m.status === 'ACCEPTED' && !m.postVisitSmsAt
  try {
    await prisma.$transaction(async (tx) => {
      await moveMission(tx, missionId, 'SUBMITTED', `agent:${agent.id}`, {
        data: { submittedAt: now, needsFixAt: null, ...(firstSubmission ? { postVisitSmsAt: now } : {}) },
      })
      await logAudit(tx, { actor: `agent:${agent.id}`, action: 'visit.submit', entity: 'Mission', entityId: missionId, data: { photos: m.submission?.photos.length ?? 0 } })
      // Dans la transaction : une visite n'arrive jamais dans la file de validation sans ses alertes.
      await refreshFraudFlags(missionId, tx)
    })
  } catch (e) {
    // Double envoi simultané : le second trouve la mission déjà SUBMITTED.
    if (e instanceof Error && /Transition refusée|a changé entre-temps/.test(e.message)) return fail(409, 'This visit was already submitted.')
    throw e
  }
  if (firstSubmission) {
    try {
      await sendSms(m.pro.phone, smsTemplates.proPostVisit({ agentFirstName: agent.firstName }))
    } catch (e) {
      console.error('[visit] SMS après visite échoué', e)
    }
  }
  return reload(missionId, agent)
}
