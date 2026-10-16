import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { CONTRACT_IS_DRAFT, CONTRACT_SECTIONS } from '@/modules/contract'
import { getSettings } from '@/modules/settings'
import { ContractForm } from './contract-form'

export default async function ContractPage() {
  await requireAgentIn(['CERTIFIED'])
  const { tierAmountsCents: a } = await getSettings()
  const bullets = [
    'You’re an independent contractor, not an employee.',
    `We pay ${usd(a.VISIT)}, +${usd(a.LIVE)} and +${usd(a.CLIENT)} per business as each step is validated.`,
    'You handle your own taxes. We send a 1099-NEC when required.',
    'You never handle owners’ passwords and never write or ask for reviews.',
    'Either of us can end it at any time.',
  ]
  return (
    <>
      <AppBar title="Get paid" />
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8 }}>
        <span className="mc-badge mc-badge--bonus">1 Agreement</span>
        <span className="mc-badge mc-badge--outline">2 Payouts · coming soon</span>
      </div>
      <main className="mc-scroll" style={{ paddingTop: 16, flex: 'none' }}>
        {CONTRACT_IS_DRAFT && (
          <p className="mc-badge mc-badge--pending" style={{ marginBottom: 12 }}><Icon name="info" /> Draft — pending legal review</p>
        )}
        <h1 className="h1">Your contractor agreement, in plain English</h1>
        <ul className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bullets.map((t) => (
            <li key={t} className="mc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: 'var(--success)' }}><Icon name="check" /></span>
              <span className="body-s" style={{ fontSize: 15, lineHeight: '22px' }}>{t}</span>
            </li>
          ))}
        </ul>
        <details style={{ marginTop: 16 }}>
          <summary className="mc-link mc-row" style={{ minHeight: 44, cursor: 'pointer' }}><Icon name="external" className="mc-ico--sm" /> Read the full agreement</summary>
          <div className="mc-card mc-card--sunk" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CONTRACT_SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="h3">{s.title}</h2>
                <p className="body-s" style={{ marginTop: 4 }}>{s.body}</p>
              </section>
            ))}
          </div>
        </details>
      </main>
      <ContractForm />
    </>
  )
}
