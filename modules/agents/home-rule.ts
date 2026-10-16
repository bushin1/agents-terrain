import type { AgentStatus } from '@prisma/client'

/** Écran d'accueil selon le statut : formation, contrat, missions, ou un message (verrouillé, refusé, suspendu). */
export function homePathFor(status: AgentStatus): string {
  switch (status) {
    case 'TRAINING':
      return '/agent/academy'
    case 'CERTIFIED':
      return '/agent/contract'
    case 'ACTIVE':
      return '/agent/missions'
    default:
      return '/agent/status'
  }
}
