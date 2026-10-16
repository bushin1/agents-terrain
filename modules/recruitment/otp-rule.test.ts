import { describe, expect, it } from 'vitest'
import { OTP_MAX_ATTEMPTS, canIssueOtp, generateOtpCode, hashOtp, otpMatches, otpUsable } from './otp-rule'

const secret = 'test-secret-test-secret-test-secret-1234'
const now = new Date('2026-10-16T12:00:00Z')

describe('generateOtpCode', () => {
  it('produit 6 chiffres, zéros compris', () => {
    for (let i = 0; i < 200; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/)
  })
})

describe('hashOtp / otpMatches', () => {
  it('l’empreinte dépend du code et du numéro', () => {
    const h = hashOtp('123456', '+16175551234', secret)
    expect(otpMatches('123456', '+16175551234', secret, h)).toBe(true)
    expect(otpMatches('123457', '+16175551234', secret, h)).toBe(false)
    expect(otpMatches('123456', '+16175559999', secret, h)).toBe(false)
  })
})

describe('canIssueOtp', () => {
  it('3 codes maximum par fenêtre', () => {
    expect(canIssueOtp(2)).toBe(true)
    expect(canIssueOtp(3)).toBe(false)
  })
})

describe('otpUsable', () => {
  const base = { expiresAt: new Date(now.getTime() + 60_000), attempts: 0, usedAt: null }
  it('utilisable s’il n’est ni expiré, ni utilisé, ni épuisé', () => {
    expect(otpUsable(base, now)).toBe(true)
  })
  it('refusé après expiration, utilisation ou trop d’essais', () => {
    expect(otpUsable({ ...base, expiresAt: now }, now)).toBe(false)
    expect(otpUsable({ ...base, usedAt: now }, now)).toBe(false)
    expect(otpUsable({ ...base, attempts: OTP_MAX_ATTEMPTS }, now)).toBe(false)
  })
})
