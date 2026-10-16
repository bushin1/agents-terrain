import { Logo } from '@/components/mc/logo'

// En-tête : logo, ancres des sections (desktop), « Log in » et « Apply ». Port de MapCrew.landing.nav.
export function Nav() {
  return (
    <header className="lp-wrap lp-nav">
      <Logo />
      <nav className="lp-navlinks" aria-label="Sections">
        <a href="#how">How it works</a><a href="#pay">Pay</a><a href="#safety">Safety</a><a href="#faq">FAQ</a>
      </nav>
      <span className="mc-row">
        <a className="mc-btn mc-btn--ghost lp-nav__cta-d" href="/login">Log in</a>
        <a className="mc-btn mc-btn--primary mc-btn--sm lp-nav__cta-m" href="/apply">Apply</a>
        <a className="mc-btn mc-btn--primary lp-nav__cta-d" href="/apply">Apply in 5 minutes</a>
      </span>
    </header>
  )
}
