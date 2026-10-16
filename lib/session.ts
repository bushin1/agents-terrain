import type { AdminRole, Agent, AdminUser } from '@prisma/client'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Agent connecté, relu en base (statut à jour), ou null. */
export async function currentAgent(): Promise<Agent | null> {
  const session = await auth()
  if (session?.kind !== 'agent' || !session.agentId) return null
  return prisma.agent.findUnique({ where: { id: session.agentId } })
}

export async function requireAgent(): Promise<Agent> {
  const agent = await currentAgent()
  if (!agent) redirect('/login')
  return agent
}

/** Admin connecté avec un rôle autorisé, relu en base à chaque appel (un retrait d'accès est immédiat). */
export async function currentAdmin(roles: AdminRole[] = ['ADMIN', 'SETTER']): Promise<AdminUser | null> {
  const session = await auth()
  const email = session?.kind === 'admin' ? session.user?.email : null
  if (!email) return null
  const admin = await prisma.adminUser.findUnique({ where: { email } })
  return admin && roles.includes(admin.role) ? admin : null
}

export async function requireAdmin(roles: AdminRole[] = ['ADMIN', 'SETTER']): Promise<AdminUser> {
  const admin = await currentAdmin(roles)
  if (!admin) redirect('/admin/login?error=forbidden')
  return admin
}
