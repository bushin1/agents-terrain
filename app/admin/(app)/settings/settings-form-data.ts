import { centsToDollarsInput, dollarsToCents } from '@/app/admin/_lib/format'
import type { Settings } from '@/modules/settings'

// Champs : tier_<PALIER> en dollars, level_<i>_minValidated et level_<i>_bonusPct (0 Bronze, 1 Silver, 2 Gold),
// widenRadiusMiles. Les bornes sont vérifiées ensuite par SettingsSchema.
export const TIER_KEYS = ['VISIT', 'LIVE', 'CLIENT', 'RETURN_VISIT', 'QUICK_TASK'] as const
export const LEVEL_NAMES = ['BRONZE', 'SILVER', 'GOLD'] as const

export const QT_KEYS = ['starterMaxPerDay', 'bronzeMaxPerDay', 'silverMaxPerDay', 'goldMaxPerDay', 'warmupCount', 'survivalCheckDays', 'expirationHours', 'cooldownMinutes'] as const

export function settingsToFormDefaults(s: Settings): Record<string, string> {
  const out: Record<string, string> = { widenRadiusMiles: String(s.widenRadiusMiles) }
  for (const tier of TIER_KEYS) out[`tier_${tier}`] = centsToDollarsInput(s.tierAmountsCents[tier])
  LEVEL_NAMES.forEach((name, i) => {
    const level = s.levels.find((l) => l.name === name)
    out[`level_${i}_minValidated`] = String(level?.minValidated ?? '')
    out[`level_${i}_bonusPct`] = String(level?.bonusPct ?? '')
  })
  for (const k of QT_KEYS) out[`qt_${k}`] = String(s.quickTask[k])
  out.qt_cashoutThresholdCents = centsToDollarsInput(s.quickTask.cashoutThresholdCents)
  return out
}

export function settingsFromForm(fd: FormData): { ok: true; value: Settings } | { ok: false; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {}
  const text = (name: string) => {
    const v = fd.get(name)
    return typeof v === 'string' ? v.trim() : ''
  }
  const int = (name: string) => {
    if (!/^\d{1,6}$/.test(text(name))) fieldErrors[name] = 'Nombre entier attendu'
    return Number(text(name))
  }
  const cents = (name: string) => {
    const c = dollarsToCents(text(name))
    if (c == null) fieldErrors[name] = 'Montant invalide (ex. 40 ou 40.50)'
    return c ?? 0
  }
  const value: Settings = {
    tierAmountsCents: { VISIT: cents('tier_VISIT'), LIVE: cents('tier_LIVE'), CLIENT: cents('tier_CLIENT'), RETURN_VISIT: cents('tier_RETURN_VISIT'), QUICK_TASK: cents('tier_QUICK_TASK') },
    levels: LEVEL_NAMES.map((name, i) => ({ name, minValidated: int(`level_${i}_minValidated`), bonusPct: int(`level_${i}_bonusPct`) })),
    widenRadiusMiles: int('widenRadiusMiles'),
    quickTask: {
      levelCents: { STARTER: cents('qt_lc_STARTER'), BRONZE: cents('qt_lc_BRONZE'), SILVER: cents('qt_lc_SILVER'), GOLD: cents('qt_lc_GOLD') },
      starterMaxPerDay: int('qt_starterMaxPerDay'),
      bronzeMaxPerDay: int('qt_bronzeMaxPerDay'),
      silverMaxPerDay: int('qt_silverMaxPerDay'),
      goldMaxPerDay: int('qt_goldMaxPerDay'),
      warmupCount: int('qt_warmupCount'),
      survivalCheckDays: int('qt_survivalCheckDays'),
      expirationHours: int('qt_expirationHours'),
      cooldownMinutes: int('qt_cooldownMinutes'),
      cashoutThresholdCents: cents('qt_cashoutThresholdCents'),
    },
  }
  return Object.keys(fieldErrors).length > 0 ? { ok: false, fieldErrors } : { ok: true, value }
}

type Issue = { code: string; path: readonly PropertyKey[]; message: string; minimum?: unknown; maximum?: unknown }

/** Erreurs de SettingsSchema → champ du formulaire, message en français. */
export function settingsErrors(issues: readonly Issue[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const [head, a, b] = issue.path
    const field =
      head === 'tierAmountsCents' && typeof a === 'string' ? `tier_${a}`
      : head === 'levels' && typeof a === 'number' && typeof b === 'string' ? `level_${a}_${b}`
      : typeof head === 'string' ? head
      : 'form'
    const message =
      issue.code === 'too_small' ? `Doit être au moins ${String(issue.minimum)}`
      : issue.code === 'too_big' ? `Doit être au plus ${String(issue.maximum)}`
      : issue.message
    out[field] ??= message
  }
  return out
}
