import { describe, expect, it } from 'vitest'
import type { StepsData } from '@/modules/missions'
import { proReplyText, stepRows } from './review-view'

const t = (minute: string) => ({ clientAt: `2026-10-16T14:${minute}:00.000Z`, receivedAt: `2026-10-16T14:${minute}:03.000Z` })
const steps: StepsData = {
  checkout: t('45'),
  checkin: { lat: 42.35671, lng: -71.06243, accuracy: 12.4, ...t('02') },
  consent: { signerName: 'Frank Delgado', textVersion: 'consent-v1', signatureKey: 'missions/m1/signature-a.png', ...t('10') },
  profile: { listingName: 'Delgado Concrete & Masonry', category: 'Concrete contractor', city: 'Boston', zip: '02108', mode: 'CLAIMED', ...t('25') },
  invite: { result: 'INVITE_NOT_ALLOWED_YET', ...t('30') },
  verification: { result: 'OTHER_METHOD_STARTED', method: 'Postcard', ...t('40') },
}

describe('stepRows', () => {
  it('range les étapes dans l’ordre de la visite et résume chacune', () => {
    const rows = stepRows(steps)
    expect(rows.map((r) => r.name)).toEqual(['checkin', 'consent', 'profile', 'invite', 'verification', 'checkout'])
    expect(rows[0]).toEqual({ name: 'checkin', label: 'Check-in', clientAt: '2026-10-16T14:02:00.000Z', receivedAt: '2026-10-16T14:02:03.000Z', detail: '42.35671, -71.06243 (± 12 m)' })
    expect(rows.slice(1, 5).map((r) => r.detail)).toEqual([
      'Signé par Frank Delgado (texte consent-v1)',
      'Delgado Concrete & Masonry · Concrete contractor · Boston 02108 · Fiche existante revendiquée',
      'Ajout d’utilisateurs pas encore proposé par Google',
      'Autre méthode lancée : Postcard',
    ])
  })
  it('ignore les étapes absentes', () => {
    expect(stepRows({ checkin: steps.checkin }).map((r) => r.name)).toEqual(['checkin'])
  })
})

describe('proReplyText', () => {
  it('résume la réponse du pro au SMS après visite', () => {
    const sent = new Date('2026-10-16T15:00:00Z')
    expect(proReplyText({ postVisitSmsAt: null, proDenied: false, proRating: null })).toBe('SMS après visite pas encore envoyé.')
    expect(proReplyText({ postVisitSmsAt: sent, proDenied: true, proRating: null })).toBe('Le pro a répondu NO : il conteste la visite.')
    expect(proReplyText({ postVisitSmsAt: sent, proDenied: false, proRating: 2 })).toBe('Note du pro : 2/5')
    expect(proReplyText({ postVisitSmsAt: sent, proDenied: false, proRating: null })).toBe('Pas encore de réponse du pro.')
  })
})
