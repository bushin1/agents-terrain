import type { Prisma } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'

export interface AuditEntry {
  actor: string // email admin, « agent:<id> » ou « system »
  action: string // ex. « mission.validate »
  entity: string
  entityId: string
  reason?: string
  data?: Prisma.InputJsonValue
}

/** À appeler avec la transaction qui fait le changement, pour que l'action et sa trace soient atomiques. */
export async function logAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({ data: entry })
}

export async function listAudit(entity: string, entityId: string) {
  return prisma.auditLog.findMany({ where: { entity, entityId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
}
