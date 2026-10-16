import { createHmac, timingSafeEqual } from 'node:crypto'

// Twilio signe chaque webhook : HMAC-SHA1 (clé = auth token) de l'URL publique complète suivie des
// paramètres POST triés par nom (nom puis valeur, concaténés), encodé en base64.
export function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  return createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64')
}

export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false
  const expected = Buffer.from(computeTwilioSignature(authToken, url, params))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
