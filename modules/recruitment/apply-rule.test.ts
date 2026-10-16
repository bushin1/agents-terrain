import { describe, expect, it } from 'vitest'
import { AVAILABILITY_SLOTS, parseApplication } from './apply-rule'

const now = new Date('2026-10-16T12:00:00Z')
const valid = {
  firstName: '  Maya ',
  lastName: 'Thompson-Okafor',
  email: ' Maya.T@Example.com ',
  phone: '(617) 555-1234',
  birthDate: '2005-03-14',
  occupation: 'College student',
  howDidYouHear: 'Instagram ad',
  zip: '02116',
  radiusMiles: '25',
  hasCar: 'yes',
  availability: ['mon-am', 'wed-pm'],
  confirm18: 'on',
}

describe('parseApplication', () => {
  it('normalise une candidature valide', () => {
    const r = parseApplication(valid, now)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data).toMatchObject({
      firstName: 'Maya',
      email: 'maya.t@example.com',
      phone: '+16175551234',
      zip: '02116',
      radiusMiles: 25,
      hasCar: true,
      availability: ['mon-am', 'wed-pm'],
    })
    expect(r.data.birthDate.toISOString()).toBe('2005-03-14T00:00:00.000Z')
  })

  it('refuse un mineur', () => {
    const r = parseApplication({ ...valid, birthDate: '2009-01-01' }, now)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some((i) => i.message === 'You must be 18 or older')).toBe(true)
  })

  it.each([
    ['phone', '+33 6 49 70 73 24'],
    ['zip', '2116'],
    ['radiusMiles', '30'],
    ['email', 'not-an-email'],
    ['availability', []],
    ['confirm18', undefined],
    ['birthDate', '14/03/2005'],
    ['birthDate', '2005-02-30'],
  ])('refuse un champ %s invalide', (field, value) => {
    expect(parseApplication({ ...valid, [field]: value }, now).success).toBe(false)
  })

  it('propose 14 créneaux de disponibilité', () => {
    expect(AVAILABILITY_SLOTS).toHaveLength(14)
    expect(AVAILABILITY_SLOTS[0]).toBe('mon-am')
  })
})
