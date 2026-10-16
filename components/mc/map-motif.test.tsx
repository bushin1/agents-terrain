import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapMotif, mapMotif, type MapMotifOptions } from './map-motif'

// Référence : le vrai MapCrew.map de bundle.js, exécuté dans un bac à sable (jamais chargé dans l'app).
function bundleMap(o: MapMotifOptions): string {
  const sandbox: { window: { MapCrew?: { map(o: MapMotifOptions): string } } } = { window: {} }
  runInNewContext(readFileSync('design/mapcrew/components/bundle.js', 'utf8'), sandbox)
  return sandbox.window.MapCrew!.map(o)
}
// React ferme les éléments SVG par une balise (<rect …></rect>) là où bundle.js les auto-ferme (<rect …/>).
const svgOf = (html: string) => /<svg[\s\S]*?<\/svg>/.exec(html)![0].replace(/<(rect|path)([^>]*)><\/\1>/g, '<$1$2/>')

describe('mapMotif', () => {
  it('même graine → même dessin ; autre graine → autre dessin', () => {
    expect(mapMotif({ seed: 21, cols: 7, rows: 7 })).toEqual(mapMotif({ seed: 21, cols: 7, rows: 7 }))
    expect(mapMotif({ seed: 21 }).rects).not.toEqual(mapMotif({ seed: 22 }).rects)
  })

  it('petite grille : un parc et des îlots, dont certains coupés en deux', () => {
    const { rects } = mapMotif({ seed: 3, cols: 2, rows: 2 })
    expect(rects).toHaveLength(6)
    expect(rects.filter((b) => b.cls === 'm-park')).toHaveLength(1)
    expect(rects.filter((b) => b.rx === '1.1')).toHaveLength(4)
  })

  it('sans parc ni coupe : une forme par îlot', () => {
    const { rects } = mapMotif({ seed: 11, cols: 3, rows: 2, park: -1 })
    expect(rects).toHaveLength(6)
    expect(rects.every((b) => b.cls === 'm-block' && b.rx === '1.4')).toBe(true)
  })

  it('inclut le trajet, la rivière et l’avenue', () => {
    const shapes = mapMotif({ route: 'M30 70 L30 56 L66 56 L66 44', waterY: 92, diagA: 88, diagB: 30, avenue: 5 })
    expect(shapes.route).toBe('M30 70 L30 56 L66 56 L66 44')
    expect(shapes.water).toBe('M-2 92 C 14 86, 30 104, 48 102 L -2 102 Z')
    expect(shapes.street).toEqual({ d: 'M-2 88 L 102 30', width: 5 })
    expect(mapMotif({ water: false }).water).toBeNull()
  })
})

describe('MapMotif', () => {
  it('rend exactement le même SVG que MapCrew.map (cartes de la landing)', () => {
    const hero = { seed: 21, cols: 7, rows: 7 }
    const phone = { seed: 5, cols: 4, rows: 4, gap: 3.2, route: 'M30 70 L30 56 L66 56 L66 44', diagA: 88, diagB: 30, waterY: 92, avenue: 5 }
    for (const o of [hero, phone, {}]) {
      expect(svgOf(renderToStaticMarkup(<MapMotif {...o} />))).toBe(svgOf(bundleMap(o)))
    }
  })

  it('trajet rendu, agent, rayon, pins et label', () => {
    const html = renderToStaticMarkup(
      <MapMotif seed={5} route="M30 70 L66 44" you={[30, 70]} radius={260} height={150} label="Map of missions" pins={[{ x: 66, y: 44, label: 'Roofing' }]} />,
    )
    expect(html).toMatch(/^<div class="mc-map" style="height:150px" role="group" aria-label="Map of missions">/)
    expect(html).toContain('<path class="m-route" vector-effect="non-scaling-stroke" d="M30 70 L66 44"></path>')
    expect(html).toContain('<span class="mc-you" style="left:30%;top:70%" role="img" aria-label="You are here"></span>')
    expect(html).toContain('width:260px;height:260px')
    expect(html).toContain('aria-label="Roofing"')
  })

  it('sans label : pas de rôle, la carte reste décorative', () => {
    expect(renderToStaticMarkup(<MapMotif />)).toMatch(/^<div class="mc-map"><svg/)
  })
})
