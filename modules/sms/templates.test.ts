import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/lib/brand'
import { plain, smsTemplates } from './templates'

const samples = [
  smsTemplates.otp('123456'),
  smsTemplates.proVisitConfirmed({ agentFirstName: 'Maya', slot: 'Wed, Jul 1, 10:00 AM' }),
  smsTemplates.proReminder({ agentFirstName: 'Maya', slot: 'Wed, Jul 1, 10:00 AM' }),
  smsTemplates.agentReminder({ businessName: 'Boston Concrete', slot: 'Wed, Jul 1, 10:00 AM' }),
  smsTemplates.proPostVisit({ agentFirstName: 'Maya' }),
  smsTemplates.agentNoShowCheck({ businessName: 'Boston Concrete' }),
  smsTemplates.agentMissionReleased({ businessName: 'Boston Concrete' }),
  smsTemplates.agentValidated({ amount: '$44.00' }),
  smsTemplates.agentNeedsFix({ message: 'Add 2 more photos.' }),
  smsTemplates.agentRejected({ reason: 'Check-in too far from the business.' }),
]

describe('smsTemplates', () => {
  it('chaque message commence par la marque', () => {
    for (const s of samples) expect(s.startsWith(BRAND_NAME)).toBe(true)
  })
  it('aucun message ne se présente comme Google ni ne parle d’avis', () => {
    for (const s of samples) {
      expect(s).not.toMatch(/from google|google team|on behalf of google|google partner/i)
      expect(s).not.toMatch(/review|stars?\b/i)
    }
  })
  it('n’utilise que des caractères simples (pas de tiret long ni d’apostrophe typographique)', () => {
    for (const s of samples) expect(s).not.toMatch(/[–—’‘“”]/)
  })
  it('nettoie la typographie tapée par un admin', () => {
    expect(plain('L’adresse — « fausse » “ici”')).toBe("L'adresse - « fausse » \"ici\"")
    expect(smsTemplates.agentNeedsFix({ message: 'Add the owner’s truck – please.' })).not.toMatch(/[–—’‘“”]/)
  })
  it('le SMS après visite donne la consigne de réponse', () => {
    expect(smsTemplates.proPostVisit({ agentFirstName: 'Maya' })).toContain('Reply 1-5')
  })
})
