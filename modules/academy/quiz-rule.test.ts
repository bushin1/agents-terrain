import { describe, expect, it } from 'vitest'
import { ACADEMY_MODULES, allQuestions, quizForClient } from './content'
import { PASS_PCT, attemptOutcome, canAttempt, scoreQuiz } from './quiz-rule'

const questions = allQuestions()
const allRight = Object.fromEntries(questions.map((q) => [q.id, q.correctIndex]))
const now = new Date('2026-10-16T12:00:00Z')

describe('contenu', () => {
  it('5 modules, des identifiants de question uniques, une bonne réponse valide par question', () => {
    expect(ACADEMY_MODULES).toHaveLength(5)
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    for (const q of questions) expect(q.correctIndex).toBeLessThan(q.options.length)
  })
  it('la version envoyée au navigateur ne contient pas les réponses', () => {
    expect(JSON.stringify(quizForClient())).not.toContain('correctIndex')
  })
})

describe('scoreQuiz', () => {
  it('100 % si tout est juste, 0 % si rien n’est répondu', () => {
    expect(scoreQuiz(questions, allRight)).toBe(100)
    expect(scoreQuiz(questions, {})).toBe(0)
  })
  it('arrondi vers le bas', () => {
    const qs = [{ id: 'a', correctIndex: 0 }, { id: 'b', correctIndex: 0 }, { id: 'c', correctIndex: 0 }]
    expect(scoreQuiz(qs, { a: 0, b: 0, c: 1 })).toBe(66)
  })
})

describe('attemptOutcome', () => {
  it(`réussi à partir de ${PASS_PCT} %`, () => {
    expect(attemptOutcome(80, 2)).toEqual({ passed: true, failedAttempts: 2, lock: false })
  })
  it('verrouille au 3e échec', () => {
    expect(attemptOutcome(79, 0)).toEqual({ passed: false, failedAttempts: 1, lock: false })
    expect(attemptOutcome(50, 2)).toEqual({ passed: false, failedAttempts: 3, lock: true })
  })
})

describe('canAttempt', () => {
  it('premier essai possible en TRAINING', () => {
    expect(canAttempt({ status: 'TRAINING', failedAttempts: 0, lastAttemptAt: null }, now)).toEqual({ ok: true })
  })
  it('24 h d’attente après un échec', () => {
    const last = new Date(now.getTime() - 23 * 3_600_000)
    const r = canAttempt({ status: 'TRAINING', failedAttempts: 1, lastAttemptAt: last }, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retryAt?.toISOString()).toBe(new Date(last.getTime() + 24 * 3_600_000).toISOString())
    expect(canAttempt({ status: 'TRAINING', failedAttempts: 1, lastAttemptAt: new Date(now.getTime() - 25 * 3_600_000) }, now).ok).toBe(true)
  })
  it('impossible hors TRAINING', () => {
    expect(canAttempt({ status: 'LOCKED', failedAttempts: 3, lastAttemptAt: null }, now).ok).toBe(false)
    expect(canAttempt({ status: 'CERTIFIED', failedAttempts: 0, lastAttemptAt: null }, now).ok).toBe(false)
  })
})
