import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAND_LEGAL, BRAND_SUPPORT, independenceLineFr } from '@/lib/brand'
import { Faq } from './faq'
import { Footer } from './footer'
import { AVIS_LINE, Trust } from './trust'
import { Visit } from './visit'
import { TESTIMONIAL_PLACEHOLDER, Who } from './who'

describe('bas de page', () => {
  it('Visit : explique le processus en 6 etapes', () => {
    const html = renderToStaticMarkup(<Visit />)
    expect(html).toContain('lp-vstep')
    expect(html.split('lp-vstep').length - 1).toBeGreaterThanOrEqual(6)
  })

  it('Who : trois personas, placeholders temoignages, 18 ans et plus', () => {
    const html = renderToStaticMarkup(<Who />)
    expect(html.split(TESTIMONIAL_PLACEHOLDER)).toHaveLength(4)
    expect(html).toContain('18 ans et plus')
  })

  it("Trust : ligne d'independance et phrase sur les vrais avis", () => {
    const html = renderToStaticMarkup(<Trust />)
    expect(html).toContain('lp-indep')
    expect(html).toContain(independenceLineFr())
    expect(html).toContain(AVIS_LINE)
  })

  it('Faq : commence par le paiement (ouverte), mentions de marque', () => {
    const html = renderToStaticMarkup(<Faq />)
    expect(html).toMatch(/<details open=""><summary>Quand suis-je/)
    for (const value of [BRAND_LEGAL, BRAND_SUPPORT, independenceLineFr()]) expect(html).toContain(value)
  })

  it("Footer : appel vers /apply, 18 ans et plus, ligne d'independance", () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('href="/apply"')
    expect(html).toContain('Postuler en 5 minutes')
    expect(html).toContain('18 ans et plus')
    expect(html).toContain(independenceLineFr())
  })
})
