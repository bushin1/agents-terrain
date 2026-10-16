import type { AgentStatus } from '@prisma/client'

// Machine d'état d'un agent (spec §7.1). En phase 1, CERTIFIED → ACTIVE à la signature du contrat ;
// la phase 2 ajoutera la condition Stripe dans modules/contract.
export const AGENT_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  APPLICANT: ['TRAINING'],
  TRAINING: ['CERTIFIED', 'LOCKED'],
  LOCKED: ['TRAINING', 'REFUSED'],
  REFUSED: [],
  CERTIFIED: ['ACTIVE'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
}

export function canTransitionAgent(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_TRANSITIONS[from].includes(to)
}

/** 18 ans révolus à la date `now` (dates comparées en UTC). */
export function isAdult(birthDate: Date, now: Date): boolean {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear()
  const m = now.getUTCMonth() - birthDate.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--
  return age >= 18
}
