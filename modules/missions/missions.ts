import type { Agent, Mission, MissionStatus, MissionType, Pro } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { formatSlot, zonedLocalToUtc } from '@/lib/time'
import { logAudit } from '@/modules/audit'
import { approximate, distanceMiles } from '@/modules/geo'
import { computeAmount, levelFor } from '@/modules/ledger'
import { getSettings } from '@/modules/settings'
import { sendSms, smsTemplates } from '@/modules/sms'
import type { StepsData } from './checklist-rule'
import { isUntaken, isVisibleTo, needsReschedule } from './dispatch-rule'
import { MAX_ACCEPTED_PER_AGENT, NO_SHOW_SMS_HOURS, RELEASE_MIN_HOURS, canRelease } from './mission-rule'
import { proStatusAfter } from './pro-rule'
import { RELEASE_RESET, moveMission } from './transition'

const H = 3_600_000

export const MissionInputSchema = z.object({
  slotLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Créneau invalide'),
  suggestedCategory: z.string().trim().min(2, 'Catégorie manquante').max(100),
  instructions: z.string().trim().max(1000).optional().transform((v) => v || null),
})

type Fail = { ok: false; error: string }

/** Crée une visite pour un pro AGREED. Le passage AGREED → MISSION_OPEN est conditionnel : une seule création gagne. */
export async function createMission(proId: string, input: Record<string, unknown>, actor: string, now: Date = new Date()): Promise<{ ok: true; mission: Mission } | Fail> {
  const parsed = MissionInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  return prisma.$transaction(async (tx) => {
    const pro = await tx.pro.findUniqueOrThrow({ where: { id: proId } })
    if (pro.status !== 'AGREED') return { ok: false as const, error: `Le pro doit être « d'accord » (statut actuel : ${pro.status})` }
    if (pro.lat == null || pro.lng == null) return { ok: false as const, error: 'Coordonnées du pro manquantes : corrigez son adresse ou saisissez-les.' }
    const slotAt = zonedLocalToUtc(parsed.data.slotLocal, pro.timeZone)
    if (slotAt <= now) return { ok: false as const, error: 'Le créneau doit être dans le futur' }
    const next = proStatusAfter(pro.status, { kind: 'CREATED', missionType: 'VISIT' })
    const claimed = await tx.pro.updateMany({ where: { id: proId, status: 'AGREED' }, data: { status: next } })
    if (claimed.count !== 1) return { ok: false as const, error: 'Une mission vient d’être créée pour ce pro.' }
    const mission = await tx.mission.create({
      data: { proId, slotAt, publishedAt: now, suggestedCategory: parsed.data.suggestedCategory, instructions: parsed.data.instructions },
    })
    await logAudit(tx, { actor, action: 'mission.create', entity: 'Mission', entityId: mission.id })
    return { ok: true as const, mission }
  })
}

export interface MissionSummary {
  id: string
  type: MissionType
  status: MissionStatus
  trade: string
  city: string
  state: string
  distanceMiles: number
  slotAt: string
  slotLabel: string
  approx: { lat: number; lng: number } // position arrondie (≈ 1 km) : jamais l'adresse avant acceptation
  urgencyBonusCents: number
}

function toSummary(m: Mission, pro: Pro, from: { lat: number; lng: number }): MissionSummary {
  const point = { lat: pro.lat ?? from.lat, lng: pro.lng ?? from.lng }
  return {
    id: m.id,
    type: m.type,
    status: m.status,
    trade: pro.trade,
    city: pro.city,
    state: pro.state,
    distanceMiles: Math.round(distanceMiles(from, point) * 10) / 10,
    slotAt: m.slotAt.toISOString(),
    slotLabel: formatSlot(m.slotAt, pro.timeZone),
    approx: approximate(point),
    urgencyBonusCents: m.urgencyBonusCents,
  }
}

