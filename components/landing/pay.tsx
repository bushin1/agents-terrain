import { Icon } from '@/components/mc/icons'
import type { ReviewAmounts } from '@/components/mc/money'
import { ReviewEstimator } from './estimator'

const LEVEL_INFO: Array<{ key: keyof ReviewAmounts; label: string; threshold: string; cls: string }> = [
  { key: 'STARTER', label: 'Débutant', threshold: 'Dès votre 1er avis', cls: '' },
  { key: 'BRONZE', label: 'Bronze', threshold: 'Dès 10 avis approuvés', cls: 'bronze' },
  { key: 'SILVER', label: 'Argent', threshold: 'Dès 30 avis approuvés', cls: 'silver' },
  { key: 'GOLD', label: 'Or', threshold: 'Dès 100 avis approuvés', cls: 'gold' },
]

export function Pay({ levelCents }: { levelCents: ReviewAmounts }) {
  return (
    <section className="lp-sec lp-sec--sunk" id="pay" aria-labelledby="pay-h">
      <div className="lp-wrap lp-pay__grid">
        <div>
          <p className="lp-eyebrow">Rémunération, 100 % transparente</p>
          <h2 className="lp-h2" id="pay-h">Plus vous avancez, plus chaque avis vous rapporte.</h2>
          <p className="lp-lede">Vous voyez le montant avant d'accepter une mission. Rien de caché.</p>
          <div className="lp-levels">
            {LEVEL_INFO.map(({ key, label, threshold, cls }) => (
              <div className="lp-level" key={key}>
                {cls ? <span className={`mc-level mc-level--${cls}`}>{label}</span> : <span className="mc-badge mc-badge--outline">{label}</span>}
                <b>{`${levelCents[key] / 100} $ / avis`}</b>
                <span>{threshold}</span>
              </div>
            ))}
          </div>
          <div className="lp-friday">
            <Icon name="calendar" />
            <div><b>Payé chaque vendredi via Stripe</b><span>Sur le compte bancaire ou la carte de débit que vous connectez. Aucun frais d'adhésion.</span></div>
          </div>
        </div>
        <ReviewEstimator levelCents={levelCents} />
      </div>
    </section>
  )
}
