import { z } from 'zod'

const cents = z.number().int().min(0)

export const SettingsSchema = z.object({
  tierAmountsCents: z.object({ VISIT: cents, LIVE: cents, CLIENT: cents, RETURN_VISIT: cents, QUICK_TASK: cents }),
  levels: z
    .array(z.object({
      name: z.enum(['BRONZE', 'SILVER', 'GOLD']),
      minValidated: z.number().int().min(0),
      bonusPct: z.number().int().min(0).max(100),
    }))
    .length(3)
    .refine((levels) => levels.some((l) => l.minValidated === 0), 'Un niveau doit commencer à 0 mission'),
  widenRadiusMiles: z.number().int().min(1).max(200),
  quickTask: z.object({
    starterMaxPerDay: z.number().int().min(1).max(50),
    bronzeMaxPerDay: z.number().int().min(1).max(50),
    silverMaxPerDay: z.number().int().min(1).max(50),
    goldMaxPerDay: z.number().int().min(1).max(50),
    warmupCount: z.number().int().min(0),
    survivalCheckDays: z.number().int().min(1).max(90),
    expirationHours: z.number().int().min(1).max(72),
    cooldownMinutes: z.number().int().min(0).max(1440),
    cashoutThresholdCents: cents,
  }),
})

export type Settings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  tierAmountsCents: { VISIT: 4000, LIVE: 2500, CLIENT: 5000, RETURN_VISIT: 2000, QUICK_TASK: 300 },
  levels: [
    { name: 'BRONZE', minValidated: 0, bonusPct: 0 },
    { name: 'SILVER', minValidated: 5, bonusPct: 10 },
    { name: 'GOLD', minValidated: 15, bonusPct: 20 },
  ],
  widenRadiusMiles: 50,
  quickTask: {
    starterMaxPerDay: 3,
    bronzeMaxPerDay: 5,
    silverMaxPerDay: 10,
    goldMaxPerDay: 15,
    warmupCount: 15,
    survivalCheckDays: 14,
    expirationHours: 2,
    cooldownMinutes: 15,
    cashoutThresholdCents: 3000,
  },
}
