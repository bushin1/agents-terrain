'use server'
import { clientIp } from '@/lib/request'
import { apply } from '@/modules/recruitment'

export type ApplyState = { phone?: string; fieldErrors?: Record<string, string> }

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const input = {
    firstName: String(form.get('firstName') ?? ''),
    lastName: String(form.get('lastName') ?? ''),
    email: String(form.get('email') ?? ''),
    phone: String(form.get('phone') ?? ''),
    birthDate: String(form.get('birthDate') ?? ''),
    occupation: String(form.get('occupation') ?? ''),
    howDidYouHear: String(form.get('howDidYouHear') ?? ''),
    zip: String(form.get('zip') ?? ''),
    radiusMiles: String(form.get('radiusMiles') ?? ''),
    hasCar: String(form.get('hasCar') ?? ''),
    availability: form.getAll('availability').map(String),
    confirm18: form.get('confirm18') ? 'on' : undefined,
  }
  const r = await apply(input, new Date(), await clientIp())
  return r.ok ? { phone: r.phone } : { fieldErrors: r.fieldErrors }
}
