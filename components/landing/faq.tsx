import type { ReactNode } from 'react'
import { Icon } from '@/components/mc/icons'
import { BRAND_ADDRESS, BRAND_LEGAL, BRAND_SUPPORT, independenceLine } from '@/lib/brand'

// Questions franches, la première sur le paiement. Port de MapCrew.landing.faq.
export function Faq() {
  const items: { q: string; a: ReactNode }[] = [
    { q: 'When do I get paid?', a: <><p>Every Friday, via Stripe, for every payment step validated by [cutoff day and time placeholder]. Money goes to the bank account or debit card you connect.</p><p>Your first payout can take a few extra days while Stripe verifies your details.</p></> },
    { q: 'Do I need a car?', a: <p>No. You set a travel radius and tell us whether you have a car; we only show missions you can reach. Some areas will have fewer missions without one.</p> },
    // Pas d'avis ici (règle n° 2) : la maquette disait « paid for visits — never for reviews ».
    { q: 'Is this legit?', a: <p>{`Yes, and you can check: ${BRAND_LEGAL} is a registered US company at ${BRAND_ADDRESS}. Every business agreed to the visit before it’s offered to you, you’re paid for the visit and the setup help you give, and it costs nothing to join. ${independenceLine()}`}</p> },
    { q: 'How do taxes work (1099)?', a: <p>You’re an independent contractor, so we don’t withhold taxes. If your earnings pass the IRS reporting threshold, you’ll get a 1099-NEC through Stripe early the next year. Setting some money aside helps. This isn’t tax advice.</p> },
    { q: 'What if the owner isn’t there?', a: <p>Check in on arrival so we know you made it, then tap “Owner not here”. Our team calls the business while you wait. If the visit can’t happen: [no-show policy placeholder].</p> },
    { q: 'Why 18+?', a: <p>You’ll sign a contractor agreement, get paid through Stripe and visit businesses on your own. All of that requires you to be an adult.</p> },
  ]
  return (
    <section className="lp-sec" id="faq" aria-labelledby="faq-h">
      <div className="lp-wrap lp-faq__grid">
        <div>
          <p className="lp-eyebrow">FAQ</p>
          <h2 className="lp-h2" id="faq-h">Fair questions.</h2>
          <p className="lp-lede">{`Still unsure? Write to ${BRAND_SUPPORT} — a person answers.`}</p>
        </div>
        <div className="lp-faq">
          {items.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}<Icon name="plus" /></summary>
              <div>{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
