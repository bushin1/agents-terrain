// Envoi de SMS. En production : Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM).
// En développement sans Twilio : affichage dans la console (les codes de connexion y apparaissent).
// En test : driver mémoire branché par tests/setup.ts.

export interface SmsDriver {
  send(to: string, body: string): Promise<{ id: string }>
}

export function twilioDriver(accountSid: string, authToken: string, from: string): SmsDriver {
  return {
    async send(to, body) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      })
      const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string }
      if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message ?? 'erreur inconnue'}`)
      return { id: data.sid ?? '' }
    },
  }
}

const consoleDriver: SmsDriver = {
  async send(to, body) {
    console.info(`[sms:console] → ${to} : ${body}`)
    return { id: 'console' }
  },
}

export const memorySmsDriver: SmsDriver & { sent: { to: string; body: string }[] } = {
  sent: [],
  async send(to, body) {
    memorySmsDriver.sent.push({ to, body })
    return { id: `mem-${memorySmsDriver.sent.length}` }
  },
}

let override: SmsDriver | null = null

export function setSmsDriver(driver: SmsDriver | null): void {
  override = driver
}

export function getSmsDriver(): SmsDriver {
  if (override) return override
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) return twilioDriver(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
  if (process.env.NODE_ENV !== 'production') return consoleDriver
  throw new Error('SMS non configuré : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM')
}

export async function sendSms(to: string, body: string): Promise<{ id: string }> {
  return getSmsDriver().send(to, body)
}
