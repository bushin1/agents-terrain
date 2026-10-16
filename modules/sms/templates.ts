import { BRAND_NAME } from '@/lib/brand'

/** Remplace la typographie qu'un clavier français ajoute (’ “ ” – —) par des caractères simples. */
export function plain(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
}

// Textes des SMS. Règles : commencer par la marque, ne jamais se présenter comme Google, ne jamais
// parler d'avis, n'utiliser que des caractères simples (un tiret long fait passer le SMS en Unicode
// et réduit sa longueur à 70 caractères).
export const smsTemplates = {
  otp: (code: string) =>
    `${BRAND_NAME}: your code is ${code}. It expires in 10 minutes. Never share it.`,
  proVisitConfirmed: (p: { agentFirstName: string; slot: string }) =>
    `${BRAND_NAME}: ${plain(p.agentFirstName)} will visit you on ${p.slot} to help set up your free Google Business Profile, as agreed on the phone. Reply here if you need to change anything.`,
  proReminder: (p: { agentFirstName: string; slot: string }) =>
    `${BRAND_NAME} reminder: ${plain(p.agentFirstName)} visits you tomorrow, ${p.slot}.`,
  proAgentChanged: (p: { agentFirstName: string; slot: string }) =>
    `${BRAND_NAME}: ${plain(p.agentFirstName)} can no longer make your visit on ${p.slot}. We will text you when another agent confirms.`,
  agentReminder: (p: { businessName: string; slot: string }) =>
    `${BRAND_NAME} reminder: your visit to ${plain(p.businessName)} is on ${p.slot}. Open the app before you go.`,
  proPostVisit: (p: { agentFirstName: string }) =>
    `${BRAND_NAME}: did ${plain(p.agentFirstName)} visit you today? Reply 1-5 to rate the visit, or NO if no one came.`,
  agentNoShowCheck: (p: { businessName: string }) =>
    `${BRAND_NAME}: we have not received your check-in for ${plain(p.businessName)}. Did you visit? Open the app to sync your visit.`,
  agentMissionReleased: (p: { businessName: string }) =>
    `${BRAND_NAME}: your mission at ${plain(p.businessName)} was released because no check-in was received within 24 hours.`,
  agentValidated: (p: { amount: string }) =>
    `${BRAND_NAME}: your visit was validated. ${p.amount} was added to your balance.`,
  agentNeedsFix: (p: { message: string }) =>
    `${BRAND_NAME}: your visit needs a fix: ${plain(p.message)} Open the app to complete it within 7 days.`,
  agentRejected: (p: { reason: string }) =>
    `${BRAND_NAME}: your visit was not validated. Reason: ${plain(p.reason)}`,
}
