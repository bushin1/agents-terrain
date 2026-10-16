'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import { MissionCard } from '@/components/mc/mission-card'
import { maxPerBusiness, usd, type PayAmounts } from '@/components/mc/money'
import { projectToMap } from './map-projection'

export interface MissionItem {
  id: string
  trade: string
  city: string
  state: string
  distanceMiles: number
  slotLabel: string
  approx: { lat: number; lng: number }
  urgencyBonusCents: number
}

export function MissionsView({ items, me, radiusMiles, zip, amounts }: {
  items: MissionItem[]
  me: { lat: number; lng: number }
  radiusMiles: number
  zip: string
  amounts: PayAmounts
}) {
  const [view, setView] = useState<'map' | 'list'>('list')
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null)
  const reach = Math.max(radiusMiles, ...items.map((m) => m.distanceMiles))
  const pins = useMemo(
    () => items.map((m) => {
      const p = projectToMap(me, m.approx, reach)
      return { id: m.id, x: p.x, y: p.y, tag: m.urgencyBonusCents > 0 ? 'Bonus' : usd(maxPerBusiness(amounts, m.urgencyBonusCents)), bonus: m.urgencyBonusCents > 0, label: `${m.trade}, ${m.distanceMiles} mi` }
    }),
    [items, me, reach, amounts],
  )
  const current = items.find((m) => m.id === selected)

  const card = (m: MissionItem) => (
    <MissionCard
      key={m.id}
      href={`/agent/missions/${m.id}`}
      trade={m.trade}
      title={m.trade}
      city={`${m.city}, ${m.state}`}
      distance={`${m.distanceMiles} mi`}
      slot={m.slotLabel}
      bonusCents={m.urgencyBonusCents}
      amounts={amounts}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="mc-between">
          <h1 className="h2">Missions near you</h1>
          <span className="mc-badge mc-badge--outline" style={{ height: 36 }}><Icon name="pin" /> {zip} · {radiusMiles} mi</span>
        </div>
        <div className="mc-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><Icon name="map" className="mc-ico--sm" /> Map</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" className="mc-ico--sm" /> List</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty__art"><MapMotif seed={7} cols={4} rows={3} gap={3} water={false} height={112} pins={[{ x: 55, y: 55, state: 'muted', label: 'No mission' }]} /></div>
          <h3>No missions within {radiusMiles} miles right now</h3>
          <p>New missions are posted as our team books visits. We’ll text you when one opens near you.</p>
        </div>
      ) : view === 'map' ? (
        <div style={{ position: 'relative', flex: 1, minHeight: 420 }}>
          <MapMotif
            seed={33} cols={5} rows={7} gap={2.6} label="Missions map (approximate positions)"
            style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
            you={[50, 50]}
            pins={pins.map(({ id, ...p }) => ({ ...p, selected: id === selected, onClick: () => setSelected(id) }))}
          />
          {current && (
            <div className="mc-sheet" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5 }}>
              {card(current)}
              <Link href={`/agent/missions/${current.id}`} className="mc-btn mc-btn--primary mc-btn--block" style={{ marginTop: 12 }}>View mission</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mc-scroll" style={{ paddingTop: 4 }}>
          <p className="body-s mc-muted" style={{ marginBottom: 12 }}>{items.length} mission{items.length > 1 ? 's' : ''} within {radiusMiles} mi · sorted by distance</p>
          <div className="mc-stack">{items.map(card)}</div>
        </div>
      )}
    </div>
  )
}
