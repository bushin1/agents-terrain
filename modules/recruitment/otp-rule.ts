import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const OTP_TTL_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_MAX_PER_WINDOW = 3
export const OTP_WINDOW_MINUTES = 15

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Empreinte HMAC du code lié au numéro : un code volé en base ne sert à rien. */
export function hashOtp(code: string, phone: string, secret: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex')
}

export function otpMatches(code: string, phone: string, secret: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code, phone, secret), 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** `recentCount` = codes déjà émis pour ce numéro dans les OTP_WINDOW_MINUTES dernières minutes. */
export function canIssueOtp(recentCount: number): boolean {
  return recentCount < OTP_MAX_PER_WINDOW
}

export function otpUsable(otp: { expiresAt: Date; attempts: number; usedAt: Date | null }, now: Date): boolean {
  return !otp.usedAt && otp.expiresAt > now && otp.attempts < OTP_MAX_ATTEMPTS
}
