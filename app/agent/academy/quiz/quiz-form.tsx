'use client'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { SubmitButton } from '@/components/agent/submit-button'
import { sendQuiz, type QuizState } from './actions'

type Q = { id: string; prompt: string; options: string[] }

export function QuizForm({ questions, passPct }: { questions: Q[]; passPct: number }) {
  const [state, action] = useActionState<QuizState, FormData>(sendQuiz, {})
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  if (state.result?.passed) {
    return (
      <>
        <main className="mc-scroll" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ position: 'relative', width: 132, height: 132, marginBottom: 32 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px var(--line)' }} />
            <span style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'var(--signal-soft)' }} />
            <svg viewBox="0 0 34 44" style={{ position: 'absolute', left: 38, top: 24, width: 56, height: 72 }} aria-hidden="true">
              <path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z" fill="var(--signal)" stroke="var(--ink)" strokeWidth="1.5" />
              <path d="M11.5 16.5l3.8 3.8 7.4-7.6" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="overline mc-accent-text">Academy complete</p>
          <h1 className="display-m" style={{ marginTop: 10 }}>You’re certified.</h1>
          <p className="body-l mc-muted" style={{ marginTop: 12 }}>Quiz score: <b className="mc-num" style={{ color: 'var(--ink)' }}>{state.result.score}%</b>. Next, sign your contractor agreement.</p>
        </main>
        <div className="mc-bottom"><Link href="/agent/contract" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Sign the agreement</Link></div>
      </>
    )
  }

  if (state.result || state.error) {
    const locked = state.result?.locked
    return (
      <>
        <main className="mc-scroll" style={{ paddingTop: 40 }}>
          <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="info" className="mc-ico--lg" /></span>
          <h1 className="h1" style={{ marginTop: 20 }}>{state.result ? `You scored ${state.result.score}%` : 'Not available right now'}</h1>
          <p className="mc-muted" style={{ marginTop: 8 }}>
            {state.error ??
              (locked
                ? 'That was your third attempt. Our team will review your account and text you.'
                : `You need ${passPct}% to pass. Read the lessons again; you can retry in 24 hours.`)}
          </p>
        </main>
        <div className="mc-bottom"><Link href="/agent/academy" className="mc-btn mc-btn--secondary mc-btn--lg mc-btn--block">Back to the lessons</Link></div>
      </>
    )
  }

  const q = questions[i]
  const last = i === questions.length - 1
  return (
    <form action={action} style={{ display: 'contents' }}>
      {Object.entries(answers).map(([id, v]) => <input key={id} type="hidden" name={`q:${id}`} value={v} />)}
      <header className="mc-appbar">
        <Link href="/agent/academy" className="mc-iconbtn" aria-label="Back"><Icon name="arrow-left" /></Link>
        <span className="mc-appbar__title">Quiz</span>
        <span className="body-s mc-muted mc-num" style={{ paddingRight: 12 }}>{i + 1} of {questions.length}</span>
      </header>
      <div style={{ padding: '0 16px' }}>
        <div className="mc-dots" aria-hidden="true">{questions.map((x, n) => <span key={x.id} {...(n <= i ? { 'data-on': '' } : {})} />)}</div>
      </div>
      <main className="mc-scroll" style={{ paddingTop: 28 }}>
        <h1 className="h2">{q.prompt}</h1>
        <div className="mc-stack" role="radiogroup" aria-label={q.prompt} style={{ marginTop: 24, gap: 10 }}>
          {q.options.map((o, n) => (
            <label key={o} className="mc-card mc-card--flat mc-check" style={{ padding: 16, ...(answers[q.id] === n ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : {}) }}>
              <input type="radio" name={`pick-${q.id}`} checked={answers[q.id] === n} onChange={() => setAnswers((a) => ({ ...a, [q.id]: n }))} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </main>
      <div className="mc-bottom">
        {last ? (
          <SubmitButton disabled={answers[q.id] === undefined}>Submit answers</SubmitButton>
        ) : (
          <button type="button" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block" disabled={answers[q.id] === undefined} onClick={() => setI(i + 1)}>Next question</button>
        )}
      </div>
    </form>
  )
}
