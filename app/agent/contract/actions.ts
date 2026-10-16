'use server'
import { redirect } from 'next/navigation'
import { clientIp } from '@/lib/request'
import { requireAgent } from '@/lib/session'
import { signContract } from '@/modules/contract'

export type SignState = { error?: string }

export async function sign(_prev: SignState, form: FormData): Promise<SignState> {
  const agent = await requireAgent()
  if (!form.get('agree')) return { error: 'Check the box to confirm you read the agreement and are 18 or older.' }
  const r = await signContract(agent.id, { ip: (await clientIp()) ?? 'unknown', signedName: String(form.get('signedName') ?? '') })
  if (!r.ok) return { error: r.error }
  redirect('/agent/missions')
}
