import { usd, type PayAmounts } from '@/components/mc/money'
import { Scene } from './illustrations'

// Déroulé d'une visite, minute par minute. Port de MapCrew.landing.visit.
export function Visit({ amounts }: { amounts: PayAmounts }) {
  const steps = [
    ['0:00', 'Check in', 'Tap check-in when you arrive. We confirm with the owner that you’re there.'],
    ['0:05', 'Owner signs consent', 'They read and sign on your phone: what you’ll do, what you won’t.'],
    ['0:10', 'Profile set up — on their phone', 'The owner signs in to their own Google account. You guide; they type. You never see their password.'],
    ['0:30', 'Photos', '10–15 shots: logo, truck, team, equipment, past jobs. The app shows what’s still missing.'],
    ['0:45', 'Verification', 'If Google offers video verification, you walk the owner through it.'],
    ['0:55', 'Done — check out', `Submit your checklist. Your ${usd(amounts.VISIT)} is on its way to validation.`],
  ]
  return (
    <section className="lp-sec" aria-labelledby="visit-h">
      <div className="lp-wrap lp-visit__grid">
        <div>
          <p className="lp-eyebrow">What a visit looks like</p>
          <h2 className="lp-h2" id="visit-h">About an hour, start to finish.</h2>
          <p className="lp-lede">The app walks you through every step. Training covers the rest, including what to say.</p>
          <Scene name="visit" className="lp-visitphoto" label="An agent points at the screen while the owner sets up the profile on their own phone, next to their truck." />
        </div>
        <ol className="lp-timeline">
          {steps.map(([t, title, text]) => (
            <li className="lp-tl" key={t}>
              <span className="lp-tl__t">{t}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
