'use server'
import { requireAgent } from '@/lib/session'
import { submitQuiz } from '@/modules/academy'

export type QuizState = { result?: { passed: boolean; score: number; locked: boolean }; error?: string; retryAt?: string }

export async function sendQuiz(_prev: QuizState, form: FormData): Promise<QuizState> {
  const agent = await requireAgent()
  const answers: Record<string, number> = {}
  for (const [k, v] of form.entries()) if (k.startsWith('q:')) answers[k.slice(2)] = Number(v)
  const r = await submitQuiz(agent.id, answers)
  if (!r.ok) return { error: r.error, retryAt: r.retryAt?.toISOString() }
  return { result: { passed: r.passed, score: r.score, locked: r.locked } }
}
