import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ReviewEstimator } from './estimator'

const LEVEL_CENTS = { STARTER: 200, BRONZE: 300, SILVER: 400, GOLD: 500 }
const html = renderToStaticMarkup(<ReviewEstimator levelCents={LEVEL_CENTS} />)

describe('ReviewEstimator (rendu initial)', () => {
  it('affiche un résultat en dollars canadiens', () => {
    expect(html).toMatch(/\d+ \$/)
  })

  it('contient les niveaux en français', () => {
    expect(html).toContain('Débutant')
    expect(html).toContain('Bronze')
    expect(html).toContain('Argent')
    expect(html).toContain('Or')
  })

  it('disclaimer exemple présent', () => {
    expect(html).toMatch(/exemple|example/i)
  })
})
