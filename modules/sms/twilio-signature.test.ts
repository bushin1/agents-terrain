import { describe, expect, it } from 'vitest'
import { computeTwilioSignature, isValidTwilioSignature } from './twilio-signature'

const url = 'https://mycompany.com/myapp.php?foo=1&bar=2'
const params = {
  CallSid: 'CA1234567890ABCDE',
  Caller: '+12349013030',
  Digits: '1234',
  From: '+12349013030',
  To: '+18005551212',
}

describe('signature Twilio', () => {
  it('reproduit l’exemple de la documentation', () => {
    expect(computeTwilioSignature('12345', url, params)).toBe('0/KCTR6DLpKmkAf8muzZqo1nDgQ=')
  })
  it('accepte la bonne signature', () => {
    expect(isValidTwilioSignature('12345', url, params, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(true)
  })
  it('refuse une signature absente, fausse, ou des paramètres modifiés', () => {
    expect(isValidTwilioSignature('12345', url, params, null)).toBe(false)
    expect(isValidTwilioSignature('12345', url, params, 'AAAA')).toBe(false)
    expect(isValidTwilioSignature('12345', url, { ...params, Digits: '9999' }, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(false)
  })
})
