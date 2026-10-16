import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeMission, makePro } from '@/tests/helpers/factories'
import { createPro, importPros, setProStatus } from './pros'

vi.mock('@/modules/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/geo')>()),
  geocodeAddress: vi.fn(async (q: string) => (q.includes('Nowhere') ? null : { lat: 42.3564, lng: -71.0621 })),
}))

const input = {
  businessName: 'Delgado Concrete & Masonry Restoration Services LLC',
  contactName: 'Frank Delgado',
  phone: '(617) 555-0142',
  address: '120 Tremont Street',
  city: 'Boston',
  state: 'ma',
  zip: '02108',
  trade: 'Concrete contractor',
}

describe('pros', () => {
  beforeEach(resetDb)

  it('crée un pro géocodé, au fuseau de son État, statut TO_CALL', async () => {
    const r = await createPro(input, 'setter@allo-chantiers.fr')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.pro).toMatchObject({ phone: '+16175550142', state: 'MA', timeZone: 'America/New_York', lat: 42.3564, status: 'TO_CALL' })
    expect(await prisma.auditLog.count({ where: { action: 'pro.create' } })).toBe(1)
  })

  it('garde le pro sans coordonnées si l’adresse est introuvable, et le signale', async () => {
    const r = await createPro({ ...input, address: '1 Nowhere Road' }, 'x')
    expect(r.ok && r.pro.lat).toBeNull()
    expect(r.ok && r.warning).toBe('Adresse introuvable : saisissez la latitude et la longitude à la main avant de créer une mission.')
  })

  it('accepte des coordonnées saisies à la main', async () => {
    const r = await createPro({ ...input, address: '1 Nowhere Road', lat: '42.30', lng: '-71.10' }, 'x')
    expect(r.ok && r.pro).toMatchObject({ lat: 42.3, lng: -71.1 })
  })

  it('renvoie les erreurs par champ', async () => {
    const r = await createPro({ ...input, phone: '123', zip: 'abc' }, 'x')
    expect(r).toMatchObject({ ok: false, fieldErrors: { phone: 'Téléphone US invalide', zip: 'Code postal à 5 chiffres' } })
  })

  it('importe un CSV, ignore les doublons de téléphone', async () => {
    await makePro({ phone: '+16175550199' })
    const csv = 'business_name,phone,address,city,state,zip,trade\nAcme Fence,6175550142,1 Main St,Boston,MA,02108,Fence\nBay Fence,6175550199,2 Main St,Boston,MA,02108,Fence\nCape Fence,123,3 Main St,Boston,MA,02108,Fence\n'
    const r = await importPros(csv, 'x')
    expect(r.created).toBe(1)
    expect(r.errors).toEqual([
      { line: 3, message: 'Déjà présent (même téléphone)' },
      { line: 4, message: 'Téléphone US invalide' },
    ])
  })

  it('passer un pro LOST annule ses missions en cours (spec §7.3)', async () => {
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, status: 'OPEN' })
    await setProStatus(pro.id, 'LOST', 'x', 'Ne répond plus')
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).status).toBe('CANCELLED')
    expect(await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).toMatchObject({ status: 'LOST', lostReason: 'Ne répond plus' })
  })

  it('refuse un statut posé à la main hors des cas permis, et LOST sans motif', async () => {
    const pro = await makePro({ status: 'AGREED' })
    await expect(setProStatus(pro.id, 'VISITED', 'x')).rejects.toThrow('AGREED → VISITED')
    await expect(setProStatus(pro.id, 'LOST', 'x', ' ')).rejects.toThrow('Motif obligatoire')
  })
})
