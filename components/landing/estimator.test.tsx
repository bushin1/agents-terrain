import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Estimator } from './estimator'

const LEVELS = [
  { name: 'SILVER' as const, minValidated: 5, bonusPct: 10 },
  { name: 'BRONZE' as const, minValidated: 0, bonusPct: 0 },
  { name: 'GOLD' as const, minValidated: 15, bonusPct: 20 },
]
const html = renderToStaticMarkup(<Estimator amounts={{ VISIT: 4500, LIVE: 3000, CLIENT: 6000 }} levels={LEVELS} />)

describe('Estimator (rendu initial)', () => {
  it('8 missions, premier niveau : fourchette calculée depuis les props, étiquetée comme exemple', () => {
    expect(html).toContain('<div class="lp-est__range">$360 – $1,080</div>')
    expect(html).toContain('<span>6–8</span> hours on site')
    expect(html).toContain('Low end: only the $45 visit payment.')
    expect(html).toContain('Example, not a guarantee')
  })

  it('curseur étiqueté, relié au résultat annoncé', () => {
    expect(html).toContain('<label class="mc-label mc-between" for="est-n">')
    expect(html).toMatch(/<input class="mc-range" id="est-n" type="range" min="1" max="40" aria-describedby="est-out"[^>]* value="8"\/>/)
    expect(html).toContain('id="est-out" aria-live="polite"')
  })

  it('groupe radio des niveaux, du plus bas au plus haut, un seul coché et focusable', () => {
    expect(html).toContain('role="radiogroup" aria-labelledby="est-lvl"')
    const radios = [...html.matchAll(/role="radio" aria-checked="(true|false)" tabindex="(0|-1)">(\w+)</g)].map((m) => m.slice(1))
    expect(radios).toEqual([['true', '0', 'Bronze'], ['false', '-1', 'Silver'], ['false', '-1', 'Gold']])
  })
})
