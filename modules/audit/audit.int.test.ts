import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { listAudit, logAudit } from './index'

describe('audit', () => {
  beforeEach(resetDb)

  it('enregistre une action et la relit, la plus récente en premier', async () => {
    await logAudit(prisma, { actor: 'marvin@allo-chantiers.fr', action: 'mission.validate', entity: 'Mission', entityId: 'm1' })
    await new Promise((r) => setTimeout(r, 5)) // deux horodatages distincts
    await logAudit(prisma, { actor: 'system', action: 'mission.reject', entity: 'Mission', entityId: 'm1', reason: 'délai' })
    const rows = await listAudit('Mission', 'm1')
    expect(rows.map((r) => r.action)).toEqual(['mission.reject', 'mission.validate'])
    expect(rows[0].reason).toBe('délai')
  })

  it('fonctionne dans une transaction', async () => {
    await prisma.$transaction(async (tx) => {
      await logAudit(tx, { actor: 'system', action: 'x', entity: 'Agent', entityId: 'a1', data: { n: 1 } })
    })
    expect(await prisma.auditLog.count()).toBe(1)
  })
})
