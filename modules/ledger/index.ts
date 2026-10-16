import type { Earning, EarningTier } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { getSettings } from '@/modules/settings'
import { checkEligibility, computeAmount } from './ledger-rule'

export { computeAmount, levelFor, CLIENT_WINDOW_DAYS, LIVE_WINDOW_DAYS } from './ledger-rule'

export type AwardResult = { ok: true; earning: Earning; created: boolean } | { ok: false; reason: string }

/**
 * Seul point d'entrée qui crée un gain (spec §9.2). Idempotent : rejouer un déclencheur renvoie le gain
 * existant. À appeler dans la transaction qui vient de valider la mission (le niveau compte cette mission).
 */
export async function award(missionId: string, tier: EarningTier, db: Db = prisma, now: Date = new Date()): Promise<AwardResult> {
  const existing = await db.earning.findUnique({ where: { missionId_tier: { missionId, tier } } })
  if (existing) return { ok: true, earning: existing, created: false }

  const mission = await db.mission.findUniqueOrThrow({ where: { id: missionId } })
  const eligible = checkEligibility({ tier, mission, now })
  if (!eligible.ok) return eligible
  if (!mission.agentId) return { ok: false, reason: 'mission sans agent' }

  // Verrou par agent : deux validations simultanées comptent les missions validées l'une après l'autre
  // (sinon la 5e pourrait être payée au niveau Bronze).
  await db.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${'ledger:' + mission.agentId}))) AS l`
  const settings = await getSettings(db)
  const validatedCount = await db.mission.count({ where: { agentId: mission.agentId, status: 'VALIDATED' } })
  const amount = computeAmount({ tier, validatedCount, urgencyBonusCents: mission.urgencyBonusCents, settings })
  // skipDuplicates : un déclencheur concurrent ne fait pas échouer la transaction appelante (pas de P2002).
  const inserted = await db.earning.createMany({ data: [{ agentId: mission.agentId, missionId, tier, ...amount }], skipDuplicates: true })
  const earning = await db.earning.findUniqueOrThrow({ where: { missionId_tier: { missionId, tier } } })
  if (inserted.count === 0) return { ok: true, earning, created: false }
  await logAudit(db, {
    actor: 'system', action: 'earning.award', entity: 'Earning', entityId: earning.id,
    data: { missionId, tier, amountCents: amount.amountCents },
  })
  return { ok: true, earning, created: true }
}

/** Annule un gain pas encore payé (fraude avérée), avec un motif obligatoire. */
export async function voidEarning(earningId: string, reason: string, actor: string): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  await prisma.$transaction(async (tx) => {
    const e = await tx.earning.findUniqueOrThrow({ where: { id: earningId } })
    // Conditionnel : un gain pris dans un virement entre-temps (phase 2) n'est pas annulé.
    const res = await tx.earning.updateMany({ where: { id: earningId, status: 'PAYABLE' }, data: { status: 'VOID', voidReason: reason, voidedBy: actor } })
    if (res.count !== 1) throw new Error(`Gain déjà ${e.status === 'PAYABLE' ? 'modifié' : e.status}`)
    await logAudit(tx, { actor, action: 'earning.void', entity: 'Earning', entityId: earningId, reason })
  })
}

/** Solde payable d'un agent, en cents. */
export async function balanceOf(agentId: string, db: Db = prisma): Promise<number> {
  const r = await db.earning.aggregate({ where: { agentId, status: 'PAYABLE' }, _sum: { amountCents: true } })
  return r._sum.amountCents ?? 0
}

export async function listEarnings(agentId: string) {
  return prisma.earning.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: { mission: { select: { id: true, pro: { select: { city: true, state: true, trade: true } } } } },
  })
}
