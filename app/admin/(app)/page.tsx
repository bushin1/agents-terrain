import Link from 'next/link'
import { PageHeader } from '@/app/admin/_components/ui'
import { requireAdmin } from '@/lib/session'
import { listAgents } from '@/modules/agents'
import { adminBoards } from '@/modules/missions'
import { listInbound, listQueue } from '@/modules/review'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const [queue, boards, inbound, locked] = await Promise.all([listQueue(), adminBoards(), listInbound({ handled: false }), listAgents({ status: 'LOCKED' })])
  const tiles = [
    { label: 'Visites à valider', count: queue.length, href: '/admin/review' },
    { label: 'Missions non prises depuis plus de 48 h', count: boards.untaken.length, href: '/admin/missions#non-prises' },
    { label: 'Missions à replanifier (créneau passé)', count: boards.toReschedule.length, href: '/admin/missions#a-replanifier' },
    { label: 'Visites sans nouvelles', count: boards.silent.length, href: '/admin/missions#sans-nouvelles' },
    { label: 'SMS reçus non traités', count: inbound.length, href: '/admin/sms' },
    { label: 'Agents bloqués au quiz', count: locked.length, href: '/admin/agents?status=LOCKED' },
  ]
  return (
    <>
      <PageHeader title="Tableau de bord" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg border p-4 shadow-sm hover:shadow ${t.count > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}
          >
            <p className="text-3xl font-semibold">{t.count}</p>
            <p className="mt-1 text-sm text-gray-700">{t.label}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
