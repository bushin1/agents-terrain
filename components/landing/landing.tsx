import type { PayAmounts, PayLevel } from '@/components/mc/money'
import { Faq } from './faq'
import { Footer } from './footer'
import { Hero } from './hero'
import { How } from './how'
import { Nav } from './nav'
import { Pay } from './pay'
import { Trust } from './trust'
import { Visit } from './visit'
import { Who } from './who'

// Montants (cents) et niveaux viennent des réglages (modules/settings).
export interface LandingProps { amounts: PayAmounts; levels: PayLevel[] }

// Landing : un seul balisage, la mise en page passe en desktop par container query à 900 px sur `.lp`.
// Même ordre de sections que MapCrew.renderLanding(…, ["nav","hero","how","pay","visit","who","trust","faq","footer"]).
export function Landing({ amounts, levels }: LandingProps) {
  return (
    <div className="mc lp" data-theme="light">
      <Nav />
      <main>
        <Hero amounts={amounts} />
        <How />
        <Pay amounts={amounts} levels={levels} />
        <Visit amounts={amounts} />
        <Who />
        <Trust />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
