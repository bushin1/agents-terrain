import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import { MissionCard } from '@/components/mc/mission-card'
import { maxPerBusiness, usd, type PayAmounts } from '@/components/mc/money'

// Premier écran : ce qu'on fait, combien, quand. Port de MapCrew.landing.hero ; le « up to » est calculé.
export function Hero({ amounts }: { amounts: PayAmounts }) {
  const upTo = usd(maxPerBusiness(amounts))
  const split = [
    ['Visit validated', usd(amounts.VISIT)],
    ['Profile live', `+${usd(amounts.LIVE)}`],
    ['Becomes a customer', `+${usd(amounts.CLIENT)}`],
  ]
  return (
    <section className="lp-wrap lp-hero" aria-labelledby="hero-h">
      <div className="lp-hero__grid">
        <div>
          <p className="lp-eyebrow">
            <Icon name="pin" className="mc-ico--sm" /> Field agents · US · 18+
          </p>
          <h1 id="hero-h">Get paid to put local businesses <em>on the map.</em></h1>
          <p className="lp-hero__sub">
            Visit contractors near you, help them set up their free Google Business Profile, and earn{' '}
            <b>{`up to ${upTo} per business`}</b> — paid every Friday.
          </p>
          <div className="lp-hero__ctas" id="hero-ctas">
            <a className="mc-btn mc-btn--primary mc-btn--lg" href="/apply">Apply in 5 minutes <Icon name="arrow-right" /></a>
            <a className="mc-btn mc-btn--secondary mc-btn--lg" href="#pay">See how pay works</a>
          </div>
          <ul className="lp-facts">
            {['Paid every Friday', 'No quotas', 'Daytime visits', 'You choose where'].map((fact) => (
              <li key={fact}><Icon name="check" />{fact}</li>
            ))}
          </ul>
        </div>
        <div className="lp-hero__visual">
          <MapMotif
            seed={21} cols={7} rows={7} label="Map of missions in a neighborhood" you={[24, 78]} radius={260}
            pins={[
              { x: 74, y: 22, tag: upTo, label: `Mission, up to ${upTo}` },
              { x: 86, y: 54, tag: 'Bonus', bonus: true, label: 'Mission with a bonus' },
              { x: 58, y: 40, state: 'done', label: 'Completed visit' },
              { x: 40, y: 18, tag: upTo, label: `Mission, up to ${upTo}` },
              { x: 92, y: 84, state: 'muted', label: 'Booked by another agent' },
            ]}
          />
          {/* Notification d'exemple : ce que l'agent reçoit quand sa visite est validée. */}
          <div className="lp-toast" aria-hidden="true">
            <span className="lp-toast__i"><Icon name="check" /></span>
            <span className="lp-toast__t"><b>Visit validated</b><span>{`${usd(amounts.VISIT)} added to your balance`}</span></span>
          </div>
          {/* Téléphone d'illustration : masqué aux lecteurs d'écran, donc rien d'interactif dedans. */}
          <div className="lp-hero__phone" aria-hidden="true">
            <MapMotif
              seed={5} cols={4} rows={4} gap={3.2} you={[30, 70]} route="M30 70 L30 56 L66 56 L66 44" diagA={88} diagB={30} waterY={92} avenue={5}
              pins={[{ x: 66, y: 44, selected: true, label: 'Fence contractor, 3.2 miles' }, { x: 22, y: 30, label: 'Roofing' }]}
            />
            <MissionCard trade="fencing" title="Fence contractor" city="Naperville, IL" distance="3.2 mi" slot="Tue, Oct 20 · 10–11 AM" amounts={amounts} />
            <span className="mc-btn mc-btn--primary mc-btn--block">Accept mission</span>
          </div>
          <div className="lp-hero__floater mc-card" aria-hidden="true" style={{ boxShadow: 'var(--shadow-raised)' }}>
            <div className="overline mc-muted" style={{ marginBottom: 8 }}>This business</div>
            <div className="mc-pline" style={{ marginBottom: 10 }}><i data-state="done" /><i data-state="pending" /><i /></div>
            <div className="mc-kv">
              {split.map(([k, v]) => (
                <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
