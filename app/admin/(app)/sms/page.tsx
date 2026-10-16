import Link from 'next/link'
import { ActionForm, SubmitButton } from '@/app/admin/_components/action-form'
import { Badge, Empty, PageHeader, Table, linkClass, tdClass } from '@/app/admin/_components/ui'
import { formatParis } from '@/app/admin/_lib/format'
import { requireAdmin } from '@/lib/session'
import { listInbound } from '@/modules/review'
import { markHandledAction } from './actions'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const tab = (active: boolean) => (active ? 'rounded-full bg-gray-900 px-3 py-1 text-white' : 'rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-300')

export default async function InboundSmsPage({ searchParams }: Props) {
  await requireAdmin(['ADMIN'])
  const all = (await searchParams).all === '1'
  const messages = await listInbound(all ? {} : { handled: false })
  return (
    <>
      <PageHeader title="SMS reçus" />
      <p className="-mt-4 mb-4 text-sm text-gray-600">Réponses des pros qui ne sont ni une note ni « NO » : ouvrez la mission pour agir, puis marquez le SMS traité.</p>
      <nav className="mb-3 flex gap-2 text-sm">
        <Link href="/admin/sms" className={tab(!all)}>Non traités</Link>
        <Link href="/admin/sms?all=1" className={tab(all)}>Tous</Link>
      </nav>
      {messages.length === 0 ? <Empty>{all ? 'Aucun SMS reçu.' : 'Aucun SMS à traiter.'}</Empty> : (
        <Table head={['Reçu le', 'De', 'Message', 'Mission', '']}>
          {messages.map((s) => (
            <tr key={s.id}>
              <td className={tdClass}>{formatParis(s.createdAt)}</td>
              <td className={tdClass}>{s.fromPhone}</td>
              <td className={`${tdClass} max-w-md whitespace-pre-wrap`}>{s.body}</td>
              <td className={tdClass}>{s.missionId ? <Link href={`/admin/missions/${s.missionId}`} className={linkClass}>Ouvrir la mission</Link> : '—'}</td>
              <td className={tdClass}>
                {s.handled ? <Badge tone="green">Traité</Badge> : (
                  <ActionForm action={markHandledAction}>
                    <input type="hidden" name="smsId" value={s.id} />
                    <SubmitButton tone="secondary">Traité</SubmitButton>
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  )
}
