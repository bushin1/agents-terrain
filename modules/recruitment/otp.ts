import { prisma } from '@/lib/prisma'
import { sendSms, smsTemplates } from '@/modules/sms'
import { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES, OTP_WINDOW_MINUTES, canIssueOtp, generateOtpCode, hashOtp, otpMatches } from './otp-rule'

// Garde-fous contre le pompage SMS (fraude qui fait envoyer des SMS facturés) : par IP et au total par jour.
// En complément, les « Geo Permissions » Twilio sont limitées aux États-Unis (runbook).
export const OTP_MAX_PER_IP_HOUR = 10
export const OTP_MAX_GLOBAL_DAY = 1000

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET manquant ou trop court (32 caractères minimum)')
  return s
}

export type OtpRequest = { ok: true } | { ok: false; error: string }

/**
 * Enregistre un code pour ce numéro et l'envoie si `send` est vrai. Un numéro inconnu passe par le même
 * chemin (code enregistré, rien envoyé) : les limites ne trahissent pas qui est inscrit. Les demandes d'un
 * même numéro sont sérialisées (verrou Postgres) pour qu'une rafale ne dépasse pas la limite.
 */
export async function requestOtp(phone: string, opts: { now?: Date; ip?: string | null; send: boolean }): Promise<OtpRequest> {
  const now = opts.now ?? new Date()
  const ip = opts.ip ?? null
  const issued = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${phone}))) AS l`
    const sinceWindow = new Date(now.getTime() - OTP_WINDOW_MINUTES * 60_000)
    if (!canIssueOtp(await tx.otpCode.count({ where: { phone, createdAt: { gte: sinceWindow } } }))) {
      return { ok: false as const, error: 'Too many codes requested. Try again in 15 minutes.' }
    }
    if (ip) {
      const sinceHour = new Date(now.getTime() - 3_600_000)
      if ((await tx.otpCode.count({ where: { ip, createdAt: { gte: sinceHour } } })) >= OTP_MAX_PER_IP_HOUR) {
        return { ok: false as const, error: 'Too many codes requested. Try again later.' }
      }
    }
    const sinceDay = new Date(now.getTime() - 86_400_000)
    if ((await tx.otpCode.count({ where: { createdAt: { gte: sinceDay } } })) >= OTP_MAX_GLOBAL_DAY) {
      return { ok: false as const, error: 'Too many codes requested. Try again later.' }
    }
    const code = generateOtpCode()
    await tx.otpCode.create({
      data: { phone, ip, codeHash: hashOtp(code, phone, secret()), expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000), createdAt: now },
    })
    return { ok: true as const, code }
  })
  if (!issued.ok) return issued
  if (!opts.send) return { ok: true }
  try {
    await sendSms(phone, smsTemplates.otp(issued.code))
    return { ok: true }
  } catch (e) {
    console.error('[otp] envoi SMS échoué', e)
    return { ok: false, error: 'We could not text this number. Check that it is a US mobile number.' }
  }
}

/**
 * Vérifie le dernier code non utilisé du numéro et le consomme. L'essai est réservé AVANT la comparaison
 * (mise à jour conditionnelle) : des requêtes simultanées ne dépassent jamais OTP_MAX_ATTEMPTS essais.
 */
export async function verifyOtp(phone: string, code: string, now: Date = new Date()): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({ where: { phone, usedAt: null }, orderBy: { createdAt: 'desc' } })
  if (!otp) return false
  const reserved = await prisma.otpCode.updateMany({
    where: { id: otp.id, usedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS }, expiresAt: { gt: now } },
    data: { attempts: { increment: 1 } },
  })
  if (reserved.count !== 1) return false
  if (!otpMatches(code, phone, secret(), otp.codeHash)) return false
  const used = await prisma.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: now } })
  return used.count === 1
}
