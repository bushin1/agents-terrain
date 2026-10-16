import { requireAgentIn } from '@/lib/agent-guard'
import { quizForClient } from '@/modules/academy'
import { PASS_PCT } from '@/modules/academy/quiz-rule'
import { QuizForm } from './quiz-form'

export default async function QuizPage() {
  await requireAgentIn(['TRAINING'])
  const questions = quizForClient().flatMap((m) => m.questions)
  return <QuizForm questions={questions} passPct={PASS_PCT} />
}
