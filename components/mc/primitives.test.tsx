import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/lib/brand'
import { Logo } from './logo'
import { PhotoPlaceholder } from './photo-placeholder'
import { Pin } from './pin'

describe('Pin', () => {
  it('sans action : image étiquetée, positionnée en %', () => {
    const html = renderToStaticMarkup(<Pin x={66} y={44} label="Fence contractor, 3.2 miles" />)
    expect(html).toMatch(/^<span class="mc-pin" style="left:66%;top:44%;cursor:default" role="img" aria-label="Fence contractor, 3.2 miles">/)
    expect(html).not.toContain('<button')
  })

  it('états, étiquette et bonus', () => {
    expect(renderToStaticMarkup(<Pin x={1} y={1} state="done" />)).toContain('class="mc-pin mc-pin--done"')
    expect(renderToStaticMarkup(<Pin x={1} y={1} state="muted" />)).toContain('class="mc-pin mc-pin--muted"')
    expect(renderToStaticMarkup(<Pin x={1} y={1} tag="Bonus" bonus />)).toContain('<span class="mc-pin__tag mc-pin__tag--bonus">Bonus</span>')
  })

  it('avec href : lien ; avec onClick : bouton pressé', () => {
    expect(renderToStaticMarkup(<Pin x={1} y={1} href="/agent/missions/m1" />)).toMatch(/^<a class="mc-pin"[^>]* href="\/agent\/missions\/m1" aria-label="Mission">/)
    const button = renderToStaticMarkup(<Pin x={1} y={1} selected onClick={() => undefined} />)
    expect(button).toMatch(/^<button type="button" class="mc-pin"[^>]* aria-pressed="true" aria-label="Mission">/)
  })

  it('sans position : rendu en ligne', () => {
    expect(renderToStaticMarkup(<Pin />)).toContain('style="position:relative;transform:none;cursor:default"')
  })
})

describe('Logo et PhotoPlaceholder', () => {
  it('le logo porte le nom de marque et pointe vers l’accueil', () => {
    const html = renderToStaticMarkup(<Logo />)
    expect(html).toContain(`aria-label="${BRAND_NAME} home"`)
    expect(html).toContain('href="/"')
    expect(html).toContain(`<span>${BRAND_NAME}</span>`)
  })

  it('la photo est un placeholder « [Photo] » avec son brief', () => {
    const html = renderToStaticMarkup(<PhotoPlaceholder title="Students" brief="Agent with a backpack" className="lp-visitphoto" />)
    expect(html).toBe('<figure class="mc-photo lp-visitphoto"><figcaption><b>[Photo] Students</b>Agent with a backpack</figcaption></figure>')
  })
})
