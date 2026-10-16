import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import type { ReviewAmounts } from '@/components/mc/money'

export function Hero({ levelCents }: { levelCents: ReviewAmounts }) {
  const starterAmt = `${levelCents.STARTER / 100} $`
  const goldAmt = `${levelCents.GOLD / 100} $`
  return (
    <section className="lp-wrap lp-hero" aria-labelledby="hero-h">
      <div className="lp-hero__grid">
        <div>
          <p className="lp-eyebrow">
            <Icon name="pin" className="mc-ico--sm" /> Agents terrain · Canada · 18+
          </p>
          <h1 id="hero-h">Donnez votre avis. <em>Gagnez de l'argent.</em></h1>
          <p className="lp-hero__sub">
            Visitez un commerce près de chez vous, vivez l'expérience en tant que client, partagez votre avis honnête sur Google et gagnez{' '}
            <b>{`de ${starterAmt} à ${goldAmt} par avis approuvé`}</b> — payé chaque vendredi.
          </p>
          <div className="lp-hero__ctas" id="hero-ctas">
            <a className="mc-btn mc-btn--primary mc-btn--lg" href="/apply">Postuler en 5 minutes <Icon name="arrow-right" /></a>
            <a className="mc-btn mc-btn--secondary mc-btn--lg" href="#pay">Comment je suis payé ?</a>
          </div>
          <ul className="lp-facts">
            {['Payé chaque vendredi', 'Aucun quota', 'Vraies visites seulement', 'Vous choisissez où'].map((fact) => (
              <li key={fact}><Icon name="check" />{fact}</li>
            ))}
          </ul>
        </div>
        <div className="lp-hero__visual">
          <MapMotif
            seed={21} cols={7} rows={7} label="Carte des missions dans un quartier" you={[24, 78]} radius={260}
            pins={[
              { x: 74, y: 22, tag: `${levelCents.GOLD / 100} $`, label: `Mission, ${goldAmt}` },
              { x: 86, y: 54, tag: 'Bonus', bonus: true, label: 'Mission avec bonus' },
              { x: 58, y: 40, state: 'done', label: 'Avis déposé' },
              { x: 40, y: 18, tag: `${levelCents.BRONZE / 100} $`, label: `Mission, ${levelCents.BRONZE / 100} $` },
              { x: 92, y: 84, state: 'muted', label: 'Déjà pris' },
            ]}
          />
          <div className="lp-toast" aria-hidden="true">
            <span className="lp-toast__i"><Icon name="check" /></span>
            <span className="lp-toast__t"><b>Avis approuvé</b><span>{`${starterAmt} ajouté à votre solde`}</span></span>
          </div>
          <div className="lp-hero__floater mc-card" aria-hidden="true" style={{ boxShadow: 'var(--shadow-raised)' }}>
            <div className="overline mc-muted" style={{ marginBottom: 8 }}>Vos gains ce mois</div>
            <div className="mc-kv">
              <div><span className="k">Niveau Débutant</span><span className="v">{starterAmt}/avis</span></div>
              <div><span className="k">Niveau Bronze</span><span className="v">{levelCents.BRONZE / 100} $/avis</span></div>
              <div><span className="k">Niveau Or</span><span className="v">{goldAmt}/avis</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
