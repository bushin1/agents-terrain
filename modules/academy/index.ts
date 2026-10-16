import type { AgentStatus } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { canTransitionAgent } from '@/modules/agents/agent-rule'
import { allQuestions } from './content'
import { attemptOutcome, canAttempt, scoreQuiz } from './quiz-rule'

export { ACADEMY_MODULES, quizForClient } from './content'

export type QuizResult = { ok: true; passed: boolean; score: number; locked: boolean } | { ok: false; error: string; retryAt?: Date }

export async function submitQuiz(agentId: string, answers: Record<string, number>, now: Date = new Date()): Promise<QuizResult> {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    const can = canAttempt(agent, now)
    if (!can.ok) return { ok: false, error: can.reason, retryAt: can.retryAt }
    const score = scoreQuiz(allQuestions(), answers)
    const out = attemptOutcome(score, agent.failedAttempts)
    const status: AgentStatus = out.passed ? 'CERTIFIED' : out.lock ? 'LOCKED' : 'TRAINING'
    // Mise à jour conditionnelle : deux envois simultanés ne contournent ni l'attente de 24 h ni le verrouillage.
    const moved = await tx.agent.updateMany({
      where: { id: agentId, status: 'TRAINING', failedAttempts: agent.failedAttempts, lastAttemptAt: agent.lastAttemptAt },
      data: { status, failedAttempts: out.failedAttempts, lastAttemptAt: now },
    })
    if (moved.count !== 1) return { ok: false, error: 'Your answers were already submitted. Refresh the page.' }
    await tx.trainingAttempt.create({ data: { agentId, score, passed: out.passed, answers } })
    const action = out.passed ? 'agent.certified' : out.lock ? 'agent.locked' : 'agent.quiz_failed'
    await logAudit(tx, { actor: `agent:${agentId}`, action, entity: 'Agent', entityId: agentId, data: { score } })
    return { ok: true, passed: out.passed, score, locked: out.lock }
  })
}

async function moveAgent(db: Db, agentId: string, to: AgentStatus): Promise<void> {
  const agent = await db.agent.findUniqueOrThrow({ where: { id: agentId } })
  if (!canTransitionAgent(agent.status, to)) throw new Error(`Transition refusée : ${agent.status} → ${to}`)
}

export async function unlockAgent(agentId: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await moveAgent(tx, agentId, 'TRAINING')
    await tx.agent.update({ where: { id: agentId }, data: { status: 'TRAINING', failedAttempts: 0, lastAttemptAt: null } })
    await logAudit(tx, { actor, action: 'agent.unlock', entity: 'Agent', entityId: agentId })
  })
}

export async function refuseAgent(agentId: string, actor: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await moveAgent(tx, agentId, 'REFUSED')
    await tx.agent.update({ where: { id: agentId }, data: { status: 'REFUSED' } })
    await logAudit(tx, { actor, action: 'agent.refuse', entity: 'Agent', entityId: agentId, reason })
  })
}
