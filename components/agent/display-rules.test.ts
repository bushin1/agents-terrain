import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/modules/settings/defaults'
import { levelProgress } from './level-rule'
import { projectToMap } from './map-projection'
import { trackerSteps } from './tracker-rule'

describe('projectToMap', () => {
  const me = { lat: 42.3496, lng: -71.0746 }
  it('l’agent est au centre ; un point au bord du rayon touche le bord utile', () => {
    expect(projectToMap(me, me, 10)).toEqual({ x: 50, y: 50 })
    const north = projectToMap(me, { lat: me.lat + 10 / 69, lng: me.lng }, 10)
    expect(north.x).toBe(50)
    expect(north.y).toBeCloseTo(8, 0)
    const east = projectToMap(me, { lat: me.lat, lng: me.lng + 10 / (69.17 * Math.cos((me.lat * Math.PI) / 180)) }, 10)
    expect(east.x).toBeCloseTo(92, 0)
  })
  it('un point hors rayon reste sur le bord', () => {
    const far = projectToMap(me, { lat: me.lat - 5, lng: me.lng }, 10)
    expect(far.y).toBe(92)
  })
})

describe('trackerSteps (maquette AppMissionTracker)', () => {
  const amounts = DEFAULT_SETTINGS.tierAmountsCents
  it('soumise : visite en attente, le reste en attente d’étape', () => {
    expect(trackerSteps({ type: 'VISIT', status: 'SUBMITTED', earnings: [], amounts }).map((s) => s.state)).toEqual(['pending', 'waiting', 'waiting'])
  })
  it('validée : visite gagnée (montant réel), fiche en ligne en attente', () => {
    const steps = trackerSteps({ type: 'VISIT', status: 'VALIDATED', earnings: [{ tier: 'VISIT', amountCents: 4400, status: 'PAYABLE' }], amounts })
    expect(steps.map((s) => [s.tier, s.state, s.amountCents])).toEqual([['VISIT', 'done', 4400], ['LIVE', 'pending', 2500], ['CLIENT', 'waiting', 5000]])
  })
  it('mission de retour : un seul palier', () => {
    expect(trackerSteps({ type: 'RETURN_VISIT', status: 'VALIDATED', earnings: [{ tier: 'RETURN_VISIT', amountCents: 2000, status: 'PAYABLE' }], amounts })).toEqual([{ tier: 'RETURN_VISIT', state: 'done', amountCents: 2000 }])
  })
  it('un gain annulé ne compte pas comme gagné', () => {
    expect(trackerSteps({ type: 'VISIT', status: 'VALIDATED', earnings: [{ tier: 'VISIT', amountCents: 4000, status: 'VOID' }], amounts })[0].state).toBe('waiting')
  })
})

describe('levelProgress', () => {
  it('« 2 more visits to Silver » à 3 visites validées', () => {
    expect(levelProgress(3, DEFAULT_SETTINGS.levels)).toEqual({ current: 'BRONZE', next: 'SILVER', nextBonusPct: 10, remaining: 2, pct: 60 })
  })
  it('Gold : plus de niveau suivant', () => {
    expect(levelProgress(20, DEFAULT_SETTINGS.levels)).toEqual({ current: 'GOLD', next: null, nextBonusPct: null, remaining: 0, pct: 100 })
  })
})
