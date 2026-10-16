// Montants affichés par le design system. Tout est en cents (entiers), lus dans les réglages :
// aucun montant n'est écrit en dur dans les composants. Port de MapCrew.usd et MapCrew.estimate (bundle.js).

/** Les trois paiements par entreprise (sous-ensemble de Settings['tierAmountsCents']). */
export interface PayAmounts {
  VISIT: number
  LIVE: number
  CLIENT: number
}

export type LevelName = 'BRONZE' | 'SILVER' | 'GOLD'

/** Même forme qu'un élément de Settings['levels']. */
export interface PayLevel {
  name: LevelName
  minValidated: number
  bonusPct: number
}

export const LEVEL_LABEL: Record<LevelName, string> = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold' }

/**
 * « $1,234 » (marketing, arrondi au dollar) ou « $1,234.50 » avec `{ cents: true }` (app : soldes, historique).
 * Même règle que MapCrew.usd, mais l'entrée est en cents.
 */
export function usd(cents: number, opts: { cents?: boolean } = {}): string {
  const s = (Math.round(cents) / 100).toFixed(opts.cents ? 2 : 0)
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return '$' + parts.join('.')
}

/** Maximum par entreprise : visite + fiche en ligne + client (+ bonus éventuel). Sert aux « up to ». */
export function maxPerBusiness(amounts: PayAmounts, bonusCents = 0): number {
  return amounts.VISIT + amounts.LIVE + amounts.CLIENT + bonusCents
}

/**
 * Fourchette d'exemple pour un mois (cents) : bas = paiement de visite seul, haut = les trois paiements.
 * Le bonus de niveau s'applique aux trois paiements. Port de MapCrew.estimate.
 */
export function estimate(missions: number, levelBonusPct: number, amounts: PayAmounts): { low: number; high: number } {
  const mult = 1 + levelBonusPct / 100
  return {
    low: Math.round(missions * amounts.VISIT * mult),
    high: Math.round(missions * maxPerBusiness(amounts) * mult),
  }
}

/** Niveaux du plus bas au plus haut (les réglages ne garantissent pas l'ordre). */
export function sortLevels(levels: PayLevel[]): PayLevel[] {
  return [...levels].sort((a, b) => a.minValidated - b.minValidated)
}
