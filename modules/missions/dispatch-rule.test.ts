import { describe, expect, it } from 'vitest'
import { isUntaken, isVisibleTo, needsReschedule } from './dispatch-rule'

const H = 3_600_000
const now = new Date('2026-10-16T12:00:00Z')
// Agent à Back Bay (Boston). Pro à Cambridge (≈ 2 miles) et à Worcester (≈ 40 miles).
const agent = { lat: 42.3496, lng: -71.0746, radiusMiles: 10 }
const cambridge = { lat: 42.3736, lng: -71.1097 }
const worcester = { lat: 42.2626, lng: -71.8023 }
const open = { status: 'OPEN' as const, slotAt: new Date(now.getTime() + 48 * H), broadcastRadiusMiles: null }

describe('isVisibleTo (spec §4.5)', () => {
  it('mission ouverte, à venir, dans le rayon de l’agent', () => {
    expect(isVisibleTo({ agent, mission: open, pro: cambridge, now })).toBe(true)
  })
  it('hors du rayon de l’agent', () => {
    expect(isVisibleTo({ agent, mission: open, pro: worcester, now })).toBe(false)
  })
  it('visible grâce au rayon de diffusion élargi', () => {
    expect(isVisibleTo({ agent, mission: { ...open, broadcastRadiusMiles: 50 }, pro: worcester, now })).toBe(true)
  })
  it('jamais si la mission n’est pas OPEN, si le créneau est passé, ou sans coordonnées', () => {
    expect(isVisibleTo({ agent, mission: { ...open, status: 'ACCEPTED' }, pro: cambridge, now })).toBe(false)
    expect(isVisibleTo({ agent, mission: { ...open, slotAt: now }, pro: cambridge, now })).toBe(false)
    expect(isVisibleTo({ agent, mission: open, pro: { lat: null, lng: null }, now })).toBe(false)
  })
})

describe('encarts du back-office (spec §5.2)', () => {
  it('« Non prises » : OPEN depuis 48 h, créneau à venir', () => {
    expect(isUntaken({ ...open, publishedAt: new Date(now.getTime() - 48 * H) }, now)).toBe(true)
    expect(isUntaken({ ...open, publishedAt: new Date(now.getTime() - 47 * H) }, now)).toBe(false)
  })
  it('« À replanifier » : OPEN avec un créneau passé', () => {
    expect(needsReschedule({ status: 'OPEN', slotAt: new Date(now.getTime() - H) }, now)).toBe(true)
    expect(needsReschedule({ status: 'ACCEPTED', slotAt: new Date(now.getTime() - H) }, now)).toBe(false)
    expect(needsReschedule(open, now)).toBe(false)
  })
})
