import type { MissionStatus } from '@prisma/client'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/app/admin/_components/action-form'
import { Badge, Card, Empty, PageHeader, Table, inputClass, linkClass, tdClass } from '@/app/admin/_components/ui'
import { formatParis, formatUsd, missionHref } from '@/app/admin/_lib/format'
import { AGENT_STATUS_LABELS, EARNING_STATUS_LABELS, FRAUD_LABELS, LEVEL_LABELS, MISSION_STATUS_LABELS, MISSION_TYPE_LABELS, TIER_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { formatSlot } from '@/lib/time'
import { agentStats, getAgent } from '@/modules/agents'
import { levelFor, listEarnings } from '@/modules/ledger'
import { getSettings } from '@/modules/settings'
import { resolveFlagAction } from '../../review/actions'
import { reactivateAgentAction, refuseAgentAction, suspendAgentAction, unlockAgentAction, voidEarningAction } from '../actions'

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(['ADMIN'])
  const agent = await getAgent((await params).id)
  if (!agent) notFound()
  const [stats, earnings, settings] = await Promise.all([agentStats(agent.id), listEarnings(agent.id), getSettings()])
  const level = levelFor(stats.byStatus.VALIDATED ?? 0, settings.levels)
  const byStatus = Object.entries(stats.byStatus).map(([s, n]) => `${MISSION_STATUS_LABELS[s as MissionStatus]} : ${n}`).join(' · ')
  const hidden = <input type="hidden" name="agentId" value={agent.id} />

  return (
    <>
      <PageHeader title={`${agent.firstName} ${agent.lastName}`} back={{ href: '/admin/agents', label: 'Agents' }} />
      <p className="-mt-4 mb-6 flex gap-2">
        <Badge>{AGENT_STATUS_LABELS[agent.status]}</Badge>
        <Badge tone="green">Niveau {LEVEL_LABELS[level.name]} (+{level.bonusPct} %)</Badge>
      </p>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Statistiques">
            <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><dt className="text-gray-500">Taux de validation</dt><dd className="text-xl font-semibold">{stats.validationRatePct != null ? `${stats.validationRatePct} %` : '—'}</dd></div>
              <div><dt className="text-gray-500">Note moyenne des pros</dt><dd className="text-xl font-semibold">{stats.avgProRating != null ? `${stats.avgProRating}/5` : '—'}</dd></div>
              <div><dt className="text-gray-500">Alertes ouvertes</dt><dd className="text-xl font-semibold">{stats.openFlags}</dd></div>
              <div><dt className="text-gray-500">Solde à payer</dt><dd className="text-xl font-semibold">{formatUsd(stats.balanceCents)}</dd></div>
            </dl>
            <p className="mt-3 text-sm text-gray-600">Missions : {byStatus || 'aucune'}</p>
          </Card>
          <Card title="Missions (50 dernières)">
            {agent.missions.length === 0 ? <Empty>Aucune mission.</Empty> : (
              <Table head={['Créneau (heure du pro)', 'Pro', 'Type', 'Statut']}>
                {agent.missions.map((m) => (
                  <tr key={m.id}>
                    <td className={tdClass}><Link href={missionHref(m)} className={linkClass}>{formatSlot(m.slotAt, m.pro.timeZone)}</Link></td>
                    <td className={tdClass}>{m.pro.businessName}<p className="text-xs text-gray-500">{m.pro.city}, {m.pro.state}</p></td>
                    <td className={tdClass}>{MISSION_TYPE_LABELS[m.type]}</td>
                    <td className={tdClass}><Badge>{MISSION_STATUS_LABELS[m.status]}</Badge></td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
          <Card title="Gains">
            {earnings.length === 0 ? <Empty>Aucun gain.</Empty> : (
              <Table head={['Date', 'Palier', 'Mission', 'Montant', 'Statut', '']}>
                {earnings.map((e) => (
                  <tr key={e.id}>
                    <td className={tdClass}>{formatParis(e.createdAt)}</td>
                    <td className={tdClass}>{TIER_LABELS[e.tier]}</td>
                    <td className={tdClass}><Link href={`/admin/missions/${e.missionId}`} className={linkClass}>{e.mission.pro.trade} · {e.mission.pro.city}, {e.mission.pro.state}</Link></td>
                    <td className={tdClass}>{formatUsd(e.amountCents)}{e.levelBonusPct > 0 && <p className="text-xs text-gray-500">dont niveau +{e.levelBonusPct} %</p>}</td>
                    <td className={tdClass}>
                      <Badge tone={e.status === 'VOID' ? 'red' : 'gray'}>{EARNING_STATUS_LABELS[e.status]}</Badge>
                      {e.voidReason && <p className="mt-1 text-xs text-gray-500">{e.voidReason} ({e.voidedBy})</p>}
                    </td>
                    <td className={tdClass}>
                      {e.status === 'PAYABLE' && (
                        <ActionForm action={voidEarningAction}>
                          <input type="hidden" name="earningId" value={e.id} />
                          <input name="reason" required placeholder="Motif" aria-label="Motif de l’annulation" className={`${inputClass} w-40`} />
                          <SubmitButton tone="danger">Annuler ce gain</SubmitButton>
                        </ActionForm>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Actions">
            {agent.status === 'ACTIVE' && (
              <ActionForm action={suspendAgentAction} className="space-y-2">
                {hidden}
                <input name="reason" required placeholder="Motif de la suspension" aria-label="Motif" className={inputClass} />
                <p className="text-xs text-gray-500">Ses missions acceptées sont remises en ligne.</p>
                <SubmitButton tone="danger">Suspendre</SubmitButton>
              </ActionForm>
            )}
            {agent.status === 'SUSPENDED' && (
              <ActionForm action={reactivateAgentAction}>{hidden}<SubmitButton>Réactiver</SubmitButton></ActionForm>
            )}
            {agent.status === 'LOCKED' && (
              <div className="space-y-4">
                <ActionForm action={unlockAgentAction}>{hidden}<SubmitButton>Débloquer (nouveaux essais au quiz)</SubmitButton></ActionForm>
                <ActionForm action={refuseAgentAction} className="space-y-2">
                  {hidden}
                  <input name="reason" required placeholder="Motif du refus" aria-label="Motif" className={inputClass} />
                  <SubmitButton tone="danger">Refuser la candidature</SubmitButton>
                </ActionForm>
              </div>
            )}
            {!['ACTIVE', 'SUSPENDED', 'LOCKED'].includes(agent.status) && <Empty>Aucune action pour ce statut.</Empty>}
          </Card>
          <Card title="Identité">
            <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-gray-500">Email</dt><dd className="break-all">{agent.email}</dd>
              <dt className="text-gray-500">Téléphone</dt><dd>{agent.phone}</dd>
              <dt className="text-gray-500">Naissance</dt><dd>{agent.birthDate.toISOString().slice(0, 10)}</dd>
              <dt className="text-gray-500">Secteur</dt><dd>ZIP {agent.zip} · {agent.radiusMiles} miles</dd>
              <dt className="text-gray-500">Voiture</dt><dd>{agent.hasCar ? 'Oui' : 'Non'}</dd>
              <dt className="text-gray-500">Disponibilités</dt><dd>{agent.availability.join(', ') || '—'}</dd>
              <dt className="text-gray-500">Contrat</dt>
              <dd>{agent.contractSignedAt ? `${agent.contractVersion} signé le ${formatParis(agent.contractSignedAt)}` : 'Non signé'}</dd>
              <dt className="text-gray-500">Inscrit le</dt><dd>{formatParis(agent.createdAt)}</dd>
            </dl>
          </Card>
          <Card title={`Alertes ouvertes (${agent.flags.length})`}>
            {agent.flags.length === 0 ? <Empty>Aucune.</Empty> : (
              <ul className="space-y-3 text-sm">
                {agent.flags.map((f) => (
                  <li key={f.id}>
                    <p className="font-medium">{FRAUD_LABELS[f.type]}</p>
                    <p className="text-gray-600">{f.detail} · <Link href={`/admin/missions/${f.missionId}`} className={linkClass}>mission</Link></p>
                    <ActionForm action={resolveFlagAction}>
                      <input type="hidden" name="flagId" value={f.id} />
                      <SubmitButton tone="secondary">Résolue</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Quiz">
            <p className="mb-2 text-sm text-gray-600">Échecs consécutifs : {agent.failedAttempts}</p>
            {agent.attempts.length === 0 ? <Empty>Aucune tentative.</Empty> : (
              <ul className="space-y-1 text-sm">
                {agent.attempts.map((t) => (
                  <li key={t.id}>{formatParis(t.createdAt)} · {t.score} % · {t.passed ? 'réussi' : 'échoué'}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
