import { TabBar } from '@/components/agent/tab-bar'
import { requireAgentIn } from '@/lib/agent-guard'

// Les quatre onglets sont réservés aux agents ACTIVE ; les autres sont renvoyés vers leur étape.
export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  await requireAgentIn(['ACTIVE'])
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <TabBar />
    </>
  )
}
