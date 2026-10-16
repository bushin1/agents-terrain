import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Hero } from './hero'
import { How } from './how'
import { Nav } from './nav'
import { Pay } from './pay'

const AMOUNTS = { VISIT: 4500, LIVE: 3000, CLIENT: 6000 }
const LEVELS = [
  { name: 'GOLD' as const, minValidated: 20, bonusPct: 25 },
  { name: 'BRONZE' as const, minValidated: 0, bonusPct: 0 },
  { name: 'SILVER' as const, minValidated: 8, bonusPct: 12 },
]

describe('haut de page', () => {
  it('Nav : « Log in » mène à /login, « Apply » à /apply', () => {
    const html = renderToStaticMarkup(<Nav />)
    expect(html).toContain('href="/login">Log in</a>')
    expect(html).toContain('href="/apply">Apply</a>')
  })

  it('Hero : « up to » calculé, panneau et pins issus des props, téléphone non interactif', () => {
    const html = renderToStaticMarkup(<Hero amounts={AMOUNTS} />)
    expect(html).toContain('<b>up to $135 per business</b>')
    expect(html).toContain('<span class="v">+$30</span>')
    expect(html).toContain('<span class="mc-pin__tag">$135</span>')
    const phone = /<div class="lp-hero__phone" aria-hidden="true">[\s\S]*?Accept mission/.exec(html)![0]
    expect(phone).not.toMatch(/<a |<button/)
  })

  it('How : trois étapes', () => {
    expect(renderToStaticMarkup(<How />).split('class="lp-stepcard"')).toHaveLength(4)
  })

  it('Pay : paiements des réglages, étape 3 en contour, niveaux triés', () => {
    const html = renderToStaticMarkup(<Pay amounts={AMOUNTS} levels={LEVELS} />)
    expect(html).toContain('<span class="mc-payout__amt">+$60</span>')
    expect(html).toContain('<div class="lp-pstep lp-pstep--maybe"><span class="mc-payout__n">Step 3 · if it happens</span>')
    const levels = [...html.matchAll(/mc-level--(\w+)">\w+<\/span><b>\+(\d+)%<\/b><span>([^<]+)</g)].map((m) => m.slice(1))
    expect(levels).toEqual([['bronze', '0', 'From your first visit'], ['silver', '12', 'After 8 validated visits'], ['gold', '25', 'After 20 validated visits']])
  })
})
