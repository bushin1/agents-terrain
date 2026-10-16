import { BRAND_NAME } from '@/lib/brand'

// Texte signé par le pro à l'étape 2 (spec §4.6). Toute modification change la version : le téléphone
// qui a chargé l'ancien texte est invité à recharger, la signature porte toujours sur le texte lu.
export const CONSENT_VERSION = 'consent-v1'

export function consentText(): string[] {
  return [
    'I own or manage this business. The Google Business Profile we set up today belongs to me.',
    `I authorize ${BRAND_NAME} to be added as a manager of my profile. I can remove this access at any time.`,
    `${BRAND_NAME} may contact me about an optional profile management offer.`,
    'I will get a short text message about today’s visit.',
  ]
}
