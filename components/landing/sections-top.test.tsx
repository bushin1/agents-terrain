import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Hero } from './hero'
import { How } from './how'
import { Nav } from './nav'
import { Pay } from './pay'

const LEVEL_CENTS = { STARTER: 200, BRONZE: 300, SILVER: 400, GOLD: 500 }

describe('haut de page', () => {
  it('Nav : « Se connecter » mène à /login, « Postuler » à /apply', () => {
    const html = renderToStaticMarkup(<Nav />)
    expect(html).toContain('href="/login"')
    expect(html).toContain('href="/apply"')
    expect(html).toContain('Se connecter')
    expect(html).toContain('Postuler')
  })

  it('Hero : affiche les montants par niveau en dollars canadiens', () => {
    const html = renderToStaticMarkup(<Hero levelCents={LEVEL_CENTS} />)
    expect(html).toContain('2 $')
    expect(html).toContain('5 $')
    expect(html).toContain('Postuler en 5 minutes')
  })

  it('How : trois étapes minimum', () => {
    expect(renderToStaticMarkup(<How />).split('class="lp-stepcard"')).toHaveLength(4)
  })

  it('Pay : affiche les 4 niveaux avec montants issus des props', () => {
    const html = renderToStaticMarkup(<Pay levelCents={LEVEL_CENTS} />)
    expect(html).toContain('2 $')
    expect(html).toContain('3 $')
    expect(html).toContain('4 $')
    expect(html).toContain('5 $')
    expect(html).toContain('Débutant')
    expect(html).toContain('Bronze')
    expect(html).toContain('Argent')
    expect(html).toContain('Or')
  })
})
