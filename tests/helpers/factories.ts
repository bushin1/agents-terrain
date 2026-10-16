import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

let seq = 0
const next = () => ++seq
const four = (n: number) => String(1000 + (n % 9000)).slice(-4)

// Agent actif à Boston (Back Bay), rayon 25 miles.
export async function makeAgent(data: Partial<Prisma.AgentUncheckedCreateInput> = {}) {
  const n = next()
  return prisma.agent.create({
    data: {
      firstName: 'Maya',
      lastName: `Agent${n}`,
      email: `agent${n}@example.com`,
      phone: `+1617555${four(n)}`,
      birthDate: new Date('2004-05-01'),
      zip: '02116',
      lat: 42.3496,
      lng: -71.0746,
      radiusMiles: 25,
      hasCar: true,
      availability: ['mon-am'],
      status: 'ACTIVE',
      phoneVerifiedAt: new Date(),
      ...data,
    },
  })
}

// Pro d'accord pour une visite, dans le centre de Boston.
export async function makePro(data: Partial<Prisma.ProUncheckedCreateInput> = {}) {
  const n = next()
  return prisma.pro.create({
    data: {
      businessName: `Boston Concrete & Masonry Restoration Services ${n}`,
      contactName: 'Frank Delgado',
      phone: `+1617666${four(n)}`,
      address: '120 Tremont Street',
      city: 'Boston',
      state: 'MA',
      zip: '02108',
      lat: 42.3564,
      lng: -71.0621,
      timeZone: 'America/New_York',
      trade: 'Concrete contractor',
      status: 'AGREED',
      ...data,
    },
  })
}

// Mission ouverte dans 3 jours ; crée le pro si besoin.
export async function makeMission(data: Partial<Prisma.MissionUncheckedCreateInput> = {}) {
  const proId = data.proId ?? (await makePro({ status: 'MISSION_OPEN' })).id
  return prisma.mission.create({
    data: {
      slotAt: new Date(Date.now() + 3 * 86_400_000),
      suggestedCategory: 'Concrete contractor',
      ...data,
      proId,
    },
  })
}
