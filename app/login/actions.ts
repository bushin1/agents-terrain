'use server'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { clientIp } from '@/lib/request'
import { requestLoginCode } from '@/modules/recruitment'

export type CodeRequestState = { phone?: string; error?: string }
export type VerifyState = { error?: string }

export async function sendLoginCode(_prev: CodeRequestState, form: FormData): Promise<CodeRequestState> {
  const r = await requestLoginCode(String(form.get('phone') ?? ''), new Date(), await clientIp())
  return r.ok ? { phone: r.phone } : { error: r.error }
}

/** Vérifie le code et ouvre la session agent (Auth.js, fournisseur « agent-otp »). */
export async function verifyCode(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  try {
    await signIn('agent-otp', { phone: String(form.get('phone') ?? ''), code: String(form.get('code') ?? ''), redirectTo: '/agent' })
    return {}
  } catch (e) {
    if (e instanceof AuthError) return { error: 'That code is not valid or has expired. Check the last text we sent.' }
    throw e // la redirection de Next passe par une exception : on la laisse remonter
  }
}
