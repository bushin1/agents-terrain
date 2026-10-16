import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent } from '@/tests/helpers/factories'
import { CONTRACT_SECTIONS, CONTRACT_VERSION } from './contract-text'
import { signContract } from './index'

describe('contrat', () => {
  beforeEach(resetDb)

  it('un agent CERTIFIED signe et devient ACTIVE (phase 1 : sans condition Stripe)', async () => {
    const a = await makeAgent({ status: 'CERTIFIED' })
    const at = new Date('2026-10-16T12:00:00Z')
    expect(await signContract(a.id, { ip: '203.0.113.7', signedName: '  Maya R. Thompson ' }, at)).toEqual({ ok: true })
    expect(await prisma.agent.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({
      status: 'ACTIVE', contractVersion: CONTRACT_VERSION, contractSignedAt: at, contractIp: '203.0.113.7', contractSignedName: 'Maya R. Thompson',
    })
    expect(await prisma.auditLog.count({ where: { action: 'agent.contract_signed' } })).toBe(1)
  })

  it('refuse un agent qui n’est pas CERTIFIED', async () => {
    const a = await makeAgent({ status: 'TRAINING' })
    expect(await signContract(a.id, { ip: '203.0.113.7', signedName: 'Maya Thompson' })).toEqual({ ok: false, error: 'Finish your training before signing the agreement.' })
  })

  it('exige le nom légal tapé (signature)', async () => {
    const a = await makeAgent({ status: 'CERTIFIED' })
    expect(await signContract(a.id, { ip: '203.0.113.7', signedName: 'M' })).toEqual({ ok: false, error: 'Type your full legal name to sign.' })
  })

  it('le contrat contient les règles non négociables (spec §2, §8.3)', () => {
    const text = CONTRACT_SECTIONS.map((s) => s.body).join(' ')
    expect(text).toMatch(/not affiliated with Google/i)
    expect(text).toMatch(/password/i)
    expect(text).toMatch(/reviews?/i)
    expect(text).toMatch(/no quotas/i)
  })
})
