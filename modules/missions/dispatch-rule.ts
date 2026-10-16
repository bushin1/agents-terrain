import type { MissionStatus } from '@prisma/client'
import { distanceMiles, type Point } from '@/modules/geo/distance'

const H = 3_600_000
export const UNTAKEN_AFTER_HOURS = 48

/**
 * Une mission est proposée à un agent si le pro est dans SON rayon ou dans le rayon de diffusion de la mission.
 * Le statut ACTIVE de l'agent est vérifié par le service, pas ici.
 */
export function isVisibleTo(input: {
  agent: Point & { radiusMiles: number }
  mission: { status: MissionStatus; slotAt: Date; broadcastRadiusMiles: number | null }
  pro: { lat: number | null; lng: number | null }
  now: Date
}): boolean {
  const { agent, mission, pro, now } = input
  if (mission.status !== 'OPEN' || mission.slotAt <= now) return false
  if (pro.lat == null || pro.lng == null) return false
  const d = distanceMiles(agent, { lat: pro.lat, lng: pro.lng })
  return d <= agent.radiusMiles || (mission.broadcastRadiusMiles != null && d <= mission.broadcastRadiusMiles)
}

export function isUntaken(m: { status: MissionStatus; publishedAt: Date; slotAt: Date }, now: Date): boolean {
  return m.status === 'OPEN' && m.slotAt > now && now.getTime() - m.publishedAt.getTime() >= UNTAKEN_AFTER_HOURS * H
}

export function needsReschedule(m: { status: MissionStatus; slotAt: Date }, now: Date): boolean {
  return m.status === 'OPEN' && m.slotAt <= now
}
