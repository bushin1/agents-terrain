import type { Settings } from '@/modules/settings/defaults'

/** Progression vers le niveau suivant, pour la carte « 2 more visits to Silver ». */
export function levelProgress(validated: number, levels: Settings['levels']) {
  const sorted = [...levels].sort((a, b) => a.minValidated - b.minValidated)
  const current = [...sorted].reverse().find((l) => validated >= l.minValidated) ?? sorted[0]
  const next = sorted.find((l) => l.minValidated > validated) ?? null
  if (!next) return { current: current.name, next: null, nextBonusPct: null, remaining: 0, pct: 100 }
  return {
    current: current.name,
    next: next.name,
    nextBonusPct: next.bonusPct,
    remaining: next.minValidated - validated,
    pct: Math.round((validated / next.minValidated) * 100),
  }
}
