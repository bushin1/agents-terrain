import type { FraudType } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import type { StepsData } from '@/modules/missions/checklist-rule'
import { computeFraudFlags, normalizeAddress } from './fraud-rule'

// Alertes posées ailleurs (tâche d'absence) : jamais recalculées ni retirées ici.
const EXTERNAL: FraudType[] = ['NO_SHOW']

/** Recalcule les alertes d'une mission à partir de sa checklist, de ses photos et de la réponse SMS du pro. */
export async function refreshFraudFlags(missionId: string, db: Db = prisma): Promise<void> {
  const m = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { pro: true, submission: { include: { photos: true } } },
  })
  if (!m.agentId) return
  const steps = (m.submission?.steps ?? {}) as StepsData
  const checkin = steps.checkin
    ? { lat: steps.checkin.lat, lng: steps.checkin.lng, accuracy: steps.checkin.accuracy, clientAt: new Date(steps.checkin.clientAt), receivedAt: new Date(steps.checkin.receivedAt) }
    : null

  // Doublon = un AUTRE pro (même téléphone ou même adresse) qui a déjà une visite validée.
  const candidates = await db.pro.findMany({
    where: { id: { not: m.proId }, OR: [{ phone: m.pro.phone }, { zip: m.pro.zip }], missions: { some: { status: 'VALIDATED' } } },
    select: { phone: true, address: true, zip: true },
  })
  const key = normalizeAddress(m.pro.address, m.pro.zip)
  const duplicateValidatedCount = candidates.filter((c) => c.phone === m.pro.phone || normalizeAddress(c.address, c.zip) === key).length

  const findings = computeFraudFlags({
    pro: { lat: m.pro.lat, lng: m.pro.lng },
    checkin,
    photos: m.submission?.photos ?? [],
    duplicateValidatedCount,
    proRating: m.proRating,
    proDenied: m.proDenied,
  })

  for (const f of findings) {
    await db.fraudFlag.upsert({
      where: { missionId_agentId_type: { missionId, agentId: m.agentId, type: f.type } },
      create: { missionId, agentId: m.agentId, type: f.type, detail: f.detail },
      update: { detail: f.detail, resolved: false },
    })
  }
  // Une alerte qui ne s'applique plus est marquée résolue, jamais supprimée : l'historique reste visible.
  await db.fraudFlag.updateMany({
    where: { missionId, agentId: m.agentId, resolved: false, type: { notIn: [...findings.map((f) => f.type), ...EXTERNAL] } },
    data: { resolved: true },
  })
}
