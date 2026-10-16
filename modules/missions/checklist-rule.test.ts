import { describe, expect, it } from 'vitest'
import { MIN_PHOTOS, STEPS_BY_TYPE, editableSteps, missingSteps, parseStepInput, type StepsData } from './checklist-rule'

const clientAt = '2026-10-16T14:00:00.000Z'
const receivedAt = '2026-10-16T14:00:05.000Z'
const full: StepsData = {
  checkin: { lat: 42.3564, lng: -71.0621, accuracy: 12, clientAt, receivedAt },
  consent: { signerName: 'Frank Delgado', textVersion: 'consent-v1', signatureKey: 'missions/m1/signature.png', clientAt, receivedAt },
  profile: { listingName: 'Boston Concrete & Masonry', category: 'Concrete contractor', city: 'Boston', zip: '02108', mode: 'CREATED', clientAt, receivedAt },
  invite: { result: 'INVITE_SENT', clientAt, receivedAt },
  verification: { result: 'VIDEO_NOT_OFFERED', clientAt, receivedAt },
  checkout: { clientAt, receivedAt },
}

describe('missingSteps', () => {
  it('rien ne manque pour une visite complète avec assez de photos', () => {
    expect(missingSteps('VISIT', full, MIN_PHOTOS)).toEqual([])
  })
  it('signale les photos manquantes', () => {
    expect(missingSteps('VISIT', full, MIN_PHOTOS - 1)).toEqual(['photos'])
  })
  it('liste les étapes absentes dans l’ordre', () => {
    expect(missingSteps('VISIT', { checkin: full.checkin }, 0)).toEqual(['consent', 'profile', 'invite', 'photos', 'verification', 'checkout'])
  })
  it('une mission de retour n’exige ni accord, ni fiche, ni photos', () => {
    const { checkin, invite, verification, checkout } = full
    expect(missingSteps('RETURN_VISIT', { checkin, invite, verification, checkout }, 0)).toEqual([])
    expect(STEPS_BY_TYPE.RETURN_VISIT).toEqual(['checkin', 'invite', 'verification', 'checkout'])
  })
})

describe('editableSteps', () => {
  it('toutes les étapes tant que la mission est ACCEPTED', () => {
    expect(editableSteps('VISIT', 'ACCEPTED')).toEqual(STEPS_BY_TYPE.VISIT)
  })
  it('en NEEDS_FIX : photos, invitation et vérification seulement (spec §7.2)', () => {
    expect(editableSteps('VISIT', 'NEEDS_FIX')).toEqual(['invite', 'photos', 'verification'])
    expect(editableSteps('RETURN_VISIT', 'NEEDS_FIX')).toEqual(['invite', 'verification'])
  })
  it('aucune une fois soumise ou terminée', () => {
    expect(editableSteps('VISIT', 'SUBMITTED')).toEqual([])
    expect(editableSteps('VISIT', 'VALIDATED')).toEqual([])
  })
})

describe('parseStepInput', () => {
  it('valide un check-in', () => {
    const r = parseStepInput('checkin', { lat: 42.3, lng: -71.1, accuracy: 8, clientAt })
    expect(r.success).toBe(true)
  })
  it('refuse une vérification « autre méthode » sans préciser laquelle', () => {
    expect(parseStepInput('verification', { result: 'OTHER_METHOD_STARTED', clientAt }).success).toBe(false)
    expect(parseStepInput('verification', { result: 'OTHER_METHOD_STARTED', method: 'Postcard', clientAt }).success).toBe(true)
  })
  it('l’accord attend une signature PNG en data URL', () => {
    expect(parseStepInput('consent', { signerName: 'Frank Delgado', textVersion: 'consent-v1', signaturePng: 'data:image/png;base64,iVBORw0KGgo=', clientAt }).success).toBe(true)
    expect(parseStepInput('consent', { signerName: 'Frank Delgado', textVersion: 'consent-v1', signaturePng: 'hello', clientAt }).success).toBe(false)
  })
  it('refuse une étape inconnue ou un code postal invalide', () => {
    expect(parseStepInput('photos', {}).success).toBe(false)
    expect(parseStepInput('constructor', {}).success).toBe(false) // propriété héritée d'Object
    expect(parseStepInput('profile', { ...full.profile, zip: '2108' }).success).toBe(false)
  })
})
