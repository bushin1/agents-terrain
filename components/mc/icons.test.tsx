import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ICON_NAMES, Icon, tradeIcon, type IconName } from './icons'

describe('Icon', () => {
  it('rend un svg décoratif 24 px avec le trait du design system', () => {
    const html = renderToStaticMarkup(<Icon name="check" className="mc-ico--sm" />)
    expect(html).toBe(
      '<span class="mc-ico mc-ico--sm" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>',
    )
  })

  it('un nom inconnu retombe sur « info »', () => {
    const unknown = renderToStaticMarkup(<Icon name={'does-not-exist' as IconName} />)
    expect(unknown).toBe(renderToStaticMarkup(<Icon name="info" />))
    expect(unknown).toContain('aria-hidden="true"')
  })

  it('aucune étoile dans le jeu d’icônes, ni symbole d’argent', () => {
    expect(ICON_NAMES.filter((n) => /star|dollar|money/.test(n))).toEqual([])
    expect(ICON_NAMES).toHaveLength(49)
  })
})

describe('tradeIcon', () => {
  it('associe le métier à son icône', () => {
    expect(tradeIcon('Fence contractor')).toBe('fence')
    expect(tradeIcon('Concrete contractor')).toBe('brick')
    expect(tradeIcon('roofing')).toBe('roof')
    expect(tradeIcon('Tree service')).toBe('tree')
    expect(tradeIcon('Retaining wall builder')).toBe('hammer')
  })
})
