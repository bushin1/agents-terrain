import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MissionCard, type MissionCardProps } from './mission-card'

const PROPS: MissionCardProps = {
  trade: 'Fence contractor',
  title: 'Fence contractor',
  city: 'Naperville, IL',
  distance: '3.2 mi',
  slot: 'Tue, Oct 20 · 10–11 AM',
  amounts: { VISIT: 4500, LIVE: 3000, CLIENT: 6000 },
}

describe('MissionCard', () => {
  it('affiche « up to » avec la décomposition, montants issus des props', () => {
    const html = renderToStaticMarkup(<MissionCard {...PROPS} />)
    expect(html).toContain('<b>$45</b> visit + <b>$30</b> live + <b>$60</b> if customer')
    expect(html).toContain('<span class="mc-mission__total"><small>up to </small>$135</span>')
    expect(html).toContain('Naperville, IL · 3.2 mi')
    expect(html).not.toContain('Bonus')
  })

  it('bonus : badge, ligne dans la décomposition et total', () => {
    const html = renderToStaticMarkup(<MissionCard {...PROPS} bonusCents={1500} />)
    expect(html).toContain('mc-badge mc-badge--bonus')
    expect(html).toContain(' Bonus +$15')
    expect(html).toContain(' + <b>$15</b> bonus')
    expect(html).toContain('<small>up to </small>$150')
  })

  it('n’affiche ni l’adresse ni le nom de l’entreprise, même s’ils sont transmis', () => {
    const pro = { businessName: 'Delgado Fencing LLC', address: '120 Tremont Street' }
    const html = renderToStaticMarkup(<MissionCard {...PROPS} {...(pro as object)} />)
    expect(html).not.toContain('Tremont')
    expect(html).not.toContain('Delgado')
  })

  it('avec href : la carte entière est un lien ; sans href : un bloc non interactif', () => {
    expect(renderToStaticMarkup(<MissionCard {...PROPS} href="/agent/missions/m1" />)).toMatch(/^<a class="mc-mission" href="\/agent\/missions\/m1"/)
    expect(renderToStaticMarkup(<MissionCard {...PROPS} />)).toMatch(/^<div class="mc-mission">/)
  })
})
