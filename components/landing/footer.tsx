import { Icon } from '@/components/mc/icons'
import { Logo } from '@/components/mc/logo'
import { BRAND_ADDRESS, BRAND_LEGAL, independenceLineFr } from '@/lib/brand'

export function Footer() {
  return (
    <div className="lp-sec--forest">
      <div className="lp-wrap">
        <section className="lp-final" aria-labelledby="final-h">
          <div>
            <h2 id="final-h">Votre quartier a des commerces qui méritent d&apos;être connus.</h2>
            <p className="lp-final__fine">18 ans et plus · Travailleur autonome · Environ 5 minutes pour postuler</p>
          </div>
          <a className="mc-btn mc-btn--primary mc-btn--lg" href="/apply">Postuler en 5 minutes <Icon name="arrow-right" /></a>
        </section>
        <footer className="lp-foot">
          <div className="lp-foot__legal">
            <Logo />
            <span><b>{BRAND_LEGAL}</b><br />{BRAND_ADDRESS}</span>
          </div>
          <nav aria-label="Pages légales">
            {['Conditions', 'Confidentialité', 'Contrat agent', 'Contact', "Centre d'aide"].map((label) => (
              <a href="#" key={label}>{label}</a>
            ))}
          </nav>
          <div className="lp-foot__legal">
            <span>{`${independenceLineFr()} Google Business Profile est une marque de commerce de Google LLC.`}</span>
            <span>Les gains présentés sont des exemples, pas des garanties. Les agents sont des travailleurs autonomes, 18 ans et plus.</span>
            <span>{`© ${new Date().getFullYear()} ${BRAND_LEGAL}`}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
