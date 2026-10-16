'use server'
import { redirect } from 'next/navigation'
import { requireAgent } from '@/lib/session'
import { acceptMission, releaseMission } from '@/modules/missions'

// Les refus (mission prise, limite de 3, moins de 24 h) reviennent sur la page via ?error=, affiché en toast.
export async function accept(missionId: string): Promise<void> {
  const agent = await requireAgent()
  const r = await acceptMission(missionId, agent)
  redirect(r.ok ? `/agent/missions/${missionId}?accepted=1` : `/agent/missions/${missionId}?error=${encodeURIComponent(r.error)}`)
}

export async function release(missionId: string): Promise<void> {
  const agent = await requireAgent()
  const r = await releaseMission(missionId, agent)
  redirect(r.ok ? '/agent/visits?released=1' : `/agent/missions/${missionId}?error=${encodeURIComponent(r.error)}`)
}
