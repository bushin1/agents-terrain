import { centsToDollarsInput, dollarsToCents } from '@/app/admin/_lib/format'
import type { Settings } from '@/modules/settings'

// Champs : tier_<PALIER> en dollars, level_<i>_minValidated et level_<i>_bonusPct (0 Bronze, 1 Silver, 2 Gold),
// widenRadiusMiles. Les bornes sont vérifiées ensuite par SettingsSchema.
export const TIER_KEYS = ['VISIT', 'LIVE', 'CLIENT', 'RETURN_VISIT'] as const
export const LEVEL_NAMES = ['BRONZE', 'SILVER', 'GOLD'] as const

export function settingsToFormDefaults(s: Settings): Record<string, string> {
  const out: Record<string, string> = { widenRadiusMiles: String(s.widenRadiusMiles) }
  for (const tier of TIER_KEYS) out[`tier_${tier}`] = centsToDollarsInput(s.tierAmountsCents[tier])
  LEVEL_NAMES.forEach((name, i) => {
    const level = s.levels.find((l) => l.name === name)
    out[`level_${i}_minValidated`] = String(level?.minValidated ?? '')
    out[`level_${i}_bonusPct`] = String(level?.bonusPct ?? '')
  })
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
    tierAmountsCents: { VISIT: cents('tier_VISIT'), LIVE: cents('tier_LIVE'), CLIENT: cents('tier_CLIENT'), RETURN_VISIT: cents('tier_RETURN_VISIT') },
    levels: LEVEL_NAMES.map((name, i) => ({ name, minValidated: int(`level_${i}_minValidated`), bonusPct: int(`level_${i}_bonusPct`) })),
    widenRadiusMiles: int('widenRadiusMiles'),
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
