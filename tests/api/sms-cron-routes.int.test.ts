import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { computeTwilioSignature } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { POST as inbound } from '@/app/api/sms/inbound/route'
import { POST as cron } from '@/app/api/cron/[job]/route'

const URL_INBOUND = 'https://agents.example.test/api/sms/inbound' // PUBLIC_BASE_URL (vitest.config.ts) + chemin

function twilioRequest(params: Record<string, string>, signature?: string) {
  const sig = signature ?? computeTwilioSignature(process.env.TWILIO_AUTH_TOKEN!, URL_INBOUND, params)
  return new Request('http://internal/api/sms/inbound', {
    method: 'POST',
    body: new URLSearchParams(params),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig },
  })
}

const cronRequest = (job: string, secret?: string) =>
  cron(new Request(`http://localhost/api/cron/${job}`, { method: 'POST', headers: secret ? { 'x-cron-secret': secret } : {} }), { params: Promise.resolve({ job }) })

describe('webhook SMS', () => {
  beforeEach(resetDb)

  it('refuse une signature invalide', async () => {
    const res = await inbound(twilioRequest({ From: '+16175550142', Body: '5' }, 'bad'))
    expect(res.status).toBe(403)
  })

  it('enregistre la note du pro et répond en TwiML vide', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ phone: '+16175550142' })
    const m = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED', postVisitSmsAt: new Date() })
    const res = await inbound(twilioRequest({ From: '+16175550142', Body: '5', MessageSid: 'SM1' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/xml')
    expect(await res.text()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).proRating).toBe(5)
  })
})

describe('tâches planifiées', () => {
  beforeEach(resetDb)

  it('401 sans le bon secret, 404 pour une tâche inconnue', async () => {
    expect((await cronRequest('no-show')).status).toBe(401)
    expect((await cronRequest('no-show', 'wrong-secret')).status).toBe(401)
    expect((await cronRequest('nope', process.env.CRON_SECRET)).status).toBe(404)
  })

  it('lance la tâche demandée et renvoie son résultat', async () => {
    const res = await cronRequest('no-show', process.env.CRON_SECRET)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ job: 'no-show', result: { sms: 0, released: 0 } })
  })
})
