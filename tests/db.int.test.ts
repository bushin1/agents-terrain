import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from './helpers/db'
import { makeAgent, makeMission } from './helpers/factories'

describe('base de test', () => {
  beforeEach(resetDb)

  it('crée et relit des données, puis repart de zéro', async () => {
    await makeAgent()
    const mission = await makeMission()
    expect(await prisma.agent.count()).toBe(1)
    expect(mission.status).toBe('OPEN')
    await resetDb()
    expect(await prisma.agent.count()).toBe(0)
  })
})
