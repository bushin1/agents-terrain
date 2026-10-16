'use client'
import { useState, useTransition } from 'react'
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'

interface ActiveTask {
  id: string
  missionId: string
  businessName: string
  city: string
  trade: string
  reviewText: string
  placeId: string
  expiresAt: string
}

interface RecentTask {
  id: string
  status: string
  businessName: string
  city: string
  createdAt: string
}

const LEVEL_COLORS: Record<string, string> = {
  STARTER: 'var(--muted)',
  BRONZE: '#cd7f32',
  SILVER: '#aaa9ad',
  GOLD: '#ffd700',
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  SUBMITTED: { label: 'Reviewing', cls: 'mc-badge--pending' },
  VERIFIED: { label: 'Verified', cls: 'mc-badge--success' },
  FAILED: { label: 'Failed', cls: 'mc-badge--danger' },
  EXPIRED: { label: 'Expired', cls: 'mc-badge--outline' },
}

export function TasksView(props: {
  level: string
  todayCount: number
  maxToday: number
  verifiedCount: number
  pendingBalanceCents: number
  cashoutThresholdCents: number
  taskAmountCents: number
  canRequest: boolean
  reason: string | null
  activeTask: ActiveTask | null
  recentTasks: RecentTask[]
}) {
  const [task, setTask] = useState<ActiveTask | null>(props.activeTask)
  const [submitting, setSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)

  async function requestTask() {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/tasks/assign', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setTask(data.task)
      } else {
        setError(data.reason ?? 'Could not assign a task right now')
      }
    })
  }

  async function submitTask() {
    if (!task || !screenshot) return
    setSubmitting(true)
    setError(null)
    const fd = new FormData()
    fd.append('taskId', task.id)
    fd.append('screenshot', screenshot)
    const res = await fetch('/api/tasks/submit', { method: 'POST', body: fd })
    const data = await res.json()
    setSubmitting(false)
    if (data.ok) {
      setTask(null)
      setScreenshot(null)
      window.location.reload()
    } else {
      setError(data.reason ?? 'Submission failed')
    }
  }

  const reviewUrl = task ? `https://search.google.com/local/writereview?placeid=${task.placeId}` : ''
  const progress = props.cashoutThresholdCents > 0 ? Math.min(100, Math.round((props.pendingBalanceCents / props.cashoutThresholdCents) * 100)) : 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="mc-between">
          <h1 className="h2">Quick Tasks</h1>
          <span className="mc-badge" style={{ background: LEVEL_COLORS[props.level], color: props.level === 'GOLD' ? '#000' : '#fff', height: 36 }}>
            <Icon name="trophy" /> {props.level}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="mc-stat">
            <span className="mc-stat__value">{props.todayCount}/{props.maxToday}</span>
            <span className="mc-stat__label">Today</span>
          </div>
          <div className="mc-stat">
            <span className="mc-stat__value">{usd(props.taskAmountCents, { cents: true })}</span>
            <span className="mc-stat__label">Per task</span>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 12, padding: '12px 16px' }}>
          <div className="mc-between" style={{ marginBottom: 6 }}>
            <span className="body-s mc-muted">Balance</span>
            <span className="body-s" style={{ fontWeight: 600 }}>{usd(props.pendingBalanceCents, { cents: true })}</span>
          </div>
          <div style={{ background: 'var(--border)', borderRadius: 4, height: 6 }}>
            <div style={{ background: 'var(--accent)', borderRadius: 4, height: 6, width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
          <p className="body-xs mc-muted" style={{ marginTop: 4 }}>
            {progress >= 100 ? 'Ready for payout!' : `${usd(props.cashoutThresholdCents - props.pendingBalanceCents, { cents: true })} until first payout`}
          </p>
        </div>
      </div>

      <div className="mc-scroll" style={{ paddingTop: 4, paddingInline: 16 }}>
        {task ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="mc-card" style={{ padding: 16 }}>
              <p className="body-s mc-muted" style={{ marginBottom: 4 }}>Your task</p>
              <h3 style={{ margin: 0 }}>{task.businessName}</h3>
              <p className="body-s mc-muted">{task.city} &middot; {task.trade}</p>

              <div style={{ marginTop: 16, background: 'var(--surface)', borderRadius: 8, padding: 12 }}>
                <p className="body-s" style={{ fontWeight: 600, marginBottom: 4 }}>Suggested review text:</p>
                <p className="body-s" style={{ fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;{task.reviewText}&rdquo;</p>
                <p className="body-xs mc-muted" style={{ marginTop: 8 }}>Feel free to rephrase in your own words.</p>
              </div>

              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mc-btn mc-btn--primary mc-btn--block"
                style={{ marginTop: 16 }}
              >
                <Icon name="external" /> Open Google Review Page
              </a>

              <div style={{ marginTop: 16 }}>
                <p className="body-s" style={{ fontWeight: 600, marginBottom: 8 }}>Upload proof (screenshot):</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
                  style={{ width: '100%' }}
                />
              </div>

              {screenshot && (
                <button
                  type="button"
                  className="mc-btn mc-btn--success mc-btn--block"
                  style={{ marginTop: 12 }}
                  disabled={submitting}
                  onClick={submitTask}
                >
                  <Icon name="check" /> {submitting ? 'Submitting...' : 'Submit Task'}
                </button>
              )}

              <p className="body-xs mc-muted" style={{ marginTop: 12, textAlign: 'center' }}>
                Expires: {new Date(task.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-light)', display: 'grid', placeItems: 'center' }}>
              <Icon name="zap" className="mc-ico--xl" />
            </div>
            <p className="body-s" style={{ textAlign: 'center', maxWidth: 280 }}>
              Leave a review for a local business and earn {usd(props.taskAmountCents, { cents: true })}. Takes about 2 minutes.
            </p>
            {error && <p className="mc-error body-s" role="alert">{error}</p>}
            <button
              type="button"
              className="mc-btn mc-btn--primary mc-btn--lg"
              disabled={!props.canRequest || isPending}
              onClick={requestTask}
            >
              <Icon name="zap" /> {isPending ? 'Finding a task...' : 'Get a Task'}
            </button>
            {!props.canRequest && props.reason && (
              <p className="body-xs mc-muted" style={{ textAlign: 'center' }}>{props.reason}</p>
            )}
          </div>
        )}

        {props.recentTasks.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 className="h4" style={{ marginBottom: 12 }}>Recent tasks</h3>
            <div className="mc-stack">
              {props.recentTasks.map((t) => {
                const badge = STATUS_BADGE[t.status] ?? { label: t.status, cls: 'mc-badge--outline' }
                return (
                  <div key={t.id} className="mc-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p className="body-s" style={{ fontWeight: 500 }}>{t.businessName}</p>
                      <p className="body-xs mc-muted">{t.city}</p>
                    </div>
                    <span className={`mc-badge ${badge.cls}`}>{badge.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
