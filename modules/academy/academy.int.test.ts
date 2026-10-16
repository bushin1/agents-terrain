import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent } from '@/tests/helpers/factories'
import { allQuestions } from './content'
import { refuseAgent, submitQuiz, unlockAgent } from './index'

const right = Object.fromEntries(allQuestions().map((q) => [q.id, q.correctIndex]))
const wrong = Object.fromEntries(allQuestions().map((q) => [q.id, (q.correctIndex + 1) % q.options.length]))
const H = 3_600_000
const t0 = new Date('2026-10-16T12:00:00Z')

describe('quiz', () => {
  beforeEach(resetDb)

  it('réussite → CERTIFIED, tentative enregistrée', async () => {
    const agent = await makeAgent({ status: 'TRAINING' })
    expect(await submitQuiz(agent.id, right, t0)).toEqual({ ok: true, passed: true, score: 100, locked: false })
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } })).status).toBe('CERTIFIED')
    expect(await prisma.trainingAttempt.count()).toBe(1)
  })

  it('échec → attente de 24 h, puis verrouillage au 3e échec', async () => {
    const agent = await makeAgent({ status: 'TRAINING' })
    expect(await submitQuiz(agent.id, wrong, t0)).toMatchObject({ ok: true, passed: false, locked: false })
    expect((await submitQuiz(agent.id, wrong, new Date(t0.getTime() + H))).ok).toBe(false)
    await submitQuiz(agent.id, wrong, new Date(t0.getTime() + 25 * H))
    expect(await submitQuiz(agent.id, wrong, new Date(t0.getTime() + 50 * H))).toMatchObject({ ok: true, locked: true })
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } })).status).toBe('LOCKED')
  })

  it('un admin débloque (essais remis à zéro) ou refuse', async () => {
    const a = await makeAgent({ status: 'LOCKED', failedAttempts: 3, lastAttemptAt: t0 })
    await unlockAgent(a.id, 'marvin@allo-chantiers.fr')
    expect(await prisma.agent.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({ status: 'TRAINING', failedAttempts: 0, lastAttemptAt: null })

    const b = await makeAgent({ status: 'LOCKED' })
    await refuseAgent(b.id, 'marvin@allo-chantiers.fr', 'Quiz échoué 3 fois')
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('REFUSED')
    expect(await prisma.auditLog.count({ where: { action: { in: ['agent.unlock', 'agent.refuse'] } } })).toBe(2)
  })

  it('refuse de débloquer un agent qui n’est pas LOCKED', async () => {
    const a = await makeAgent({ status: 'ACTIVE' })
    await expect(unlockAgent(a.id, 'x')).rejects.toThrow('ACTIVE → TRAINING')
  })
})
