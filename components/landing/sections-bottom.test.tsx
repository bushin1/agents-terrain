import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAND_LEGAL, BRAND_SUPPORT, independenceLine } from '@/lib/brand'
import { Faq } from './faq'
import { Footer } from './footer'
import { NO_REVIEWS_LINE, Trust } from './trust'
import { Visit } from './visit'
import { TESTIMONIAL_PLACEHOLDER, Who } from './who'

describe('bas de page', () => {
  it('Visit : paiement de visite issu des props', () => {
    expect(renderToStaticMarkup(<Visit amounts={{ VISIT: 4500, LIVE: 3000, CLIENT: 6000 }} />)).toContain('Your $45 is on its way to validation.')
  })

  it('Who : trois témoignages en placeholders, 18+', () => {
    const html = renderToStaticMarkup(<Who />)
    expect(html.split(TESTIMONIAL_PLACEHOLDER)).toHaveLength(4)
    expect(html).toContain('18+ only')
  })

  it('Trust : ligne d’indépendance sur fond papier et phrase exacte sur les avis', () => {
    const html = renderToStaticMarkup(<Trust />)
    expect(html).toContain(`<p class="lp-indep">`)
    expect(html).toContain(`<span>${independenceLine()}</span>`)
    expect(html).toContain(NO_REVIEWS_LINE)
  })

  it('Faq : commence par le paiement (ouverte), mentions de marque, aucun avis', () => {
    const html = renderToStaticMarkup(<Faq />)
    expect(html).toMatch(/<details open=""><summary>When do I get paid\?/)
    expect(html.indexOf('When do I get paid?')).toBeLessThan(html.indexOf('Do I need a car?'))
    for (const value of [BRAND_LEGAL, BRAND_SUPPORT, independenceLine()]) expect(html).toContain(value)
    expect(html).not.toMatch(/\breview/i)
  })

  it('Footer : appel vers /apply, 18+, contractant indépendant, ligne d’indépendance', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('href="/apply">Apply in 5 minutes')
    expect(html).toContain('18+ only · Independent contractor')
    expect(html).toContain(independenceLine())
  })
})
