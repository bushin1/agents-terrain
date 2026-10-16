import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { independenceLine } from '@/lib/brand'
import { Landing } from './landing'
import { NO_REVIEWS_LINE } from './trust'

// Montants volontairement différents des valeurs par défaut : rien ne doit être écrit en dur.
const SETTINGS = {
  tierAmountsCents: { VISIT: 4500, LIVE: 3000, CLIENT: 6000, RETURN_VISIT: 2000 },
  levels: [{ name: 'BRONZE' as const, minValidated: 0, bonusPct: 0 }, { name: 'SILVER' as const, minValidated: 8, bonusPct: 12 }, { name: 'GOLD' as const, minValidated: 20, bonusPct: 25 }],
}

const html = renderToStaticMarkup(<Landing amounts={SETTINGS.tierAmountsCents} levels={SETTINGS.levels} />)
const count = (needle: string) => html.split(needle).length - 1

describe('Landing — règles de contenu du design system', () => {
  it('ligne d’indépendance au moins deux fois (confiance et pied de page)', () => {
    expect(count(independenceLine())).toBeGreaterThanOrEqual(2)
  })

  it('montants issus des props, « up to » calculé, aucun montant par défaut en dur', () => {
    expect(html).toContain('up to $135 per business')
    for (const amt of ['$45', '+$30', '+$60']) expect(html).toContain(`<span class="mc-payout__amt">${amt}</span>`)
    expect(html).toContain('<b>+12%</b><span>After 8 validated visits</span>')
    expect(html).toContain('$360 – $1,080')
    for (const fixed of ['$40', '$25', '$50', '$115', '$320', '$920']) {
      expect(html).not.toMatch(new RegExp(`\\${fixed}(?![\\d,])`))
    }
  })

  it('aucun « review » ni « rating » hors de la phrase autorisée de la section confiance', () => {
    expect(count(NO_REVIEWS_LINE)).toBe(1)
    const rest = html.split(NO_REVIEWS_LINE).join('')
    expect(rest).not.toMatch(/\breview/i)
    expect(rest).not.toMatch(/\bratings?\b/i)
  })

  it('aucune étoile', () => {
    expect(html).not.toMatch(/\bstars?\b/i)
  })

  it('liens vers /apply et /login', () => {
    expect(count('href="/apply"')).toBeGreaterThanOrEqual(3)
    expect(html).toContain('href="/login"')
  })

  it('estimateur étiqueté comme exemple, 18+ et contractant indépendant affichés', () => {
    expect(html).toContain('Example, not a guarantee')
    expect(html).toContain('18+ only')
    expect(html).toContain('Field agents · US · 18+')
    expect(html).toMatch(/independent contractor/i)
  })

  it('sections dans l’ordre de la maquette', () => {
    const ids = [...html.matchAll(/aria-labelledby="([\w-]+)"/g)].map((m) => m[1]).filter((id) => id !== 'est-lvl')
    expect(ids).toEqual(['hero-h', 'how-h', 'pay-h', 'visit-h', 'who-h', 'trust-h', 'faq-h', 'final-h'])
  })
})
