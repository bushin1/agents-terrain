import { describe, expect, it } from 'vitest'
import { estimate, maxPerBusiness, sortLevels, usd } from './money'

const AMOUNTS = { VISIT: 4000, LIVE: 2500, CLIENT: 5000 }

describe('usd', () => {
  it('sans cents : dollars entiers, sans « .00 »', () => {
    expect(usd(4000)).toBe('$40')
    expect(usd(0)).toBe('$0')
  })
  it('sépare les milliers', () => {
    expect(usd(123_456_700)).toBe('$1,234,567')
    expect(usd(100_000)).toBe('$1,000')
    expect(usd(99_900)).toBe('$999')
  })
  it('avec cents', () => {
    expect(usd(10_500, { cents: true })).toBe('$105.00')
    expect(usd(123_456_789, { cents: true })).toBe('$1,234,567.89')
  })
  it('arrondit au dollar sans cents, comme MapCrew.usd', () => {
    expect(usd(4049)).toBe('$40')
    expect(usd(4050)).toBe('$41')
  })
})

describe('estimate', () => {
  it('Bronze : bas = visite seule, haut = les trois paiements', () => {
    expect(estimate(8, 0, AMOUNTS)).toEqual({ low: 32_000, high: 92_000 })
    expect(`${usd(32_000)} – ${usd(92_000)}`).toBe('$320 – $920')
  })
  it('applique le bonus de niveau aux deux bornes', () => {
    expect(estimate(8, 10, AMOUNTS)).toEqual({ low: 35_200, high: 101_200 })
    expect(estimate(40, 20, AMOUNTS)).toEqual({ low: 192_000, high: 552_000 })
  })
  it('suit les montants des réglages', () => {
    expect(estimate(1, 0, { VISIT: 4500, LIVE: 3000, CLIENT: 6000 })).toEqual({ low: 4500, high: 13_500 })
  })
})

describe('maxPerBusiness et sortLevels', () => {
  it('additionne les trois paliers et le bonus', () => {
    expect(maxPerBusiness(AMOUNTS)).toBe(11_500)
    expect(maxPerBusiness(AMOUNTS, 1500)).toBe(13_000)
  })
  it('trie les niveaux par seuil', () => {
    const sorted = sortLevels([
      { name: 'GOLD', minValidated: 15, bonusPct: 20 },
      { name: 'BRONZE', minValidated: 0, bonusPct: 0 },
      { name: 'SILVER', minValidated: 5, bonusPct: 10 },
    ])
    expect(sorted.map((l) => l.name)).toEqual(['BRONZE', 'SILVER', 'GOLD'])
  })
})
