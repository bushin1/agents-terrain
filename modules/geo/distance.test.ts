import { describe, expect, it } from 'vitest'
import { approximate, distanceMeters, distanceMiles } from './distance'

describe('distanceMeters', () => {
  it('un degré de latitude ≈ 111 195 m', () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1)
  })
  it('Boston Common → Fenway Park ≈ 2,76 km', () => {
    const d = distanceMeters({ lat: 42.355, lng: -71.0656 }, { lat: 42.3467, lng: -71.0972 })
    expect(d).toBeGreaterThan(2700)
    expect(d).toBeLessThan(2800)
  })
  it('distance nulle pour le même point', () => {
    expect(distanceMeters({ lat: 42.3, lng: -71 }, { lat: 42.3, lng: -71 })).toBe(0)
  })
})

describe('distanceMiles', () => {
  it('convertit en miles', () => {
    expect(distanceMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(69.09, 1)
  })
})

describe('approximate', () => {
  it('arrondit à environ 1 km pour masquer une adresse exacte', () => {
    expect(approximate({ lat: 42.35641, lng: -71.06213 })).toEqual({ lat: 42.36, lng: -71.06 })
  })
})
