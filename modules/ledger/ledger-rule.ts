import type { EarningTier, MissionStatus, MissionType } from '@prisma/client'
import type { Settings } from '@/modules/settings/defaults'

export const LIVE_WINDOW_DAYS = 60
export const CLIENT_WINDOW_DAYS = 90
const DAY_MS = 86_400_000

export function levelFor(validatedCount: number, levels: Settings['levels']): Settings['levels'][number] {
  const sorted = [...levels].sort((a, b) => a.minValidated - b.minValidated)
  let current = sorted[0]
  for (const level of sorted) if (validatedCount >= level.minValidated) current = level
  return current
}

/**
 * Montant d'un gain. `validatedCount` = missions VALIDATED de l'agent au moment de la création du gain,
 * mission courante comprise. URGENCY reprend le bonus de la mission, sans bonus de niveau.
 */
export function computeAmount(input: {
  tier: EarningTier
  validatedCount: number
  urgencyBonusCents: number
  settings: Pick<Settings, 'tierAmountsCents' | 'levels'>
}): { baseAmountCents: number; levelBonusPct: number; amountCents: number } {
  if (input.tier === 'URGENCY') {
    return { baseAmountCents: input.urgencyBonusCents, levelBonusPct: 0, amountCents: input.urgencyBonusCents }
  }
  const base = input.settings.tierAmountsCents[input.tier]
  const pct = levelFor(input.validatedCount, input.settings.levels).bonusPct
  return { baseAmountCents: base, levelBonusPct: pct, amountCents: base + Math.round((base * pct) / 100) }
}

export type Eligibility = { ok: true } | { ok: false; reason: string }

/**
 * Un gain se rattache toujours à une mission. Pour LIVE et CLIENT, c'est la mission VISIT d'origine
 * du pro (spec §6.1) ; les délais sont comptés depuis sa validation (spec §6.3).
 */
export function checkEligibility(input: {
  tier: EarningTier
  mission: { type: MissionType; status: MissionStatus; urgencyBonusCents: number; validatedAt: Date | null }
  now: Date
}): Eligibility {
  const { tier, mission, now } = input
  if (mission.status !== 'VALIDATED') return { ok: false, reason: 'mission non validée' }
  switch (tier) {
    case 'VISIT':
      return mission.type === 'VISIT' ? { ok: true } : { ok: false, reason: 'palier VISIT réservé aux missions VISIT' }
    case 'RETURN_VISIT':
      return mission.type === 'RETURN_VISIT' ? { ok: true } : { ok: false, reason: 'palier RETURN_VISIT réservé aux missions de retour' }
    case 'URGENCY':
      return mission.urgencyBonusCents > 0 ? { ok: true } : { ok: false, reason: 'aucun bonus urgence sur cette mission' }
    case 'LIVE':
    case 'CLIENT': {
      if (mission.type !== 'VISIT' || !mission.validatedAt) return { ok: false, reason: 'il faut la mission VISIT d’origine' }
      const days = tier === 'LIVE' ? LIVE_WINDOW_DAYS : CLIENT_WINDOW_DAYS
      if (now.getTime() - mission.validatedAt.getTime() > days * DAY_MS) return { ok: false, reason: `délai de ${days} jours dépassé` }
      return { ok: true }
    }
  }
}
