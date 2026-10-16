import Link from 'next/link'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { listAgentMissions } from '@/modules/missions'
import { getSettings } from '@/modules/settings'

const GROUPS = [
  { title: 'En cours', statuses: ['ACCEPTED'], badge: null },
  { title: 'Correction requise', statuses: ['NEEDS_FIX'], badge: 'danger' },
  { title: 'En vérification', statuses: ['SUBMITTED'], badge: 'pending' },
  { title: 'Terminé', statuses: ['VALIDATED', 'REJECTED'], badge: null },
] as const

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ released?: string }> }) {
  const agent = await requireAgentIn(['ACTIVE'])
  const { released } = await searchParams
  const [missions, settings] = await Promise.all([listAgentMissions(agent), getSettings()])
  return (
    <>
      <AppBar title="Missions" large />
      {released && <div className="mc-toast" role="status"><span className="mc-toast__icon"><Icon name="check" /></span><span>Mission annulée. Le propriétaire a été prévenu par SMS.</span></div>}
      <main className="mc-scroll">
        {missions.length === 0 && (
          <div className="mc-empty">
            <h3>Aucune mission pour l&apos;instant</h3>
            <p>Acceptez une mission pour la voir ici.</p>
            <Link href="/agent/missions" className="mc-btn mc-btn--primary">Trouver une mission</Link>
          </div>
        )}
        {GROUPS.map((g) => {
          const list = missions.filter((m) => (g.statuses as readonly string[]).includes(m.status))
          if (list.length === 0) return null
          return (
            <section key={g.title} style={{ marginTop: 16 }}>
              <h2 className="h3" style={{ marginBottom: 8 }}>{g.title}</h2>
              <ul className="mc-list">
                {list.map((m) => (
                  <li key={m.id}>
                    <Link href={m.status === 'ACCEPTED' || m.status === 'NEEDS_FIX' ? `/agent/missions/${m.id}/visit` : `/agent/missions/${m.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <div style={{ fontWeight: 600 }}>{m.businessName}</div>
                      <div className="body-s mc-muted">{m.city}, {m.state} · {m.slotLabel}</div>
                    </Link>
                    {m.status === 'REJECTED' ? <span className="mc-badge mc-badge--outline">Non validé</span> : m.earnedCents > 0 ? <span className="money">{usd(m.earnedCents, { cents: true })}</span> : g.badge === 'pending' ? <span className="mc-badge mc-badge--pending"><Icon name="clock" /> En attente</span> : g.badge === 'danger' ? <span className="mc-badge mc-badge--danger"><Icon name="alert" /> À corriger</span> : <Icon name="chev-right" />}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </main>
    </>
  )
}
