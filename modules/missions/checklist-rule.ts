import type { MissionStatus, MissionType } from '@prisma/client'
import { z } from 'zod'

export const MIN_PHOTOS = 10
export const MAX_SIGNATURE_DATAURL_CHARS = 700_000 // ≈ 500 Ko de PNG

const clientAt = z.iso.datetime({ offset: true })

// Ce que le téléphone envoie pour chaque étape. Les photos passent par une route dédiée (multipart).
export const StepInputSchemas = {
  checkin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0),
    clientAt,
  }),
  consent: z.object({
    signerName: z.string().trim().min(2).max(100),
    textVersion: z.string().min(1).max(40),
    signaturePng: z.string().startsWith('data:image/png;base64,').max(MAX_SIGNATURE_DATAURL_CHARS),
    clientAt,
  }),
  profile: z.object({
    listingName: z.string().trim().min(2).max(150),
    category: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(80),
    zip: z.string().regex(/^\d{5}$/),
    mode: z.enum(['CREATED', 'CLAIMED']),
    clientAt,
  }),
  invite: z.object({ result: z.enum(['INVITE_SENT', 'INVITE_NOT_ALLOWED_YET']), clientAt }),
  verification: z
    .object({
      result: z.enum(['VIDEO_DONE', 'VIDEO_NOT_OFFERED', 'OTHER_METHOD_STARTED']),
      method: z.string().trim().min(2).max(100).optional(),
      clientAt,
    })
    .refine((v) => v.result !== 'OTHER_METHOD_STARTED' || !!v.method, { message: 'Say which method Google offered', path: ['method'] }),
  checkout: z.object({ clientAt }),
}

export type InputStepName = keyof typeof StepInputSchemas
export type StepName = InputStepName | 'photos'

type Received = { receivedAt: string }

// Ce qui est enregistré dans Submission.steps (l'accord garde la clé du fichier signature, pas l'image).
export interface StepsData {
  checkin?: z.infer<typeof StepInputSchemas.checkin> & Received
  consent?: Omit<z.infer<typeof StepInputSchemas.consent>, 'signaturePng'> & { signatureKey: string } & Received
  profile?: z.infer<typeof StepInputSchemas.profile> & Received
  invite?: z.infer<typeof StepInputSchemas.invite> & Received
  verification?: z.infer<typeof StepInputSchemas.verification> & Received
  checkout?: z.infer<typeof StepInputSchemas.checkout> & Received
}

export const STEPS_BY_TYPE: Record<MissionType, readonly StepName[]> = {
  VISIT: ['checkin', 'consent', 'profile', 'invite', 'photos', 'verification', 'checkout'],
  RETURN_VISIT: ['checkin', 'invite', 'verification', 'checkout'],
}

const FIXABLE: readonly StepName[] = ['invite', 'photos', 'verification']

export function missingSteps(type: MissionType, steps: StepsData, photoCount: number): StepName[] {
  return STEPS_BY_TYPE[type].filter((s) => (s === 'photos' ? photoCount < MIN_PHOTOS : !steps[s]))
}

/** Étapes modifiables selon le statut (spec §7.2) : tout en ACCEPTED ; photos, invitation et vérification en NEEDS_FIX. */
export function editableSteps(type: MissionType, status: MissionStatus): StepName[] {
  const all = STEPS_BY_TYPE[type]
  if (status === 'ACCEPTED') return [...all]
  if (status === 'NEEDS_FIX') return all.filter((s) => FIXABLE.includes(s))
  return []
}

export function parseStepInput(step: string, data: unknown) {
  if (!Object.hasOwn(StepInputSchemas, step)) {
    return { success: false as const, error: `Unknown step: ${step}` }
  }
  const schema = StepInputSchemas[step as InputStepName]
  const r = schema.safeParse(data)
  return r.success
    ? { success: true as const, step: step as InputStepName, data: r.data }
    : { success: false as const, error: r.error.issues.map((i) => i.message).join('; ') }
}
