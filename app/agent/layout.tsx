import { requireAgent } from '@/lib/session'
import './agent.css'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  await requireAgent()
  return (
    <div className="mc mc-app" data-theme="light">
      {children}
    </div>
  )
}
