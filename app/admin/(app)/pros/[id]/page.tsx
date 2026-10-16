import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/app/admin/_components/action-form'
import { AuditList } from '@/app/admin/_components/audit-list'
import { Badge, Banner, Card, Empty, PageHeader, Table, buttonLinkClass, inputClass, linkClass, tdClass } from '@/app/admin/_components/ui'
import { isCancellable, isReviewable, mapsUrl, missionHref } from '@/app/admin/_lib/format'
import { MISSION_STATUS_LABELS, MISSION_TYPE_LABELS, PRO_STATUS_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { formatSlot } from '@/lib/time'
import { listAudit } from '@/modules/audit'
import { getPro } from '@/modules/missions'
import { CancelMissionForm } from '../../missions/cancel-form'
import { setProStatusAction } from '../actions'
import { MissionForm } from './mission-form'

const NOTICES: Record<string, string> = {
  created: 'Pro créé.',
  updated: 'Pro mis à jour.',
  mission: 'Mission publiée : les agents du secteur la voient dès maintenant.',
}

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ProPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id } = await params
  const { notice } = await searchParams
  const pro = await getPro(id)
  if (!pro) notFound()
  const audits = await Promise.all([listAudit('Pro', pro.id), ...pro.missions.map((m) => listAudit('Mission', m.id))])
  const journal = audits.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  const noticeText = typeof notice === 'string' ? NOTICES[notice] : undefined
  const editHref = `/admin/pros/${pro.id}/edit`
  const statusFields = (to: string) => <><input type="hidden" name="proId" value={pro.id} /><input type="hidden" name="to" value={to} /></>

  return (
    <>
      <PageHeader title={pro.businessName} back={{ href: '/admin/pros', label: 'Pros' }}>
        <Link href={editHref} className={buttonLinkClass}>Modifier</Link>
      </PageHeader>
      {noticeText && <Banner tone="success">{noticeText}</Banner>}
      {pro.lat == null && (
        <Banner tone="warning">
          Adresse introuvable : aucune mission possible. <Link href={editHref} className="underline">Saisir la latitude et la longitude</Link>.
        </Banner>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Coordonnées">
            <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-gray-500">Contact</dt><dd>{pro.contactName ?? '—'}</dd>
              <dt className="text-gray-500">Téléphone</dt><dd><a href={`tel:${pro.phone}`} className={linkClass}>{pro.phone}</a></dd>
              <dt className="text-gray-500">Adresse</dt><dd>{pro.address}, {pro.city}, {pro.state} {pro.zip}</dd>
              <dt className="text-gray-500">Métier</dt><dd>{pro.trade}</dd>
              <dt className="text-gray-500">Fuseau</dt><dd>{pro.timeZone}</dd>
              <dt className="text-gray-500">Position</dt>
              <dd>{pro.lat != null && pro.lng != null ? <a href={mapsUrl(pro.lat, pro.lng)} target="_blank" rel="noreferrer" className={linkClass}>{pro.lat}, {pro.lng}</a> : '—'}</dd>
              <dt className="text-gray-500">Fiche existante</dt>
              <dd>
                {pro.existingPlaceId ? (
                  <a href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(pro.existingPlaceId)}`} target="_blank" rel="noreferrer" className={linkClass}>
                    {pro.existingPlaceId} (à revendiquer)
                  </a>
                ) : 'Aucune : la visite en crée une'}
              </dd>
              <dt className="text-gray-500">Notes d’appel</dt><dd className="whitespace-pre-line">{pro.notes ?? '—'}</dd>
            </dl>
          </Card>

          <Card title="Missions">
            {pro.missions.length === 0 ? (
              <Empty>Aucune mission.</Empty>
            ) : (
              <Table head={['Créneau (heure du pro)', 'Type', 'Statut', 'Agent', '']}>
                {pro.missions.map((m) => (
                  <tr key={m.id} id={`mission-${m.id}`}>
                    <td className={tdClass}>{formatSlot(m.slotAt, pro.timeZone)}</td>
                    <td className={tdClass}>{MISSION_TYPE_LABELS[m.type]}</td>
                    <td className={tdClass}>
                      <Badge>{MISSION_STATUS_LABELS[m.status]}</Badge>
                      {(m.cancelReason ?? m.rejectReason) && <p className="mt-1 text-xs text-gray-500">{m.cancelReason ?? m.rejectReason}</p>}
                    </td>
                    <td className={tdClass}>
                      {m.agent ? <Link href={`/admin/agents/${m.agent.id}`} className={linkClass}>{m.agent.firstName} {m.agent.lastName}</Link> : '—'}
                    </td>
                    <td className={tdClass}>
                      {isReviewable(m.status) && <Link href={missionHref(m)} className={linkClass}>Voir la visite</Link>}
                      {isCancellable(m.status) && <CancelMissionForm missionId={m.id} />}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>

          {pro.status === 'AGREED' && (
            <Card title="Nouvelle mission">
              {pro.lat == null ? (
                <Empty>Saisissez d’abord les coordonnées du pro.</Empty>
              ) : (
                <MissionForm proId={pro.id} timeZone={pro.timeZone} defaultCategory={pro.trade} />
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Statut">
            <Badge>{PRO_STATUS_LABELS[pro.status]}</Badge>
            {pro.status === 'LOST' && pro.lostReason && <p className="mt-2 text-sm text-gray-700">Motif : {pro.lostReason}</p>}
            <div className="mt-4 space-y-4">
              {pro.status === 'TO_CALL' && (
                <ActionForm action={setProStatusAction}>
                  {statusFields('AGREED')}
                  <SubmitButton>Le pro est d’accord</SubmitButton>
                </ActionForm>
              )}
              {pro.status === 'AGREED' && (
                <ActionForm action={setProStatusAction}>
                  {statusFields('TO_CALL')}
                  <SubmitButton tone="secondary">Repasser « à appeler »</SubmitButton>
                </ActionForm>
              )}
              {pro.status !== 'LOST' && (
                <ActionForm action={setProStatusAction} className="space-y-2">
                  {statusFields('LOST')}
                  <input name="reason" required placeholder="Motif (ex. ne répond plus)" aria-label="Motif" className={inputClass} />
                  <p className="text-xs text-gray-500">Annule aussi ses missions en cours.</p>
                  <SubmitButton tone="danger">Marquer perdu</SubmitButton>
                </ActionForm>
              )}
            </div>
          </Card>
          <Card title="Journal">
            <AuditList entries={journal} />
          </Card>
        </div>
      </div>
    </>
  )
}
