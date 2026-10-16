import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { isAllowedAdmin } from './admin-access'

const ok = { email: 'Marvin@Allo-Chantiers.fr', email_verified: true, hd: 'allo-chantiers.fr' }

describe('isAllowedAdmin', () => {
  beforeEach(async () => {
    await resetDb()
    await prisma.adminUser.create({ data: { email: 'marvin@allo-chantiers.fr', role: 'ADMIN' } })
  })
  it('accepte un compte du domaine, vérifié, présent dans AdminUser (casse ignorée)', async () => {
    expect(await isAllowedAdmin(ok)).toBe(true)
  })
  it.each([
    ['email non vérifié', { ...ok, email_verified: false }],
    ['hd absent', { ...ok, hd: undefined }],
    ['autre domaine', { ...ok, email: 'marvin@gmail.com', hd: 'gmail.com' }],
    ['absent de AdminUser', { ...ok, email: 'other@allo-chantiers.fr' }],
  ])('refuse : %s', async (_label, profile) => {
    expect(await isAllowedAdmin(profile)).toBe(false)
  })
})
