import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ActionForm, SubmitButton } from '@/app/admin/_components/action-form'
import { Badge, Banner, Card, Empty, Field, PageHeader, Table, inputClass, linkClass, tdClass } from '@/app/admin/_components/ui'
import { formatParis, formatStamp, mapsUrl } from '@/app/admin/_lib/format'
import { FRAUD_LABELS, MISSION_STATUS_LABELS, MISSION_TYPE_LABELS, PHOTO_CATEGORY_LABELS } from '@/app/admin/_lib/labels'
import { requireAdmin } from '@/lib/session'
import { formatSlot } from '@/lib/time'
import { getReviewDetail } from '@/modules/review'
import { rejectAction, requestFixAction, resolveFlagAction } from '../actions'
import { proReplyText, stepRows } from '../review-view'
import { ValidateForm } from './validate-form'

export default async function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(['ADMIN'])
  const m = await getReviewDetail((await params).id)
  if (!m) notFound()
  const tz = m.pro.timeZone
  const { checkin, consent } = m.steps
  const photos = m.submission?.photos ?? []

  return (
    <>
      <PageHeader title={m.pro.businessName} back={{ href: '/admin/review', label: 'Validation' }} />
      <p className="-mt-4 mb-4 text-sm text-gray-600">
        {MISSION_TYPE_LABELS[m.type]} · {m.pro.trade} · {m.pro.city}, {m.pro.state} · créneau {formatSlot(m.slotAt, tz)} (heure du pro) · agent{' '}
        {m.agent ? <Link href={`/admin/agents/${m.agent.id}`} className={linkClass}>{m.agent.firstName} {m.agent.lastName}</Link> : '—'}
        {m.submittedAt && <> · soumise le {formatParis(m.submittedAt)}</>}
      </p>
      {m.status !== 'SUBMITTED' && (
        <Banner>
          Mission « {MISSION_STATUS_LABELS[m.status]} » : lecture seule.
          {m.status === 'NEEDS_FIX' && m.fixMessage && <> Correction demandée : « {m.fixMessage} »</>}
          {m.rejectReason && <> Motif du rejet : « {m.rejectReason} »</>}
        </Banner>
      )}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Check-in">
            {checkin ? (
              <div className="space-y-1 text-sm">
                <p>
                  Distance à l’adresse du pro : <strong>{m.checkinDistanceMeters != null ? `${m.checkinDistanceMeters} m` : 'inconnue (pro sans coordonnées)'}</strong>
                  {' '}· précision GPS ± {Math.round(checkin.accuracy)} m
                </p>
                <p>
                  <a href={mapsUrl(checkin.lat, checkin.lng)} target="_blank" rel="noreferrer" className={linkClass}>Check-in sur Google Maps</a>
                  {m.pro.lat != null && m.pro.lng != null && (
                    <> · <a href={mapsUrl(m.pro.lat, m.pro.lng)} target="_blank" rel="noreferrer" className={linkClass}>Adresse du pro</a></>
                  )}
                </p>
              </div>
            ) : <Empty>Pas de check-in.</Empty>}
          </Card>
          <Card title="Étapes (heure du pro)">
            <Table head={['Étape', 'Téléphone', 'Serveur', 'Détail']}>
              {stepRows(m.steps).map((r) => (
                <tr key={r.name}>
                  <td className={tdClass}>{r.label}</td>
                  <td className={tdClass}>{formatStamp(r.clientAt, tz)}</td>
                  <td className={tdClass}>{formatStamp(r.receivedAt, tz)}</td>
                  <td className={tdClass}>{r.detail}</td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title={`Photos (${photos.length})`}>
            {photos.length === 0 ? <Empty>Aucune photo.</Empty> : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {photos.map((p) => (
                  <li key={p.id} className="text-xs text-gray-600">
                    <a href={`/api/files/${p.storageKey}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- fichier privé servi par /api/files */}
                      <img src={`/api/files/${p.storageKey}`} alt={PHOTO_CATEGORY_LABELS[p.category]} loading="lazy" className="aspect-[4/3] w-full rounded-md border border-gray-200 object-cover" />
                    </a>
                    <p className="mt-1 font-medium text-gray-800">{PHOTO_CATEGORY_LABELS[p.category]}</p>
                    <p>Reçue {formatStamp(p.receivedAt, tz)}</p>
                    {p.exifTakenAt && <p>Prise (EXIF) {formatStamp(p.exifTakenAt, tz)}</p>}
                    {p.exifLat != null && p.exifLng != null && (
                      <a href={mapsUrl(p.exifLat, p.exifLng)} target="_blank" rel="noreferrer" className={linkClass}>Position EXIF</a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Accord signé par le pro">
            {consent ? (
              <div className="text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- fichier privé servi par /api/files */}
                <img src={`/api/files/${consent.signatureKey}`} alt={`Signature de ${consent.signerName}`} className="h-32 rounded-md border border-gray-200 bg-white" />
                <p className="mt-1 text-gray-600">{consent.signerName} · texte {consent.textVersion}</p>
              </div>
            ) : <Empty>Pas d’accord signé.</Empty>}
          </Card>
        </div>
        <div className="space-y-6">
          {m.status === 'SUBMITTED' && (
            <Card title="Décision">
              <div className="space-y-6">
                <ValidateForm missionId={m.id} />
                <ActionForm action={requestFixAction} className="space-y-2">
                  <input type="hidden" name="missionId" value={m.id} />
                  <Field label="Demander une correction" help="En anglais : envoyé tel quel à l’agent par SMS (ex. Add a photo of the truck.).">
                    <textarea name="message" required rows={3} maxLength={300} className={inputClass} />
                  </Field>
                  <SubmitButton tone="secondary">Envoyer la demande</SubmitButton>
                </ActionForm>
                <ActionForm action={rejectAction} className="space-y-2">
                  <input type="hidden" name="missionId" value={m.id} />
                  <Field label="Rejeter la visite" help="Motif en anglais : envoyé tel quel à l’agent par SMS.">
                    <textarea name="reason" required rows={2} maxLength={300} className={inputClass} />
                  </Field>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="markProLost" /> Marquer le pro perdu</label>
                  <SubmitButton tone="danger">Rejeter</SubmitButton>
                </ActionForm>
              </div>
            </Card>
          )}

          <Card title="Alertes">
            {m.flags.length === 0 ? <Empty>Aucune alerte.</Empty> : (
              <ul className="space-y-3 text-sm">
                {m.flags.map((f) => (
                  <li key={f.id}>
                    <p className="font-medium">
                      {FRAUD_LABELS[f.type]} {f.resolved ? <Badge>Résolue</Badge> : <Badge tone="red">Ouverte</Badge>}
                    </p>
                    <p className="text-gray-600">{f.detail}</p>
                    {!f.resolved && (
                      <ActionForm action={resolveFlagAction}>
                        <input type="hidden" name="flagId" value={f.id} />
                        <SubmitButton tone="secondary">Résolue</SubmitButton>
                      </ActionForm>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Réponse SMS du pro">
            <p className="text-sm">{proReplyText(m)}</p>
          </Card>
          <Card title="Mission">
            <p className="text-sm">Catégorie suggérée : {m.suggestedCategory}</p>
            {m.instructions && <p className="mt-2 whitespace-pre-line text-sm text-gray-700">{m.instructions}</p>}
            <p className="mt-2 text-sm"><Link href={`/admin/pros/${m.proId}`} className={linkClass}>Fiche du pro</Link></p>
          </Card>
        </div>
      </div>
    </>
  )
}
