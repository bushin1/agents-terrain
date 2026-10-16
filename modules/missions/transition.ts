import type { Mission, MissionStatus, Prisma } from '@prisma/client'
import type { Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { canTransitionMission } from './mission-rule'
import { proStatusAfter } from './pro-rule'

/** Champs remis à zéro quand une mission repasse OPEN, pour que le prochain agent reçoive rappel et relance. */
export const RELEASE_RESET = {
  agentId: null,
  acceptedAt: null,
  reminderSentAt: null,
  noShowSmsAt: null,
} satisfies Prisma.MissionUncheckedUpdateManyInput

/**
 * Change le statut d'une mission selon la machine d'état (spec §7.2), met à jour le pro (spec §7.3)
 * et trace l'action. TOUJOURS appeler dans une transaction (`db` = tx) : le verrou du pro et la mise à
 * jour conditionnelle de la mission ne protègent que dans une transaction.
 */
export async function moveMission(
  db: Db,
  missionId: string,
  to: MissionStatus,
  actor: string,
  opts: {
    data?: Prisma.MissionUncheckedUpdateManyInput
    reason?: string
    markProLost?: boolean
    expectFrom?: MissionStatus // statut que l'appelant a lu : refus s'il a changé entre-temps (tâches planifiées)
    expectAgentId?: string
  } = {},
): Promise<Mission> {
  if (opts.markProLost && !opts.reason?.trim()) throw new Error('Motif obligatoire pour passer le pro LOST')
  const found = await db.mission.findUniqueOrThrow({ where: { id: missionId } })
  // Verrou sur la ligne du pro, toujours pris EN PREMIER (setProStatus fait de même) : deux actions
  // simultanées sur un même pro se suivent au lieu de s'écraser, sans risque d'interblocage.
  await db.$queryRaw`SELECT id FROM "Pro" WHERE id = ${found.proId} FOR UPDATE`
  const m = await db.mission.findUniqueOrThrow({ where: { id: missionId }, include: { pro: true } })
  if (opts.expectFrom && m.status !== opts.expectFrom) throw new Error(`La mission a changé entre-temps (${m.status}, attendu ${opts.expectFrom})`)
  if (opts.expectAgentId && m.agentId !== opts.expectAgentId) throw new Error('La mission a changé entre-temps (autre agent)')
  if (!canTransitionMission(m.status, to)) throw new Error(`Transition refusée : ${m.status} → ${to}`)
  const res = await db.mission.updateMany({ where: { id: missionId, status: m.status }, data: { ...opts.data, status: to } })
  if (res.count !== 1) throw new Error('La mission a changé entre-temps : rechargez la page')

  const kind = to === 'VALIDATED' ? 'VALIDATED' : to === 'REJECTED' ? 'REJECTED' : to === 'CANCELLED' ? 'CANCELLED' : null
  if (kind) {
    const next = proStatusAfter(m.pro.status, { kind, missionType: m.type, markLost: opts.markProLost })
    if (next !== m.pro.status) {
      await db.pro.update({ where: { id: m.proId }, data: { status: next, ...(next === 'LOST' ? { lostReason: opts.reason ?? null } : {}) } })
    }
  }
  await logAudit(db, { actor, action: `mission.${to.toLowerCase()}`, entity: 'Mission', entityId: missionId, reason: opts.reason })
  return db.mission.findUniqueOrThrow({ where: { id: missionId } })
}
