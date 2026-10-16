import { redirect } from 'next/navigation'
import { requireAgent } from '@/lib/session'
import { homePathFor } from '@/modules/agents/home-rule'

export default async function AgentHome() {
  const agent = await requireAgent()
  redirect(homePathFor(agent.status))
}
