import Form from 'next/form'
import Link from 'next/link'
import { Badge, Empty, PageHeader, Table, buttonLinkClass, inputClass, linkClass, tdClass } from '@/app/admin/_components/ui'
import { formatParis } from '@/app/admin/_lib/format'
import { pickEnum } from '@/app/admin/_lib/forms'
import { PRO_STATUSES, PRO_STATUS_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { listPros } from '@/modules/missions'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ProsPage({ searchParams }: Props) {
  await requireAdmin()
  const sp = await searchParams
  const status = pickEnum(sp.status, PRO_STATUSES)
  const q = typeof sp.q === 'string' ? sp.q : ''
  const pros = await listPros({ status, q })
  return (
    <>
      <PageHeader title="Pros">
        <Link href="/admin/pros/import" className={buttonLinkClass}>Importer un CSV</Link>
        <Link href="/admin/pros/new" className={buttonLinkClass}>Nouveau pro</Link>
      </PageHeader>
      <Form action="/admin/pros" className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Nom, ville ou téléphone" aria-label="Recherche" className={`${inputClass} max-w-xs`} />
        <select name="status" defaultValue={status ?? ''} aria-label="Statut" className={`${inputClass} max-w-xs`}>
          <option value="">Tous les statuts</option>
          {PRO_STATUSES.map((s) => <option key={s} value={s}>{PRO_STATUS_LABELS[s]}</option>)}
        </select>
        <button type="submit" className={buttonLinkClass}>Filtrer</button>
      </Form>
      {pros.length === 0 ? (
        <Empty>Aucun pro pour ces filtres.</Empty>
      ) : (
        <Table head={['Entreprise', 'Ville', 'Métier', 'Téléphone', 'Statut', 'Modifié le']}>
          {pros.map((p) => (
            <tr key={p.id}>
              <td className={tdClass}><Link href={`/admin/pros/${p.id}`} className={linkClass}>{p.businessName}</Link></td>
              <td className={tdClass}>
                {p.city}, {p.state}
                {p.lat == null && <span className="ml-2 text-xs text-red-700">sans coordonnées</span>}
              </td>
              <td className={tdClass}>{p.trade}</td>
              <td className={tdClass}>{p.phone}</td>
              <td className={tdClass}><Badge>{PRO_STATUS_LABELS[p.status]}</Badge></td>
              <td className={tdClass}>{formatParis(p.updatedAt)}</td>
            </tr>
          ))}
        </Table>
      )}
      {pros.length === 200 && <p className="mt-2 text-sm text-gray-500">200 premiers résultats : affinez la recherche.</p>}
    </>
  )
}
