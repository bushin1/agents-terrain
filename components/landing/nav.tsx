import { Logo } from '@/components/mc/logo'

export function Nav() {
  return (
    <header className="lp-wrap lp-nav">
      <Logo />
      <nav className="lp-navlinks" aria-label="Sections">
        <a href="#how">Comment ça marche</a>
        <a href="#pay">Rémunération</a>
        <a href="#safety">Sécurité</a>
        <a href="#faq">FAQ</a>
      </nav>
      <span className="mc-row">
        <a className="mc-btn mc-btn--ghost lp-nav__cta-d" href="/login">Se connecter</a>
        <a className="mc-btn mc-btn--primary mc-btn--sm lp-nav__cta-m" href="/apply">Postuler</a>
        <a className="mc-btn mc-btn--primary lp-nav__cta-d" href="/apply">Postuler en 5 minutes</a>
      </span>
    </header>
  )
}
