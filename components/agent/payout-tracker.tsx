import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import type { TrackStep } from './tracker-rule'

const LABELS = {
  VISIT: ['Visit validated', 'Our team is reviewing your checklist.', 'Validated · added to your balance.'],
  LIVE: ['Profile live', 'Waiting for the owner to finish verification. We check every day.', 'Live · added to your balance.'],
  CLIENT: ['Became customer', 'Only if the owner decides to sign up.', 'Signed up · added to your balance.'],
  RETURN_VISIT: ['Return visit validated', 'Our team is reviewing your checklist.', 'Validated · added to your balance.'],
  URGENCY: ['Mission bonus', '', 'Added to your balance.'],
} as const

export function PayoutTracker({ steps }: { steps: TrackStep[] }) {
  return (
    <ol className="mc-track">
      {steps.map((s) => {
        const [title, waitingText, doneText] = LABELS[s.tier]
        return (
          <li key={s.tier} className="mc-track__item" data-state={s.state}>
            <span className="mc-track__dot"><Icon name={s.state === 'done' ? 'check' : 'clock'} /></span>
            <div>
              <b>{title}</b>
              <p className="body-s mc-muted" style={{ marginTop: 2 }}>{s.state === 'done' ? doneText : waitingText}</p>
              <div style={{ marginTop: 8 }}>
                {s.state === 'done' && <span className="mc-badge mc-badge--success"><Icon name="check" /> Earned</span>}
                {s.state === 'pending' && <span className="mc-badge mc-badge--pending"><Icon name="clock" /> Pending</span>}
                {s.state === 'waiting' && <span className="mc-badge mc-badge--outline">Waiting</span>}
              </div>
            </div>
            <span className="mc-track__amt">{s.tier === 'VISIT' || s.tier === 'RETURN_VISIT' ? '' : '+'}{usd(s.amountCents, { cents: true })}</span>
          </li>
        )
      })}
    </ol>
  )
}
