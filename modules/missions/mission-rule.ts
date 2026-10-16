import type { MissionStatus } from '@prisma/client'

const H = 3_600_000

// Machine d'état d'une mission (spec §7.2). VALIDATED, REJECTED et CANCELLED sont finaux.
export const MISSION_TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> = {
  OPEN: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['SUBMITTED', 'OPEN', 'CANCELLED'],
  SUBMITTED: ['VALIDATED', 'NEEDS_FIX', 'REJECTED'],
  NEEDS_FIX: ['SUBMITTED', 'REJECTED', 'CANCELLED'],
  VALIDATED: [],
  REJECTED: [],
  CANCELLED: [],
}

export function canTransitionMission(from: MissionStatus, to: MissionStatus): boolean {
  return MISSION_TRANSITIONS[from].includes(to)
}

export const MAX_ACCEPTED_PER_AGENT = 3
export const RELEASE_MIN_HOURS = 24
export const NEEDS_FIX_DAYS = 7
export const NO_SHOW_SMS_HOURS = 2
export const NO_SHOW_RELEASE_HOURS = 24

/** Désistement possible jusqu'à 24 h avant le créneau. */
export function canRelease(slotAt: Date, now: Date): boolean {
  return slotAt.getTime() - now.getTime() >= RELEASE_MIN_HOURS * H
}

export function needsFixExpired(needsFixAt: Date, now: Date): boolean {
  return now.getTime() - needsFixAt.getTime() >= NEEDS_FIX_DAYS * 24 * H
}

/**
 * Que faire d'une mission ACCEPTED dont le check-in n'est pas arrivé (spec §4.5).
 * Les services remettent noShowSmsAt, reminderSentAt et acceptedAt à null quand la mission repasse OPEN
 * ou change de créneau, pour que le prochain agent reçoive rappel et relance.
 */
export function noShowAction(
  m: { slotAt: Date; hasCheckin: boolean; noShowSmsAt: Date | null },
  now: Date,
): 'NONE' | 'SMS' | 'RELEASE' {
  if (m.hasCheckin) return 'NONE'
  const elapsed = now.getTime() - m.slotAt.getTime()
  if (elapsed >= NO_SHOW_RELEASE_HOURS * H) return 'RELEASE'
  if (elapsed >= NO_SHOW_SMS_HOURS * H && !m.noShowSmsAt) return 'SMS'
  return 'NONE'
}

/**
 * Rappel la veille : dans les 24 h avant le créneau, une fois. Choix assumé : pas de rappel si la mission a été
 * acceptée moins de 24 h avant le créneau (le SMS de confirmation vient d'arriver).
 */
export function reminderDue(
  m: { status: MissionStatus; slotAt: Date; acceptedAt: Date | null; reminderSentAt: Date | null },
  now: Date,
): boolean {
  if (m.status !== 'ACCEPTED' || m.reminderSentAt || !m.acceptedAt) return false
  const untilSlot = m.slotAt.getTime() - now.getTime()
  if (untilSlot <= 0 || untilSlot > 24 * H) return false
  return m.slotAt.getTime() - m.acceptedAt.getTime() >= 24 * H
}
