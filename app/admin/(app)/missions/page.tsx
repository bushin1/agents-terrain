import Link from 'next/link'
import { ActionForm, SubmitButton } from '@/app/admin/_components/action-form'
import { Badge, Card, Empty, FilterLinks, PageHeader, Table, inputClass, linkClass, tdClass } from '@/app/admin/_components/ui'
import { centsToDollarsInput, formatParis, formatUsd, missionHref } from '@/app/admin/_lib/format'
import { pickEnum } from '@/app/admin/_lib/forms'
import { MISSION_STATUSES, MISSION_STATUS_LABELS, MISSION_TYPE_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { formatSlot } from '@/lib/time'
import { adminBoards, listMissions } from '@/modules/missions'
import { getSettings } from '@/modules/settings'
import { rescheduleMissionAction, urgencyBonusAction, widenMissionAction } from './actions'
import { CancelMissionForm } from './cancel-form'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function MissionsPage({ searchParams }: Props) {
  await requireAdmin()
  const status = pickEnum((await searchParams).status, MISSION_STATUSES)
  const [boards, missions, settings] = await Promise.all([adminBoards(), listMissions({ status }), getSettings()])
  const widen = settings.widenRadiusMiles

  return (
    <>
      <PageHeader title="Missions" />
      <div className="space-y-6">
        <Card id="non-prises" title={`Non prises depuis plus de 48 h (${boards.untaken.length})`}>
          {boards.untaken.length === 0 ? <Empty>Aucune.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {boards.untaken.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-4 py-3 text-sm">
                  <div>
                    <Link href={`/admin/pros/${m.proId}`} className={linkClass}>{m.pro.businessName}</Link> · {m.pro.city}, {m.pro.state}
                    <p className="text-gray-600">Créneau {formatSlot(m.slotAt, m.pro.timeZone)} (heure du pro) · publiée le {formatParis(m.publishedAt)}</p>
                    <p className="text-gray-600">
                      Diffusion : {m.broadcastRadiusMiles ? `${m.broadcastRadiusMiles} miles` : 'rayon de chaque agent'} · bonus urgence {formatUsd(m.urgencyBonusCents)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(m.broadcastRadiusMiles ?? 0) < widen ? (
                      <ActionForm action={widenMissionAction}>
                        <input type="hidden" name="missionId" value={m.id} />
                        <input type="hidden" name="miles" value={widen} />
                        <SubmitButton tone="secondary">Élargir à {widen} miles</SubmitButton>
                      </ActionForm>
                    ) : (
                      <p className="text-gray-500">Déjà élargie à {m.broadcastRadiusMiles} miles</p>
                    )}
                    <ActionForm action={urgencyBonusAction}>
                      <input type="hidden" name="missionId" value={m.id} />
                      <input name="dollars" type="number" min="0" max="100" step="0.01" required placeholder="15" aria-label="Bonus urgence en dollars"
                        defaultValue={m.urgencyBonusCents ? centsToDollarsInput(m.urgencyBonusCents) : ''} className={`${inputClass} w-24`} />
                      <SubmitButton tone="secondary">Bonus urgence ($)</SubmitButton>
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card id="a-replanifier" title={`À replanifier : créneau passé sans preneur (${boards.toReschedule.length})`}>
          {boards.toReschedule.length === 0 ? <Empty>Aucune.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {boards.toReschedule.map((m) => (
                <li key={m.id} className="flex flex-wrap items-start justify-between gap-4 py-3 text-sm">
                  <div>
                    <Link href={`/admin/pros/${m.proId}`} className={linkClass}>{m.pro.businessName}</Link> · {m.pro.city}, {m.pro.state}
                    <p className="text-gray-600">Créneau passé : {formatSlot(m.slotAt, m.pro.timeZone)} (heure du pro)</p>
                  </div>
                  <div className="space-y-2">
                    <ActionForm action={rescheduleMissionAction}>
                      <input type="hidden" name="missionId" value={m.id} />
                      <input type="datetime-local" name="slotLocal" required aria-label={`Nouveau créneau, heure du pro (${m.pro.timeZone})`} className={`${inputClass} w-56`} />
                      <SubmitButton>Replanifier</SubmitButton>
                    </ActionForm>
                    <p className="text-xs text-gray-500">À l’heure du pro ({m.pro.timeZone}) ; la mission est republiée.</p>
                    <CancelMissionForm missionId={m.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card id="sans-nouvelles" title={`Visites sans nouvelles : pas de check-in 2 h après le créneau (${boards.silent.length})`}>
          <p className="mb-2 text-xs text-gray-500">L’agent reçoit un SMS de relance à +2 h ; la mission est remise en ligne à +24 h.</p>
          {boards.silent.length === 0 ? <Empty>Aucune.</Empty> : (
            <ul className="divide-y divide-gray-100">
              {boards.silent.map((m) => (
                <li key={m.id} className="py-3 text-sm">
                  <Link href={`/admin/pros/${m.proId}`} className={linkClass}>{m.pro.businessName}</Link> · {m.pro.phone} · créneau {formatSlot(m.slotAt, m.pro.timeZone)}
                  <p className="text-gray-600">
                    Agent : {m.agent ? <><Link href={`/admin/agents/${m.agent.id}`} className={linkClass}>{m.agent.firstName} {m.agent.lastName}</Link> · {m.agent.phone}</> : '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card id="liste" title="Toutes les missions">
          <FilterLinks base="/admin/missions" hash="#liste" current={status} options={MISSION_STATUSES} labels={MISSION_STATUS_LABELS} />
          {missions.length === 0 ? <Empty>Aucune mission.</Empty> : (
            <Table head={['Créneau (heure du pro)', 'Pro', 'Type', 'Statut', 'Agent']}>
              {missions.map((m) => (
                <tr key={m.id}>
                  <td className={tdClass}><Link href={missionHref(m)} className={linkClass}>{formatSlot(m.slotAt, m.pro.timeZone)}</Link></td>
                  <td className={tdClass}>{m.pro.businessName}<p className="text-xs text-gray-500">{m.pro.city}, {m.pro.state}</p></td>
                  <td className={tdClass}>{MISSION_TYPE_LABELS[m.type]}</td>
                  <td className={tdClass}><Badge>{MISSION_STATUS_LABELS[m.status]}</Badge></td>
                  <td className={tdClass}>
                    {m.agent ? <Link href={`/admin/agents/${m.agent.id}`} className={linkClass}>{m.agent.firstName} {m.agent.lastName}</Link> : '—'}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  )
}
