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
      <AppBar title="Profil" large />
      <main className="mc-scroll">
        <div className="mc-card">
          <div className="mc-kv">
            <div><span className="k">Nom</span><span className="v">{agent.firstName} {agent.lastName}</span></div>
            <div><span className="k">Mobile</span><span className="v">{agent.phone}</span></div>
            <div><span className="k">Code postal</span><span className="v">{agent.zip}</span></div>
            <div><span className="k">Rayon de déplacement</span><span className="v">{agent.radiusMiles} mi</span></div>
            <div><span className="k">Contrat</span><span className="v">{agent.contractSignedAt ? `Signé le ${agent.contractSignedAt.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Non signé'}</span></div>
          </div>
        </div>
        <ul className="mc-list" style={{ marginTop: 16 }}>
          <li><Icon name="cap" /><Link href="/agent/academy" style={{ flex: 1, textDecoration: 'none' }}>Revoir les leçons</Link><Icon name="chev-right" /></li>
          <li><Icon name="help" /><span style={{ flex: 1 }}>Besoin d&apos;aide ? Écrivez-nous à l&apos;adresse indiquée sur notre site.</span></li>
        </ul>
        <form action={logout} style={{ marginTop: 24 }}>
          <button type="submit" className="mc-btn mc-btn--secondary mc-btn--block">Se déconnecter</button>
        </form>
      </main>
    </>
  )
}