/** Missions proposées à un agent ACTIVE (spec §4.5), triées par distance. */
export async function listOpenMissionsFor(agent: Agent, now: Date = new Date()): Promise<MissionSummary[]> {
  if (agent.status !== 'ACTIVE') return []
  const missions = await prisma.mission.findMany({ where: { status: 'OPEN', slotAt: { gt: now } }, include: { pro: true } })
  return missions
    .filter((m) => isVisibleTo({ agent, mission: m, pro: m.pro, now }))
    .map((m) => toSummary(m, m.pro, agent))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

export type PayBreakdown = {
  kind: MissionType
  visitCents: number
  liveCents: number
  clientCents: number
  returnVisitCents: number
  urgencyCents: number
  levelName: 'BRONZE' | 'SILVER' | 'GOLD'
  levelBonusPct: number
  levelBonusCents: number
  upToCents: number
}

/** Paie affichée avant d'accepter : montants de base, bonus de niveau (cette mission comprise) et bonus urgence. */
export async function payBreakdownFor(agent: Agent, mission: Pick<Mission, 'type' | 'urgencyBonusCents'>): Promise<PayBreakdown> {
  const settings = await getSettings()
  const validatedCount = (await prisma.mission.count({ where: { agentId: agent.id, status: 'VALIDATED' } })) + 1
  const level = levelFor(validatedCount, settings.levels)
  type PaidTier = keyof typeof settings.tierAmountsCents // VISIT | LIVE | CLIENT | RETURN_VISIT
  const tiers: PaidTier[] = mission.type === 'RETURN_VISIT' ? ['RETURN_VISIT'] : ['VISIT', 'LIVE', 'CLIENT']
  const parts = tiers.map((tier) => computeAmount({ tier, validatedCount, urgencyBonusCents: 0, settings }))
  const base = (t: PaidTier) => (tiers.includes(t) ? settings.tierAmountsCents[t] : 0)
  const levelBonusCents = parts.reduce((s, p) => s + p.amountCents - p.baseAmountCents, 0)
  const baseTotal = parts.reduce((s, p) => s + p.baseAmountCents, 0)
  return {
    kind: mission.type,
    visitCents: base('VISIT'),
    liveCents: base('LIVE'),
    clientCents: base('CLIENT'),
    returnVisitCents: base('RETURN_VISIT'),
    urgencyCents: mission.urgencyBonusCents,
    levelName: level.name,
    levelBonusPct: level.bonusPct,
    levelBonusCents,
    upToCents: baseTotal + levelBonusCents + mission.urgencyBonusCents,
  }
}

export interface MissionDetail {
  summary: MissionSummary
  mine: boolean
  suggestedCategory: string
  instructions: string[]
  bookedAt: string
  claimExisting: boolean
  canRelease: boolean
  releaseDeadlineLabel: string
  fixMessage: string | null
  pay: PayBreakdown
  pro: { businessName: string; contactName: string | null; phone: string; address: string; city: string; state: string; zip: string } | null
}

/** Détail pour un agent : le pro (nom, adresse, téléphone) n'est révélé qu'à l'agent qui a la mission. */
export async function getMissionForAgent(missionId: string, agent: Agent, now: Date = new Date()): Promise<MissionDetail | null> {
  const m = await prisma.mission.findUnique({ where: { id: missionId }, include: { pro: true } })
  if (!m) return null
  const mine = m.agentId === agent.id
  if (!mine && !(agent.status === 'ACTIVE' && isVisibleTo({ agent, mission: m, pro: m.pro, now }))) return null
  const p = m.pro
  return {
    summary: toSummary(m, p, agent),
    mine,
    suggestedCategory: m.suggestedCategory,
    instructions: (m.instructions ?? '').split('\n').map((l) => l.trim()).filter(Boolean),
    bookedAt: m.createdAt.toISOString(),
    claimExisting: p.existingPlaceId != null,
    canRelease: mine && m.status === 'ACCEPTED' && canRelease(m.slotAt, now),
    releaseDeadlineLabel: formatSlot(new Date(m.slotAt.getTime() - RELEASE_MIN_HOURS * H), p.timeZone),
    fixMessage: mine ? m.fixMessage : null,
    pay: await payBreakdownFor(agent, m),
    pro: mine ? { businessName: p.businessName, contactName: p.contactName, phone: p.phone, address: p.address, city: p.city, state: p.state, zip: p.zip } : null,
  }
}

/** Acceptation atomique : une mission n'a qu'un agent, un agent n'a pas plus de 3 missions acceptées. */
export async function acceptMission(missionId: string, agent: Agent, now: Date = new Date()): Promise<{ ok: true } | Fail> {
  if (agent.status !== 'ACTIVE') return { ok: false, error: 'Your account is not active yet.' }
  const res = await prisma.$transaction(async (tx) => {
    // Sérialise les acceptations d'un même agent, pour que la limite de 3 tienne en cas de double clic.
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${agent.id}))) AS l`
    // Statut relu sous le verrou (suspendAgent prend le même) : un agent suspendu à l'instant n'accepte rien.
    const fresh = await tx.agent.findUniqueOrThrow({ where: { id: agent.id }, select: { status: true } })
    if (fresh.status !== 'ACTIVE') return { ok: false as const, error: 'Your account is not active.' }
    const held = await tx.mission.count({ where: { agentId: agent.id, status: 'ACCEPTED' } })
    if (held >= MAX_ACCEPTED_PER_AGENT) {
      return { ok: false as const, error: `You can hold ${MAX_ACCEPTED_PER_AGENT} missions at a time. Finish or release one first.` }
    }
    const m = await tx.mission.findUnique({ where: { id: missionId }, include: { pro: true } })
    if (!m || !isVisibleTo({ agent, mission: m, pro: m.pro, now })) return { ok: false as const, error: 'This mission is no longer available.' }
    const taken = await tx.mission.updateMany({
      where: { id: missionId, status: 'OPEN', agentId: null },
      data: { status: 'ACCEPTED', agentId: agent.id, acceptedAt: now, reminderSentAt: null, noShowSmsAt: null },
    })
    if (taken.count !== 1) return { ok: false as const, error: 'This mission is no longer available.' }
    await logAudit(tx, { actor: `agent:${agent.id}`, action: 'mission.accepted', entity: 'Mission', entityId: missionId })
    return { ok: true as const, pro: m.pro, slotAt: m.slotAt }
  })
  if (!res.ok) return res
  try {
    await sendSms(res.pro.phone, smsTemplates.proVisitConfirmed({ agentFirstName: agent.firstName, slot: formatSlot(res.slotAt, res.pro.timeZone) }))
  } catch (e) {
    console.error('[missions] SMS de confirmation au pro échoué', e) // l'acceptation reste valable
  }
  return { ok: true }
}

/** Désistement de l'agent, jusqu'à 24 h avant le créneau (spec §4.5). */
export async function releaseMission(missionId: string, agent: Agent, now: Date = new Date()): Promise<{ ok: true } | Fail> {
  const m = await prisma.mission.findUnique({ where: { id: missionId } })
  if (!m || m.agentId !== agent.id || m.status !== 'ACCEPTED') return { ok: false, error: 'You can’t release this mission.' }
  if (!canRelease(m.slotAt, now)) return { ok: false, error: 'Less than 24 hours before the visit: contact support to cancel.' }
  // Republiée : le compteur « non prise depuis 48 h » repart de zéro.
  await prisma.$transaction((tx) => moveMission(tx, missionId, 'OPEN', `agent:${agent.id}`, { data: { ...RELEASE_RESET, publishedAt: now }, reason: 'Désistement de l’agent' }))
  await notifyProAgentChanged(missionId, agent.firstName)
  return { ok: true }
}

/** Prévient le pro que l'agent annoncé ne viendra pas (il avait reçu « Maya will visit you… »). */
export async function notifyProAgentChanged(missionId: string, agentFirstName: string): Promise<void> {
  const m = await prisma.mission.findUnique({ where: { id: missionId }, include: { pro: true } })
  if (!m) return
  try {
    await sendSms(m.pro.phone, smsTemplates.proAgentChanged({ agentFirstName, slot: formatSlot(m.slotAt, m.pro.timeZone) }))
  } catch (e) {
    console.error('[missions] SMS au pro (changement d’agent) échoué', e)
  }
}

export async function cancelMission(missionId: string, actor: string, reason: string, markProLost = false): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  await prisma.$transaction((tx) => moveMission(tx, missionId, 'CANCELLED', actor, { data: { cancelReason: reason }, reason, markProLost }))
}

/** Nouveau créneau pour une mission OPEN ; elle est republiée (le compteur « non prise » repart de zéro). */
export async function rescheduleMission(missionId: string, slotLocal: string, actor: string, now: Date = new Date()): Promise<{ ok: true } | Fail> {
  const m = await prisma.mission.findUniqueOrThrow({ where: { id: missionId }, include: { pro: true } })
  if (m.status !== 'OPEN') return { ok: false, error: 'Seule une mission ouverte se replanifie.' }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(slotLocal)) return { ok: false, error: 'Créneau invalide' }
  const slotAt = zonedLocalToUtc(slotLocal, m.pro.timeZone)
  if (slotAt <= now) return { ok: false, error: 'Le créneau doit être dans le futur' }
  return prisma.$transaction(async (tx) => {
    // Conditionnel : si un agent vient d'accepter, on ne déplace pas un créneau qu'il a déjà confirmé.
    const res = await tx.mission.updateMany({ where: { id: missionId, status: 'OPEN' }, data: { slotAt, publishedAt: now, reminderSentAt: null, noShowSmsAt: null } })
    if (res.count !== 1) return { ok: false as const, error: 'La mission vient d’être acceptée : rechargez la page.' }
    await logAudit(tx, { actor, action: 'mission.reschedule', entity: 'Mission', entityId: missionId, data: { slotAt: slotAt.toISOString() } })
    return { ok: true as const }
  })
}

export async function widenMission(missionId: string, miles: number, actor: string): Promise<void> {
  if (!Number.isInteger(miles) || miles < 1 || miles > 200) throw new Error('Rayon entre 1 et 200 miles')
  await prisma.$transaction(async (tx) => {
    const res = await tx.mission.updateMany({ where: { id: missionId, status: 'OPEN' }, data: { broadcastRadiusMiles: miles } })
    if (res.count !== 1) throw new Error('Seule une mission ouverte peut être élargie')
    await logAudit(tx, { actor, action: 'mission.widen', entity: 'Mission', entityId: missionId, data: { miles } })
  })
}

export async function setUrgencyBonus(missionId: string, cents: number, actor: string): Promise<void> {
  if (!Number.isInteger(cents) || cents < 0 || cents > 10_000) throw new Error('Bonus entre 0 et 100 $')
  await prisma.$transaction(async (tx) => {
    const res = await tx.mission.updateMany({ where: { id: missionId, status: { in: ['OPEN', 'ACCEPTED'] } }, data: { urgencyBonusCents: cents } })
    if (res.count !== 1) throw new Error('Bonus possible seulement sur une mission ouverte ou acceptée')
    await logAudit(tx, { actor, action: 'mission.urgency_bonus', entity: 'Mission', entityId: missionId, data: { cents } })
  })
}

/** Encarts du back-office (spec §5.2). */
export async function adminBoards(now: Date = new Date()) {
  const open = await prisma.mission.findMany({ where: { status: 'OPEN' }, include: { pro: true }, orderBy: { slotAt: 'asc' } })
  const late = await prisma.mission.findMany({
    where: { status: 'ACCEPTED', slotAt: { lte: new Date(now.getTime() - NO_SHOW_SMS_HOURS * H) } },
    include: { pro: true, agent: true, submission: true },
    orderBy: { slotAt: 'asc' },
  })
  return {
    untaken: open.filter((m) => isUntaken(m, now)),
    toReschedule: open.filter((m) => needsReschedule(m, now)),
    silent: late.filter((m) => !((m.submission?.steps ?? {}) as StepsData).checkin),
  }
}

export async function listMissions(filter: { status?: MissionStatus } = {}) {
  return prisma.mission.findMany({
    where: filter.status ? { status: filter.status } : {},
    include: { pro: true, agent: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { slotAt: 'desc' },
    take: 300,
  })
}

/** Missions d'un agent pour l'onglet « Visits ». */
export async function listAgentMissions(agent: Agent) {
  const missions = await prisma.mission.findMany({
    where: { agentId: agent.id },
    include: { pro: true, earnings: true },
    orderBy: { slotAt: 'desc' },
    take: 100,
  })
  return missions.map((m) => ({ ...toSummary(m, m.pro, agent), businessName: m.pro.businessName, earnedCents: m.earnings.filter((e) => e.status !== 'VOID').reduce((s, e) => s + e.amountCents, 0) }))
}
