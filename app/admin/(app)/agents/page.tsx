import Link from 'next/link'
import { Badge, Empty, FilterLinks, PageHeader, Table, linkClass, tdClass } from '@/app/admin/_components/ui'
import { formatParis } from '@/app/admin/_lib/format'
import { pickEnum } from '@/app/admin/_lib/forms'
import { AGENT_STATUSES, AGENT_STATUS_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { listAgents } from '@/modules/agents'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AgentsPage({ searchParams }: Props) {
  await requireAdmin(['ADMIN'])
  const status = pickEnum((await searchParams).status, AGENT_STATUSES)
  const agents = await listAgents({ status })
  return (
    <>
      <PageHeader title="Agents" />
      <FilterLinks base="/admin/agents" current={status} options={AGENT_STATUSES} labels={AGENT_STATUS_LABELS} />
      {agents.length === 0 ? <Empty>Aucun agent.</Empty> : (
        <Table head={['Agent', 'Téléphone', 'Email', 'Secteur', 'Statut', 'Inscrit le']}>
          {agents.map((a) => (
            <tr key={a.id}>
              <td className={tdClass}><Link href={`/admin/agents/${a.id}`} className={linkClass}>{a.firstName} {a.lastName}</Link></td>
              <td className={tdClass}>{a.phone}</td>
              <td className={tdClass}>{a.email}</td>
              <td className={tdClass}>ZIP {a.zip} · {a.radiusMiles} miles{a.hasCar ? '' : ' · sans voiture'}</td>
              <td className={tdClass}><Badge>{AGENT_STATUS_LABELS[a.status]}</Badge></td>
              <td className={tdClass}>{formatParis(a.createdAt)}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}
