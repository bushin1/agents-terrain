// Montants affichés par le design system. Tout est en cents (entiers), lus dans les réglages :
// aucun montant n'est écrit en dur dans les composants.

/** Les trois paiements par entreprise — modèle visite (phase 1). */
export interface PayAmounts {
  VISIT: number
  LIVE: number
  CLIENT: number
}

/** Montants par avis selon le niveau — modèle avis (phase 2). */
export interface ReviewAmounts {
  STARTER: number
  BRONZE: number
  SILVER: number
  GOLD: number
}

export type LevelName = 'BRONZE' | 'SILVER' | 'GOLD'

export interface PayLevel {
  name: LevelName
  minValidated: number
  bonusPct: number
}

export const LEVEL_LABEL: Record<LevelName, string> = { BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or' }

export function usd(cents: number, opts: { cents?: boolean } = {}): string {
  const s = (Math.round(cents) / 100).toFixed(opts.cents ? 2 : 0)
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.') + ' $'
}

export function maxPerBusiness(amounts: PayAmounts, bonusCents = 0): number {
  return amounts.VISIT + amounts.LIVE + amounts.CLIENT + bonusCents
}

export function estimate(missions: number, levelBonusPct: number, amounts: PayAmounts): { low: number; high: number } {
  const mult = 1 + levelBonusPct / 100
  return {
    low: Math.round(missions * amounts.VISIT * mult),
    high: Math.round(missions * maxPerBusiness(amounts) * mult),
  }
}

/** Estimation mensuelle pour le modèle avis : reviews × montant du niveau. */
export function estimateReviews(reviewsPerMonth: number, amountCents: number): number {
  return reviewsPerMonth * amountCents
}

export function sortLevels(levels: PayLevel[]): PayLevel[] {
  return [...levels].sort((a, b) => a.minValidated - b.minValidated)
}
