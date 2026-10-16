import type { Agent, AgentStatus } from '@prisma/client'
import { redirect } from 'next/navigation'
import { requireAgent } from '@/lib/session'
import { homePathFor } from '@/modules/agents/home-rule'

/** Agent connecté dont le statut autorise la page ; sinon renvoi vers son écran d'accueil. */
export async function requireAgentIn(statuses: AgentStatus[]): Promise<Agent> {
  const agent = await requireAgent()
  if (!statuses.includes(agent.status)) redirect(homePathFor(agent.status))
  return agent
}
