import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { independenceLineFr } from '@/lib/brand'
import { Landing } from './landing'
import { AVIS_LINE } from './trust'

const LEVEL_CENTS = { STARTER: 200, BRONZE: 300, SILVER: 400, GOLD: 500 }

const html = renderToStaticMarkup(<Landing levelCents={LEVEL_CENTS} />)
const count = (needle: string) => html.split(needle).length - 1

describe('Landing — contenu de base', () => {
  it("ligne d'independance au moins deux fois", () => {
    expect(count(independenceLineFr())).toBeGreaterThanOrEqual(2)
  })

  it('montants issus des props, en dollars canadiens', () => {
    expect(html).toContain('2 $')
    expect(html).toContain('5 $')
  })

  it("phrase sur les vrais avis presente une seule fois", () => {
    expect(count(AVIS_LINE)).toBe(1)
  })

  it('aucune etoile', () => {
    expect(html).not.toMatch(/\bstars?\b/i)
  })

  it('liens vers /apply et /login', () => {
    expect(count('href="/apply"')).toBeGreaterThanOrEqual(3)
    expect(html).toContain('href="/login"')
  })

  it("sections dans l'ordre de la maquette", () => {
    const ids = [...html.matchAll(/aria-labelledby="([\w-]+)"/g)].map((m) => m[1])
    expect(ids).toEqual(['hero-h', 'how-h', 'pay-h', 'visit-h', 'who-h', 'trust-h', 'faq-h', 'final-h'])
  })
})
