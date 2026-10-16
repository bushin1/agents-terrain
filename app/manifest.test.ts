import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/lib/brand'
import manifest from './manifest'

describe('manifest PWA', () => {
  it('ouvre l’espace agent en mode standalone, aux couleurs du design system', () => {
    const m = manifest()
    expect(m.short_name).toBe(BRAND_NAME)
    expect(m.start_url).toBe('/agent')
    expect(m.display).toBe('standalone')
    expect(m.theme_color).toBe('#1f3b2f')
    expect(m.background_color).toBe('#f6f2ea')
    expect(m.icons?.[0]).toMatchObject({ src: '/icon.svg', type: 'image/svg+xml' })
  })
})
