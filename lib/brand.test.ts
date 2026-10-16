import { describe, expect, it } from 'vitest'
import { BRAND_ADDRESS, BRAND_LEGAL, BRAND_NAME, BRAND_SUPPORT, independenceLine } from './brand'

describe('brand', () => {
  it('ligne d’indépendance avec le nom de marque', () => {
    expect(independenceLine()).toBe(`${BRAND_NAME} is an independent company, not affiliated with Google.`)
  })
  it('mentions légales en placeholders visibles', () => {
    for (const value of [BRAND_LEGAL, BRAND_ADDRESS, BRAND_SUPPORT]) expect(value).toMatch(/^\[.+\]/)
  })
})
