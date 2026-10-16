import { describe, expect, it } from 'vitest'
import { STEPS, birthDateFromParts, firstStepWithError } from './apply-steps'

describe('étapes de candidature', () => {
  it('6 étapes, chacune avec ses champs', () => {
    expect(STEPS).toHaveLength(6)
    expect(STEPS.map((s) => s.fields).flat()).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'phone', 'birthDate', 'zip', 'radiusMiles', 'hasCar', 'availability', 'confirm18']),
    )
  })
  it('ramène à la première étape qui porte une erreur', () => {
    expect(firstStepWithError({ zip: 'x', phone: 'y' })).toBe(1)
    expect(firstStepWithError({ confirm18: 'x' })).toBe(5)
    expect(firstStepWithError({})).toBe(-1)
  })
  it('assemble la date de naissance (mois, jour, année)', () => {
    expect(birthDateFromParts('4', '7', '2005')).toBe('2005-04-07')
    expect(birthDateFromParts('', '7', '2005')).toBe('')
  })
})
