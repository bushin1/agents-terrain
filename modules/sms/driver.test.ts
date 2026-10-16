import { afterEach, describe, expect, it, vi } from 'vitest'
import { memorySmsDriver, sendSms, setSmsDriver, twilioDriver } from './driver'

afterEach(() => vi.unstubAllGlobals())

describe('twilioDriver', () => {
  it('envoie le message via l’API REST Twilio', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ sid: 'SM123' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await twilioDriver('AC1', 'tok', '+16175550000').send('+16175551234', 'Hello')
    expect(res.id).toBe('SM123')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json')
    expect(String(init.body)).toBe('To=%2B16175551234&From=%2B16175550000&Body=Hello')
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('AC1:tok').toString('base64'))
  })

  it('lève une erreur si Twilio refuse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'bad number' }), { status: 400 })))
    await expect(twilioDriver('AC1', 'tok', '+1').send('+1', 'x')).rejects.toThrow('Twilio 400: bad number')
  })
})

describe('memorySmsDriver', () => {
  it('garde les messages envoyés (driver branché par tests/setup.ts)', async () => {
    await sendSms('+16175551234', 'code 123456')
    expect(memorySmsDriver.sent).toEqual([{ to: '+16175551234', body: 'code 123456' }])
  })

  it('peut être remplacé', async () => {
    const custom = { send: vi.fn(async () => ({ id: 'x' })) }
    setSmsDriver(custom)
    await sendSms('+1', 'y')
    expect(custom.send).toHaveBeenCalledWith('+1', 'y')
  })
})
