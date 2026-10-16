import type { MissionStatus, MissionType, ProStatus } from '@prisma/client'

export interface ProMissionEvent {
  kind: 'CREATED' | 'VALIDATED' | 'REJECTED' | 'CANCELLED'
  missionType: MissionType
  markLost?: boolean
}

/** Statut du pro après un événement sur une de ses missions (spec §7.3). */
export function proStatusAfter(current: ProStatus, event: ProMissionEvent): ProStatus {
  // Un pro perdu le reste (décision de l'équipe), même si une visite soumise avant est validée ensuite.
  if (current === 'LOST' || event.missionType === 'RETURN_VISIT') return current
  switch (event.kind) {
    case 'CREATED':
      return current === 'AGREED' ? 'MISSION_OPEN' : current
    case 'VALIDATED':
      return 'VISITED'
    case 'REJECTED':
    case 'CANCELLED':
      if (event.markLost) return 'LOST'
      return current === 'MISSION_OPEN' ? 'AGREED' : current
  }
}

/** Statuts qu'un setter peut poser lui-même ; les autres découlent des missions. */
export function canSetProStatusManually(from: ProStatus, to: ProStatus): boolean {
  if (to === 'LOST') return from !== 'LOST'
  return (from === 'TO_CALL' && to === 'AGREED') || (from === 'AGREED' && to === 'TO_CALL')
}

export function canCreateVisitFor(status: ProStatus): boolean {
  return status === 'AGREED'
}

/** Missions annulées quand le pro passe LOST. */
export const STATUSES_CANCELLED_ON_LOST: readonly MissionStatus[] = ['OPEN', 'ACCEPTED', 'NEEDS_FIX']
