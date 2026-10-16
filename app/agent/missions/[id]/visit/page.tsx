import { notFound, redirect } from 'next/navigation'
import { VisitClient } from '@/components/agent/visit/visit-client'
import { requireAgentIn } from '@/lib/agent-guard'
import { getMissionForAgent, getVisitState } from '@/modules/missions'

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const agent = await requireAgentIn(['ACTIVE'])
  const { id } = await params
  const [state, detail] = await Promise.all([getVisitState(id, agent), getMissionForAgent(id, agent)])
  if (!state || !detail?.pro) notFound()
  if (state.status !== 'ACCEPTED' && state.status !== 'NEEDS_FIX') redirect(`/agent/missions/${id}`)
  return (
    <VisitClient
      initial={state}
      defaults={{ contactName: detail.pro.contactName ?? '', city: detail.pro.city, zip: detail.pro.zip, category: detail.suggestedCategory }}
    />
  )
}
