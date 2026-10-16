import { prisma } from '@/lib/prisma'

export const ADMIN_DOMAIN = 'allo-chantiers.fr'

/** Seule porte du back-office : compte Google Workspace du domaine, email vérifié, inscrit dans AdminUser. */
export async function isAllowedAdmin(profile: { email?: string | null; email_verified?: boolean | null; hd?: string | null } | undefined): Promise<boolean> {
  const email = String(profile?.email ?? '').toLowerCase()
  if (!profile?.email_verified || profile.hd !== ADMIN_DOMAIN || !email.endsWith('@' + ADMIN_DOMAIN)) return false
  return (await prisma.adminUser.findUnique({ where: { email } })) !== null
}
