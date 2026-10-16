import type { FraudType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { distanceMeters } from '@/modules/geo'
import { award } from '@/modules/ledger'
import type { StepsData } from '@/modules/missions/checklist-rule'
import { moveMission } from '@/modules/missions/transition'
import { sendSms, smsTemplates } from '@/modules/sms'
import { LOW_RATING_MAX } from './fraud-rule'

export { refreshFraudFlags } from './flags'
export { LOW_RATING_MAX, computeFraudFlags, normalizeAddress } from './fraud-rule'
export { handleInboundSms, listInbound, markInboundHandled } from './inbound'

// Réponses du pro qui imposent une confirmation explicite avant de valider (spec §10).
const NEEDS_CONFIRMATION: FraudType[] = ['PRO_DENIED', 'LOW_PRO_RATING']

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`

async function notify(phone: string, body: string) {
  try {
    await sendSms(phone, body)
  } catch (e) {
    console.error('[review] SMS à l’agent échoué', e)
  }
}

export async function listQueue() {
  return prisma.mission.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { submittedAt: 'asc' },
    include: {
      pro: { select: { businessName: true, city: true, state: true, trade: true } },
      agent: { select: { id: true, firstName: true, lastName: true } },
      flags: { where: { resolved: false } },
      submission: { select: { _count: { select: { photos: true } } } },
    },
  })
}

export async function getReviewDetail(missionId: string) {
  const m = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      pro: true,
      agent: true,
      flags: { orderBy: { createdAt: 'desc' } },
      submission: { include: { photos: { orderBy: { receivedAt: 'asc' } } } },
    },
  })
  if (!m) return null
  const steps = (m.submission?.steps ?? {}) as StepsData
  const checkinDistanceMeters =
    steps.checkin && m.pro.lat != null && m.pro.lng != null
      ? Math.round(distanceMeters(steps.checkin, { lat: m.pro.lat, lng: m.pro.lng }))
      : null
  return { ...m, steps, checkinDistanceMeters }
}

export type ValidateResult = { ok: true; earnedCents: number } | { ok: false; error: string; needsConfirmation?: true }

/** Valide une visite soumise : statut, pro, gains (VISIT ou RETURN_VISIT, + URGENCY), puis SMS à l'agent. */
export async function validate(missionId: string, actor: string, opts: { confirmFlags?: boolean } = {}, now: Date = new Date()): Promise<ValidateResult> {
  const res = await prisma.$transaction(async (tx) => {
    // Double contrôle : les alertes ET la réponse brute du pro (au cas où une alerte manquerait).
    const pre = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, select: { proDenied: true, proRating: true } })
    const flagged = await tx.fraudFlag.count({ where: { missionId, resolved: false, type: { in: NEEDS_CONFIRMATION } } })
    const blocking = flagged > 0 || pre.proDenied || (pre.proRating != null && pre.proRating <= LOW_RATING_MAX)
    if (blocking && !opts.confirmFlags) {
      return { ok: false as const, needsConfirmation: true as const, error: 'Le pro a signalé un problème : confirmez pour valider quand même.' }
    }
    const m = await moveMission(tx, missionId, 'VALIDATED', actor, { data: { validatedAt: now }, expectFrom: 'SUBMITTED' })
    const tiers = [m.type === 'RETURN_VISIT' ? 'RETURN_VISIT' : 'VISIT', ...(m.urgencyBonusCents > 0 ? ['URGENCY'] : [])] as const
    let earnedCents = 0
    for (const tier of tiers) {
      const r = await award(missionId, tier as 'VISIT' | 'RETURN_VISIT' | 'URGENCY', tx, now)
      if (!r.ok) throw new Error(`Gain ${tier} impossible : ${r.reason}`)
      earnedCents += r.earning.amountCents
    }
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: m.agentId! } })
    return { ok: true as const, earnedCents, phone: agent.phone }
  })
  if (!res.ok) return res
  await notify(res.phone, smsTemplates.agentValidated({ amount: dollars(res.earnedCents) }))
  return { ok: true, earnedCents: res.earnedCents }
}

export async function requestFix(missionId: string, actor: string, message: string, now: Date = new Date()): Promise<void> {
  if (!message.trim()) throw new Error('Message obligatoire')
  const m = await prisma.$transaction((tx) => moveMission(tx, missionId, 'NEEDS_FIX', actor, { data: { needsFixAt: now, fixMessage: message.trim() }, reason: message }))
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: m.agentId! } })
  await notify(agent.phone, smsTemplates.agentNeedsFix({ message: message.trim() }))
}

export async function reject(missionId: string, actor: string, reason: string, markProLost = false): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  const m = await prisma.$transaction((tx) => moveMission(tx, missionId, 'REJECTED', actor, { data: { rejectReason: reason.trim() }, reason, markProLost }))
  if (m.agentId) {
    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: m.agentId } })
    await notify(agent.phone, smsTemplates.agentRejected({ reason: reason.trim() }))
  }
}

export async function resolveFlag(flagId: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const f = await tx.fraudFlag.update({ where: { id: flagId }, data: { resolved: true } })
    await logAudit(tx, { actor, action: 'flag.resolve', entity: 'Mission', entityId: f.missionId, data: { flag: f.type } })
  })
}
