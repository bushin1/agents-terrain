import Link from 'next/link'
import { Badge, Banner, Empty, PageHeader, Table, linkClass, tdClass } from '@/app/admin/_components/ui'
import { formatParis, formatUsd } from '@/app/admin/_lib/format'
import { FRAUD_LABELS, MISSION_TYPE_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { listQueue } from '@/modules/review'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ReviewQueuePage({ searchParams }: Props) {
  await requireAdmin(['ADMIN'])
  const { done, amount } = await searchParams
  const queue = await listQueue()
  const cents = Number(amount)
  const notice =
    done === 'validated' ? `Visite validée${Number.isInteger(cents) ? ` : ${formatUsd(cents)} ajoutés au solde de l’agent` : ''}.`
    : done === 'fix' ? 'Correction demandée : l’agent a reçu votre message par SMS.'
    : done === 'rejected' ? 'Visite rejetée : l’agent a reçu le motif par SMS.'
    : null

  return (
    <>
      <PageHeader title={`Validation (${queue.length})`} />
      {notice && <Banner tone="success">{notice}</Banner>}
      {queue.length === 0 ? (
        <Empty>Aucune visite à valider.</Empty>
      ) : (
        <Table head={['Soumise le', 'Pro', 'Type', 'Agent', 'Photos', 'Alertes', '']}>
          {queue.map((m) => (
            <tr key={m.id}>
              <td className={tdClass}>{m.submittedAt ? formatParis(m.submittedAt) : '—'}</td>
              <td className={tdClass}>{m.pro.businessName}<p className="text-xs text-gray-500">{m.pro.trade} · {m.pro.city}, {m.pro.state}</p></td>
              <td className={tdClass}>{MISSION_TYPE_LABELS[m.type]}</td>
              <td className={tdClass}>{m.agent ? `${m.agent.firstName} ${m.agent.lastName}` : '—'}</td>
              <td className={tdClass}>{m.submission?._count.photos ?? 0}</td>
              <td className={tdClass}>
                <div className="flex flex-wrap gap-1">{m.flags.map((f) => <Badge key={f.id} tone="red">{FRAUD_LABELS[f.type]}</Badge>)}</div>
              </td>
              <td className={tdClass}><Link href={`/admin/review/${m.id}`} className={linkClass}>Examiner →</Link></td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}
