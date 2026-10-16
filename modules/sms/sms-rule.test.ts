import { describe, expect, it } from 'vitest'
import { normalizeUsPhone, parseInbound } from './sms-rule'

describe('normalizeUsPhone', () => {
  it.each([
    ['(617) 555-1234', '+16175551234'],
    ['617.555.1234', '+16175551234'],
    ['+1 617 555 1234', '+16175551234'],
    ['16175551234', '+16175551234'],
    ['  617-555-1234 ', '+16175551234'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeUsPhone(input)).toBe(expected)
  })

  it.each([
    ['+33 6 49 70 73 24'],
    ['555-1234'],
    ['017 555 1234'], // indicatif régional commençant par 0
    ['617 155 1234'], // central commençant par 1
    ['+1617555123'],
    ['617+5551234'],
    ['+6175551234'], // « + » suivi de 10 chiffres : indicatif pays absent
    [''],
  ])('refuse %s', (input) => {
    expect(normalizeUsPhone(input)).toBeNull()
  })
})

describe('parseInbound', () => {
  it('reconnaît une note de 1 à 5', () => {
    expect(parseInbound(' 4 ')).toEqual({ kind: 'RATING', value: 4 })
    expect(parseInbound('5!')).toEqual({ kind: 'RATING', value: 5 })
  })
  it('reconnaît NO, quelle que soit la casse', () => {
    expect(parseInbound('no')).toEqual({ kind: 'DENIED' })
    expect(parseInbound('No.')).toEqual({ kind: 'DENIED' })
  })
  it('classe tout le reste en OTHER', () => {
    expect(parseInbound('6')).toEqual({ kind: 'OTHER' })
    expect(parseInbound('Can we move to Friday?')).toEqual({ kind: 'OTHER' })
    expect(parseInbound('')).toEqual({ kind: 'OTHER' })
  })
})
