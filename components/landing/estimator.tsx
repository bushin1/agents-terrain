'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Icon } from '@/components/mc/icons'
import { estimate, LEVEL_LABEL, sortLevels, usd, type LevelName, type PayAmounts, type PayLevel } from '@/components/mc/money'

// Estimateur « What could a month look like? » : seul composant client de la landing.
// Même calcul et même accessibilité que le comportement [data-est] de MapCrew.hydrate (bundle.js),
// plus la navigation au clavier du groupe radio (flèches, un seul bouton dans l'ordre de tabulation).
const MIN = 1
const MAX = 40

export function Estimator({ amounts, levels }: { amounts: PayAmounts; levels: PayLevel[] }) {
  const ordered = sortLevels(levels)
  const [missions, setMissions] = useState(8)
  const [level, setLevel] = useState<LevelName>(ordered[0]?.name ?? 'BRONZE')
  const radios = useRef<(HTMLButtonElement | null)[]>([])

  const range = estimate(missions, ordered.find((l) => l.name === level)?.bonusPct ?? 0, amounts)
  const fill = `${((missions - MIN) / (MAX - MIN)) * 100}%`

  function onRadioKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + ordered.length) % ordered.length
    setLevel(ordered[next].name)
    radios.current[next]?.focus()
  }

  return (
    <div className="lp-est">
      <span className="mc-badge mc-badge--pending lp-est__ex"><Icon name="info" /> Example, not a guarantee</span>
      <h3 className="h3" style={{ marginTop: 8 }}>What could a month look like?</h3>
      <div className="mc-field" style={{ marginTop: 20 }}>
        <label className="mc-label mc-between" htmlFor="est-n">
          <span>Missions per month</span>
          <span className="money mc-num">{missions}</span>
        </label>
        <input
          className="mc-range" id="est-n" type="range" min={MIN} max={MAX} value={missions} aria-describedby="est-out"
          onChange={(e) => setMissions(Number(e.target.value))}
          style={{ '--fill': fill } as CSSProperties}
        />
      </div>
      <div className="mc-field" style={{ marginTop: 16 }}>
        <span className="mc-label" id="est-lvl">Your level</span>
        <div className="mc-seg" role="radiogroup" aria-labelledby="est-lvl">
          {ordered.map((l, i) => (
            <button
              key={l.name}
              ref={(el) => { radios.current[i] = el }}
              type="button" role="radio" aria-checked={l.name === level} tabIndex={l.name === level ? 0 : -1}
              onClick={() => setLevel(l.name)}
              onKeyDown={(e) => onRadioKey(e, i)}
            >
              {LEVEL_LABEL[l.name]}
            </button>
          ))}
        </div>
      </div>
      <div className="lp-est__out" id="est-out" aria-live="polite">
        <div className="mc-muted body-s">Example range per month</div>
        <div className="lp-est__range">{`${usd(range.low)} – ${usd(range.high)}`}</div>
        <div className="mc-muted body-s" style={{ marginTop: 4 }}>
          About <span>{`${Math.round(missions * 0.75)}–${missions}`}</span> hours on site, plus your travel.
        </div>
      </div>
      <p className="lp-est__fine">
        {`Low end: only the ${usd(amounts.VISIT)} visit payment. High end: all three payments for every business. `}
        Real results depend on validated visits and what each owner decides. Level bonus applies to all three payments.
      </p>
    </div>
  )
}
