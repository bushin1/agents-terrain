import { AppBar } from '@/components/agent/app-bar'
import { levelProgress } from '@/components/agent/level-rule'
import { Icon } from '@/components/mc/icons'
import { LEVEL_LABEL, usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { prisma } from '@/lib/prisma'
import { balanceOf, listEarnings } from '@/modules/ledger'
import { getSettings } from '@/modules/settings'

const TIER_LABEL = { VISIT: 'Visit validated', LIVE: 'Profile live', CLIENT: 'Became customer', RETURN_VISIT: 'Return visit', URGENCY: 'Mission bonus' } as const

export default async function EarningsPage() {
  const agent = await requireAgentIn(['ACTIVE'])
  const [balance, earnings, settings, validated] = await Promise.all([
    balanceOf(agent.id),
    listEarnings(agent.id),
    getSettings(),
    prisma.mission.count({ where: { agentId: agent.id, status: 'VALIDATED' } }),
  ])
  const lp = levelProgress(validated, settings.levels)
  const payable = earnings.filter((e) => e.status === 'PAYABLE')
  return (
    <>
      <AppBar title="Earnings" large right={<span className={`mc-level mc-level--${lp.current.toLowerCase()}`}>{LEVEL_LABEL[lp.current]}</span>} />
      <main className="mc-scroll">
        <div className="mc-card mc-card--forest" style={{ padding: 20 }}>
          <p className="body-s" style={{ color: 'var(--on-forest-muted)' }}>Payable balance</p>
          <p className="money-xl" style={{ marginTop: 6 }}>{usd(balance, { cents: true })}</p>
          <p className="body-s" style={{ color: 'var(--on-forest-muted)', marginTop: 6 }}>{payable.length} validated payment{payable.length === 1 ? '' : 's'}</p>
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--paper)', color: 'var(--ink)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon name="calendar" />
            <div style={{ flex: 1 }}><b>Paid every Friday via Stripe</b><div className="body-s mc-muted">You’ll connect your bank before your first payout. Independent contractor, 18+.</div></div>
          </div>
        </div>
        <div className="mc-card" style={{ marginTop: 12 }}>
          {lp.next ? (
            <>
              <div className="mc-between"><b>{lp.remaining} more visit{lp.remaining === 1 ? '' : 's'} to {LEVEL_LABEL[lp.next]}</b><span className={`mc-level mc-level--${lp.next.toLowerCase()}`}>{LEVEL_LABEL[lp.next]}</span></div>
              <div className="mc-progress" style={{ marginTop: 12 }} role="progressbar" aria-label={`${validated} validated visits`} aria-valuenow={lp.pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${lp.pct}%` }} /></div>
              <div className="mc-between" style={{ marginTop: 8 }}><span className="body-s mc-muted mc-num">{validated} validated visit{validated === 1 ? '' : 's'}</span><span className="body-s mc-muted">+{lp.nextBonusPct}% on every payment</span></div>
            </>
          ) : (
            <b>You’re at the top level: +{settings.levels.find((l) => l.name === 'GOLD')?.bonusPct}% on every payment.</b>
          )}
        </div>
        <h2 className="h3" style={{ margin: '24px 0 8px' }}>History</h2>
        {earnings.length === 0 ? (
          <p className="mc-muted">Your first {usd(settings.tierAmountsCents.VISIT)} shows here once your first visit is validated.</p>
        ) : (
          <ul className="mc-list">
            {earnings.map((e) => (
              <li key={e.id}>
                <span className="mc-trade" style={{ width: 40, height: 40, background: e.status === 'VOID' ? 'var(--surface-sunk)' : 'var(--success-soft)', color: e.status === 'VOID' ? 'var(--ink-muted)' : 'var(--success)' }}><Icon name={e.status === 'VOID' ? 'x' : 'check'} /></span>
                <div style={{ flex: 1 }}>
                  <b>{TIER_LABEL[e.tier]}</b>
                  <div className="body-s mc-muted">{e.mission.pro.trade} · {e.mission.pro.city}, {e.mission.pro.state} · {e.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.status === 'VOID' ? ' · voided' : ''}</div>
                </div>
                <span className="money" style={e.status === 'VOID' ? { textDecoration: 'line-through', color: 'var(--ink-muted)' } : undefined}>{usd(e.amountCents, { cents: true })}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
