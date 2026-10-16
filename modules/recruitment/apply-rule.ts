import { z } from 'zod'
import { isAdult } from '@/modules/agents/agent-rule'
import { normalizeUsPhone } from '@/modules/sms/sms-rule'

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const AVAILABILITY_SLOTS: string[] = DAYS.flatMap((d) => [`${d}-am`, `${d}-pm`])
export const RADIUS_OPTIONS = [5, 10, 25, 50] as const

// Messages en anglais : ils s'affichent tels quels sur le formulaire de candidature.
export function applicationSchema(now: Date) {
  return z.object({
    firstName: z.string().trim().min(1, 'Enter your first name').max(60),
    lastName: z.string().trim().min(1, 'Enter your last name').max(60),
    email: z.string().trim().toLowerCase().pipe(z.email({ message: 'Enter a valid email' })),
    phone: z.string().transform((v, ctx) => {
      const phone = normalizeUsPhone(v)
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid US mobile number' })
        return z.NEVER
      }
      return phone
    }),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth')
      // Refuse les dates impossibles (2005-02-30), que Date convertirait silencieusement en 2 mars.
      .refine((s) => {
        const d = new Date(`${s}T00:00:00Z`)
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
      }, 'Enter your date of birth')
      .transform((s) => new Date(`${s}T00:00:00Z`))
      .refine((d) => isAdult(d, now), 'You must be 18 or older'),
    zip: z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
    radiusMiles: z.coerce.number().refine((n) => (RADIUS_OPTIONS as readonly number[]).includes(n), 'Choose a travel radius'),
    hasCar: z.enum(['yes', 'no'], { message: 'Tell us if you have a car' }).transform((v) => v === 'yes'),
    availability: z
      .array(z.string().refine((s) => AVAILABILITY_SLOTS.includes(s), 'Unknown time slot'))
      .min(1, 'Pick at least one time slot'),
    confirm18: z.literal('on', { message: 'Confirm you are 18 or older' }),
  })
}

export type Application = z.output<ReturnType<typeof applicationSchema>>

export function parseApplication(input: Record<string, unknown>, now: Date = new Date()) {
  return applicationSchema(now).safeParse(input)
}
