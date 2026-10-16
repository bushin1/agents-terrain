import type { ReviewAmounts } from '@/components/mc/money'
import { Faq } from './faq'
import { Footer } from './footer'
import { Hero } from './hero'
import { How } from './how'
import { Nav } from './nav'
import { Pay } from './pay'
import { StickyApply } from './sticky-apply'
import { Trust } from './trust'
import { Visit } from './visit'
import { Who } from './who'

export interface LandingProps { levelCents: ReviewAmounts }

export function Landing({ levelCents }: LandingProps) {
  return (
    <div className="mc lp" data-theme="light">
      <Nav />
      <main>
        <Hero levelCents={levelCents} />
        <How />
        <Pay levelCents={levelCents} />
        <Visit />
        <Who />
        <Trust />
        <Faq />
      </main>
      <Footer />
      <StickyApply />
    </div>
  )
}
