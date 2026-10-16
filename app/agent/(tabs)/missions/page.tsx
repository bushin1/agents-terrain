import { requireAgentIn } from '@/lib/agent-guard'
import { listOpenMissionsFor } from '@/modules/missions'
import { getSettings } from '@/modules/settings'
import { MissionsView } from '@/components/agent/missions-view'

export default async function MissionsPage() {
  const agent = await requireAgentIn(['ACTIVE'])
  const [items, settings] = await Promise.all([listOpenMissionsFor(agent), getSettings()])
  const a = settings.tierAmountsCents
  return (
    <MissionsView
      items={items}
      me={{ lat: agent.lat, lng: agent.lng }}
      radiusMiles={agent.radiusMiles}
      zip={agent.zip}
      amounts={{ VISIT: a.VISIT, LIVE: a.LIVE, CLIENT: a.CLIENT }}
    />
  )
}
