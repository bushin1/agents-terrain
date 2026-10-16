import Link from 'next/link'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { requireAgentIn } from '@/lib/agent-guard'
import { ACADEMY_MODULES } from '@/modules/academy'

export default async function AcademyPage() {
  const agent = await requireAgentIn(['TRAINING', 'CERTIFIED', 'ACTIVE'])
  const minutes = ACADEMY_MODULES.reduce((s, m) => s + m.minutes, 0)
  return (
    <>
      <AppBar title="Academy" large right={<span className="mc-badge mc-badge--outline"><Icon name="clock" /> ~{minutes} min</span>} />
      <main className="mc-scroll">
        <p className="mc-muted">Five short lessons, then a quiz. Read each lesson before you start the quiz.</p>
        <ol className="mc-list" style={{ marginTop: 16 }}>
          {ACADEMY_MODULES.map((m, i) => (
            <li key={m.id}>
              <span className="mc-step__dot">{i + 1}</span>
              <Link href={`/agent/academy/${m.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                <div style={{ fontWeight: 600 }}>{m.title}</div>
                <div className="body-s mc-muted">{m.videoUrl ? 'Video' : 'Lesson'} · {m.minutes} min</div>
              </Link>
              <Icon name="chev-right" />
            </li>
          ))}
          <li style={{ background: 'var(--surface-sunk)' }}>
            <span className="mc-step__dot"><Icon name={agent.status === 'TRAINING' ? 'cap' : 'check'} className="mc-ico--sm" /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Final quiz · {ACADEMY_MODULES.reduce((s, m) => s + m.questions.length, 0)} questions</div>
              <div className="body-s mc-muted">{agent.status === 'TRAINING' ? '80% to pass. 3 attempts.' : 'Passed'}</div>
            </div>
          </li>
        </ol>
      </main>
      {agent.status === 'TRAINING' && (
        <div className="mc-bottom">
          <Link href="/agent/academy/quiz" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Start the quiz</Link>
        </div>
      )}
    </>
  )
}
