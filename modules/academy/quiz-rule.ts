import type { AgentStatus } from '@prisma/client'

export const PASS_PCT = 80
export const MAX_FAILED_ATTEMPTS = 3
export const RETRY_DELAY_HOURS = 24

/** Pourcentage de bonnes réponses, arrondi vers le bas. */
export function scoreQuiz(
  questions: { id: string; correctIndex: number }[],
  answers: Record<string, number | undefined>,
): number {
  if (questions.length === 0) return 0
  const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length
  return Math.floor((correct * 100) / questions.length)
}

export function attemptOutcome(score: number, failedAttempts: number): { passed: boolean; failedAttempts: number; lock: boolean } {
  if (score >= PASS_PCT) return { passed: true, failedAttempts, lock: false }
  const n = failedAttempts + 1
  return { passed: false, failedAttempts: n, lock: n >= MAX_FAILED_ATTEMPTS }
}

export function canAttempt(
  agent: { status: AgentStatus; failedAttempts: number; lastAttemptAt: Date | null },
  now: Date,
): { ok: true } | { ok: false; reason: string; retryAt?: Date } {
  if (agent.status !== 'TRAINING') return { ok: false, reason: 'The quiz is not available for your account right now.' }
  if (agent.failedAttempts > 0 && agent.lastAttemptAt) {
    const retryAt = new Date(agent.lastAttemptAt.getTime() + RETRY_DELAY_HOURS * 3_600_000)
    if (now < retryAt) return { ok: false, reason: `You can retry the quiz ${RETRY_DELAY_HOURS} hours after your last attempt.`, retryAt }
  }
  return { ok: true }
}
