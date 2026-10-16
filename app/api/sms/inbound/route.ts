import { handleInboundSms } from '@/modules/review'
import { isValidTwilioSignature } from '@/modules/sms'

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

// Webhook « A message comes in » du numéro Twilio. L'URL signée par Twilio est l'URL PUBLIQUE
// (PUBLIC_BASE_URL), pas celle vue derrière le proxy : on la reconstruit.
export async function POST(req: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN
  const base = process.env.PUBLIC_BASE_URL
  if (!token || !base) return new Response('Not configured', { status: 404 })
  const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>
  const url = new URL('/api/sms/inbound', base).toString()
  if (!isValidTwilioSignature(token, url, params, req.headers.get('x-twilio-signature'))) {
    return new Response('Invalid signature', { status: 403 })
  }
  if (params.From && typeof params.Body === 'string') await handleInboundSms(params.From, params.Body, new Date(), params.MessageSid ?? null)
  return new Response(EMPTY_TWIML, { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
