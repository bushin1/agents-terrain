import { z } from 'zod'

const cents = z.number().int().min(0)

export const SettingsSchema = z.object({
  tierAmountsCents: z.object({ VISIT: cents, LIVE: cents, CLIENT: cents, RETURN_VISIT: cents }),
  levels: z
    .array(z.object({
      name: z.enum(['BRONZE', 'SILVER', 'GOLD']),
      minValidated: z.number().int().min(0),
      bonusPct: z.number().int().min(0).max(100),
    }))
    .length(3)
    .refine((levels) => levels.some((l) => l.minValidated === 0), 'Un niveau doit commencer à 0 mission'),
  widenRadiusMiles: z.number().int().min(1).max(200), // rayon proposé par le bouton « Élargir »
})

export type Settings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  tierAmountsCents: { VISIT: 4000, LIVE: 2500, CLIENT: 5000, RETURN_VISIT: 2000 },
  levels: [
    { name: 'BRONZE', minValidated: 0, bonusPct: 0 },
    { name: 'SILVER', minValidated: 5, bonusPct: 10 },
    { name: 'GOLD', minValidated: 15, bonusPct: 20 },
  ],
  widenRadiusMiles: 50,
}
