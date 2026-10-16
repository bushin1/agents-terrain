import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppBar } from '@/components/agent/app-bar'
import { PayoutTracker } from '@/components/agent/payout-tracker'
import { trackerSteps } from '@/components/agent/tracker-rule'
import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import { LEVEL_LABEL, usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { prisma } from '@/lib/prisma'
import { getMissionForAgent } from '@/modules/missions'
import { getSettings } from '@/modules/settings'
import { accept, release } from './actions'

export default async function MissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ accepted?: string; error?: string }> }) {
  const agent = await requireAgentIn(['ACTIVE', 'SUSPENDED'])
  const { id } = await params
  const { accepted, error } = await searchParams
  const d = await getMissionForAgent(id, agent)
  if (!d) notFound()
  const s = d.summary
  const status = s.status
  const daytime = true // créneaux posés par l'équipe pendant les heures d'ouverture (badge de la maquette)
  const p = d.pay
  const afterSubmit = d.mine && ['SUBMITTED', 'VALIDATED', 'REJECTED'].includes(status)
  const earnings = afterSubmit ? await prisma.earning.findMany({ where: { missionId: id } }) : []
  const amounts = (await getSettings()).tierAmountsCents

  return (
    <>
      <div style={{ position: 'relative', flex: 'none' }}>
        <MapMotif seed={33} cols={5} rows={4} gap={2.8} height={200} water={false} style={{ borderRadius: 0 }} you={[26, 74]} route="M26 74 L26 62 L64 62 L64 50" pins={[{ x: 64, y: 50, selected: true, label: 'Mission location (approximate)' }]} />
        <div style={{ position: 'absolute', left: 8, top: 6, zIndex: 5 }}>
          <Link href={d.mine ? '/agent/visits' : '/agent/missions'} className="mc-iconbtn" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }} aria-label="Back"><Icon name="arrow-left" /></Link>
        </div>
      </div>
      {error && <p className="mc-error" role="alert" style={{ margin: '12px 16px 0' }}><Icon name="alert" className="mc-ico--sm" />{error}</p>}
      {accepted && <div className="mc-toast mc-toast--success" role="status"><span className="mc-toast__icon"><Icon name="check" /></span><span>Mission acceptée.</span></div>}
      <main className="mc-scroll" style={{ paddingTop: 20 }}>
        <div className="mc-row">
          {s.urgencyBonusCents > 0 && <span className="mc-badge mc-badge--bonus"><Icon name="flag" /> Bonus +{usd(s.urgencyBonusCents)}</span>}
          {daytime && <span className="mc-badge mc-badge--outline"><Icon name="sun" /> Journée</span>}
          {d.mine && status === 'NEEDS_FIX' && <span className="mc-badge mc-badge--danger"><Icon name="alert" /> Correction requise</span>}
        </div>
        <h1 className="h1" style={{ marginTop: 12 }}>{d.pro?.businessName ?? s.trade}</h1>
        <p className="mc-muted" style={{ marginTop: 4 }}>{s.trade} · {s.city}, {s.state} · {s.distanceMiles} mi</p>

        <div className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mc-row" style={{ gap: 12 }}><Icon name="calendar" /><div><b>{s.slotLabel}</b><div className="body-s mc-muted">Prévoir 45–60 minutes sur place</div></div></div>
          <div className="mc-row" style={{ gap: 12 }}><Icon name="store" /><div><b>Le propriétaire a accepté cette visite</b><div className="body-s mc-muted">Réservé par notre équipe le {new Date(d.bookedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}. {d.pro ? '' : 'Adresse exacte après acceptation.'}</div></div></div>
          {d.pro && (
            <div className="mc-row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <Icon name="pin" />
              <div>
                <b>{d.pro.address}, {d.pro.city}, {d.pro.state} {d.pro.zip}</b>
                <div className="body-s mc-muted">{d.pro.contactName ?? 'Propriétaire'} · <a className="mc-link" href={`tel:${d.pro.phone}`}>Appeler</a> · <a className="mc-link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${d.pro.address}, ${d.pro.city}, ${d.pro.state} ${d.pro.zip}`)}`} target="_blank" rel="noreferrer">Itinéraire</a></div>
              </div>
            </div>
          )}
        </div>

        {d.fixMessage && status === 'NEEDS_FIX' && (
          <div className="mc-card mc-card--sunk" style={{ marginTop: 12, display: 'flex', gap: 12 }} role="status"><Icon name="alert" /><p className="body-s"><b>À corriger :</b> {d.fixMessage}</p></div>
        )}

        {afterSubmit ? (
          <>
            <h2 className="h3" style={{ margin: '24px 0 16px' }}>Étapes de paiement</h2>
            <PayoutTracker steps={trackerSteps({ type: s.type, status, earnings, amounts })} />
          </>
        ) : (
          <>
            <h2 className="h3" style={{ marginTop: 24 }}>À quoi s&apos;attendre</h2>
            <ul className="mc-stack" style={{ marginTop: 12, gap: 10 }}>
              {[...(d.claimExisting ? ['L\'entreprise est déjà sur Google : aidez le propriétaire à revendiquer la fiche existante plutôt que d\'en créer une nouvelle'] : ['Créer un nouveau profil (aucun n\'existe encore)']), `Catégorie suggérée : ${d.suggestedCategory}`, ...d.instructions].map((t) => (
                <li key={t} className="mc-row" style={{ gap: 10, alignItems: 'flex-start' }}><span style={{ color: 'var(--ink-muted)' }}><Icon name="check" className="mc-ico--sm" /></span><span style={{ fontSize: 15 }}>{t}</span></li>
              ))}
            </ul>
            <h2 className="h3" style={{ marginTop: 24 }}>Votre rémunération</h2>
            <div className="mc-card" style={{ marginTop: 12 }}>
              <div className="mc-kv">
                {p.kind === ‘RETURN_VISIT’ ? (
                  <div><span className="k">Visite de retour validée</span><span className="v">{usd(p.returnVisitCents, { cents: true })}</span></div>
                ) : (
                  <>
                    <div><span className="k">Visite validée</span><span className="v">{usd(p.visitCents, { cents: true })}</span></div>
                    <div><span className="k">Fiche publiée</span><span className="v">+{usd(p.liveCents, { cents: true })}</span></div>
                    <div><span className="k">S&apos;ils deviennent client</span><span className="v">+{usd(p.clientCents, { cents: true })}</span></div>
                  </>
                )}
                {p.urgencyCents > 0 && <div><span className="k">Bonus mission</span><span className="v">+{usd(p.urgencyCents, { cents: true })}</span></div>}
                {p.levelBonusCents > 0 && <div><span className="k"><span className={`mc-level mc-level--${p.levelName.toLowerCase()}`} style={{ height: 24 }}>{LEVEL_LABEL[p.levelName]} +{p.levelBonusPct}%</span></span><span className="v">+{usd(p.levelBonusCents, { cents: true })}</span></div>}
                <div><span className="k mc-kv__total">Jusqu&apos;à</span><span className="v money">{usd(p.upToCents, { cents: true })}</span></div>
              </div>
              {p.kind === ‘VISIT’ && <p className="body-s mc-muted" style={{ marginTop: 8 }}>La dernière étape dépend de la décision du propriétaire. Votre bonus de niveau s&apos;applique aux trois étapes.</p>}
            </div>
            <div className="mc-card mc-card--sunk" style={{ marginTop: 12, display: ‘flex’, gap: 12 }}>
              <Icon name="info" />
              <p className="body-s"><b>Annulation gratuite jusqu&apos;à 24 h avant</b> — jusqu&apos;au {d.releaseDeadlineLabel}. Après ce délai, contactez le support.</p>
            </div>
          </>
        )}
      </main>
      <div className="mc-bottom">
        {!d.mine && status === 'OPEN' && agent.status === 'ACTIVE' && (
          <form action={async () => { 'use server'; await accept(id) }}>
            <button type="submit" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Accepter la mission</button>
          </form>
        )}
        {d.mine && (status === 'ACCEPTED' || status === 'NEEDS_FIX') && (
          <Link href={`/agent/missions/${id}/visit`} className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">{status === 'NEEDS_FIX' ? 'Corriger ma visite' : 'Commencer la visite'}</Link>
        )}
        {d.canRelease && (
          <form action={async () => { 'use server'; await release(id) }}>
            <button type="submit" className="mc-btn mc-btn--ghost mc-btn--block">Libérer cette mission</button>
          </form>
        )}
      </div>
    </>
  )
}
