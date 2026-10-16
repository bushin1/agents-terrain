import { Icon } from '@/components/mc/icons'
import { Logo } from '@/components/mc/logo'
import { BRAND_ADDRESS, BRAND_LEGAL, independenceLine } from '@/lib/brand'

// Appel final et pied de page (mentions légales, 2e ligne d'indépendance). Port de MapCrew.landing.footer.
// Les pages légales n'existent pas encore : liens « # » comme la maquette, à remplacer avant le lancement public.
export function Footer() {
  return (
    <div className="lp-sec--forest">
      <div className="lp-wrap">
        <section className="lp-final" aria-labelledby="final-h">
          <div>
            <h2 id="final-h">Your neighborhood has businesses that need to be found.</h2>
            <p className="lp-final__fine">18+ only · Independent contractor · About 5 minutes to apply</p>
          </div>
          <a className="mc-btn mc-btn--primary mc-btn--lg" href="/apply">Apply in 5 minutes <Icon name="arrow-right" /></a>
        </section>
        <footer className="lp-foot">
          <div className="lp-foot__legal">
            <Logo />
            <span><b>{BRAND_LEGAL}</b><br />{BRAND_ADDRESS}</span>
          </div>
          <nav aria-label="Legal">
            {['Terms', 'Privacy', 'Contractor agreement', 'Contact', 'Help center'].map((label) => (
              <a href="#" key={label}>{label}</a>
            ))}
          </nav>
          <div className="lp-foot__legal">
            <span>{`${independenceLine()} Google Business Profile is a trademark of Google LLC.`}</span>
            <span>Earnings shown are examples, not guarantees. Agents are independent contractors, 18 or older.</span>
            <span>{`© ${new Date().getFullYear()} ${BRAND_LEGAL}`}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
