import type { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { Prisma } from '@prisma/client'
import { geocodeZip } from '@/modules/geo'
import { normalizeUsPhone } from '@/modules/sms'
import { parseApplication } from './apply-rule'
import { requestOtp, verifyOtp } from './otp'

export type ApplyResult = { ok: true; phone: string } | { ok: false; fieldErrors: Record<string, string> }

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}

export async function apply(input: Record<string, unknown>, now: Date = new Date(), ip: string | null = null): Promise<ApplyResult> {
  const parsed = parseApplication(input, now)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }
  const a = parsed.data

  const existing = await prisma.agent.findFirst({ where: { OR: [{ email: a.email }, { phone: a.phone }] } })
  if (existing) {
    // Candidat qui n'a jamais validé son numéro : on lui renvoie simplement un code.
    if (existing.phone === a.phone && existing.status === 'APPLICANT') {
      const r = await requestOtp(a.phone, { now, ip, send: true })
      return r.ok ? { ok: true, phone: a.phone } : { ok: false, fieldErrors: { phone: r.error } }
    }
    return { ok: false, fieldErrors: { email: 'An account already exists with this email or phone. Log in instead.' } }
  }

  const geo = await geocodeZip(a.zip)
  if (!geo) return { ok: false, fieldErrors: { zip: 'We could not find this ZIP code' } }

  let agentId: string
  try {
    const agent = await prisma.agent.create({
      data: {
        firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone, birthDate: a.birthDate,
        zip: a.zip, lat: geo.lat, lng: geo.lng, radiusMiles: a.radiusMiles, hasCar: a.hasCar, availability: a.availability,
        profileAnswers: { occupation: a.occupation, howDidYouHear: a.howDidYouHear },
      },
    })
    agentId = agent.id
  } catch (e) {
    // Deux envois simultanés du même formulaire : le second tombe sur la contrainte d'unicité.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, fieldErrors: { email: 'An account already exists with this email or phone. Log in instead.' } }
    }
    throw e
  }
  await logAudit(prisma, { actor: `agent:${agentId}`, action: 'agent.apply', entity: 'Agent', entityId: agentId })
  const r = await requestOtp(a.phone, { now, ip, send: true })
  return r.ok ? { ok: true, phone: a.phone } : { ok: false, fieldErrors: { phone: r.error } }
}

/** Demande de code pour se connecter. Un numéro inconnu reçoit la même réponse, sans SMS envoyé. */
export async function requestLoginCode(rawPhone: string, now: Date = new Date(), ip: string | null = null): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const phone = normalizeUsPhone(rawPhone)
  if (!phone) return { ok: false, error: 'Enter a valid US mobile number' }
  const agent = await prisma.agent.findUnique({ where: { phone } })
  // Même chemin pour un numéro inconnu (code enregistré, aucun SMS) : les limites ne révèlent pas l'inscription.
  const r = await requestOtp(phone, { now, ip, send: agent !== null })
  return r.ok ? { ok: true, phone } : { ok: false, error: r.error }
}

/** Fournisseur Auth.js « agent-otp » : vérifie le code et valide le numéro d'un candidat. */
export async function authorizeAgentOtp(rawPhone: string, code: string, now: Date = new Date()): Promise<{ id: string; name: string } | null> {
  const phone = normalizeUsPhone(rawPhone)
  if (!phone || !/^\d{6}$/.test(code)) return null
  if (!(await verifyOtp(phone, code, now))) return null
  const agent = await prisma.agent.findUnique({ where: { phone } })
  if (!agent) return null
  if (agent.status === 'APPLICANT') {
    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id: agent.id }, data: { status: 'TRAINING', phoneVerifiedAt: now } })
      await logAudit(tx, { actor: `agent:${agent.id}`, action: 'agent.phone_verified', entity: 'Agent', entityId: agent.id })
    })
  }
  return { id: agent.id, name: agent.firstName }
}
