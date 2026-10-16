import Link from 'next/link'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { signOut } from '@/lib/auth'
import { requireAgentIn } from '@/lib/agent-guard'

export default async function ProfilePage() {
  const agent = await requireAgentIn(['ACTIVE'])
  async function logout() {
    'use server'
    await signOut({ redirectTo: '/' })
  }
  return (
    <>
      <AppBar title="Profile" large />
      <main className="mc-scroll">
        <div className="mc-card">
          <div className="mc-kv">
            <div><span className="k">Name</span><span className="v">{agent.firstName} {agent.lastName}</span></div>
            <div><span className="k">Mobile</span><span className="v">{agent.phone}</span></div>
            <div><span className="k">Home ZIP</span><span className="v">{agent.zip}</span></div>
            <div><span className="k">Travel radius</span><span className="v">{agent.radiusMiles} mi</span></div>
            <div><span className="k">Agreement</span><span className="v">Signed {agent.contractSignedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
          </div>
        </div>
        <ul className="mc-list" style={{ marginTop: 16 }}>
          <li><Icon name="cap" /><Link href="/agent/academy" style={{ flex: 1, textDecoration: 'none' }}>Review the lessons</Link><Icon name="chev-right" /></li>
          <li><Icon name="help" /><span style={{ flex: 1 }}>Need help? Text or email support from the address on our website.</span></li>
        </ul>
        <form action={logout} style={{ marginTop: 24 }}>
          <button type="submit" className="mc-btn mc-btn--secondary mc-btn--block">Log out</button>
        </form>
      </main>
    </>
  )
}
