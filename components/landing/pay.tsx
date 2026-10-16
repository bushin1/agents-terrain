import { Fragment } from 'react'
import { Icon } from '@/components/mc/icons'
import { LEVEL_LABEL, sortLevels, usd, type PayAmounts, type PayLevel } from '@/components/mc/money'
import { Estimator } from './estimator'

// Paie transparente : les trois paiements, les niveaux, le vendredi, et l'estimateur.
// Port de MapCrew.landing.pay ; montants et pourcentages lus dans les réglages.
export function Pay({ amounts, levels }: { amounts: PayAmounts; levels: PayLevel[] }) {
  const steps = [
    { cls: 'lp-pstep', n: 'Step 1', when: 'When we validate your visit', note: 'Checked by our team after check-out', amt: usd(amounts.VISIT) },
    { cls: 'lp-pstep', n: 'Step 2', when: 'When the profile goes live', note: 'After the owner finishes verification', amt: `+${usd(amounts.LIVE)}` },
    // Étape 3 jamais présentée comme certaine : carte en contour, « if it happens ».
    { cls: 'lp-pstep lp-pstep--maybe', n: 'Step 3 · if it happens', when: 'If the business becomes our customer', note: 'The owner decides — not guaranteed', amt: `+${usd(amounts.CLIENT)}` },
  ]
  return (
    <section className="lp-sec lp-sec--sunk" id="pay" aria-labelledby="pay-h">
      <div className="lp-wrap lp-pay__grid">
        <div>
          <p className="lp-eyebrow">Pay, fully transparent</p>
          <h2 className="lp-h2" id="pay-h">Three payments per business. All on the card.</h2>
          <p className="lp-lede">You see the full breakdown before you accept a mission. Nothing is hidden behind “up to”.</p>
          <div className="lp-payout">
            {steps.map((s, i) => (
              <Fragment key={s.n}>
                {i > 0 ? <span className="mc-payout__arrow"><Icon name="arrow-right" className="mc-ico--lg" /></span> : null}
                <div className={s.cls}>
                  <span className="mc-payout__n">{s.n}</span>
                  <span className="mc-payout__when">{s.when}</span>
                  <span className="mc-payout__note">{s.note}</span>
                  <span className="mc-payout__amt">{s.amt}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="lp-levels">
            {sortLevels(levels).map((l) => (
              <div className="lp-level" key={l.name}>
                <span className={`mc-level mc-level--${l.name.toLowerCase()}`}>{LEVEL_LABEL[l.name]}</span>
                <b>{`+${l.bonusPct}%`}</b>
                <span>{l.minValidated === 0 ? 'From your first visit' : `After ${l.minValidated} validated visits`}</span>
              </div>
            ))}
          </div>
          <div className="lp-friday">
            <Icon name="calendar" />
            <div><b>Paid every Friday via Stripe</b><span>To the bank account or debit card you connect. No fees to join.</span></div>
          </div>
        </div>
        <Estimator amounts={amounts} levels={levels} />
      </div>
    </section>
  )
}
