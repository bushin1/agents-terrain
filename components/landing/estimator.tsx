'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Icon } from '@/components/mc/icons'
import type { ReviewAmounts } from '@/components/mc/money'

const MIN = 1
const MAX = 15

type ReviewLevel = 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD'

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  STARTER: 'Débutant',
  BRONZE: 'Bronze',
  SILVER: 'Argent',
  GOLD: 'Or',
}

const ORDERED_LEVELS: ReviewLevel[] = ['STARTER', 'BRONZE', 'SILVER', 'GOLD']

export function ReviewEstimator({ levelCents }: { levelCents: ReviewAmounts }) {
  const [reviews, setReviews] = useState(5)
  const [level, setLevel] = useState<ReviewLevel>('STARTER')
  const radios = useRef<(HTMLButtonElement | null)[]>([])

  const monthlyEstimate = reviews * 30 * levelCents[level]
  const fill = `${((reviews - MIN) / (MAX - MIN)) * 100}%`

  function onRadioKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + ORDERED_LEVELS.length) % ORDERED_LEVELS.length
    setLevel(ORDERED_LEVELS[next])
    radios.current[next]?.focus()
  }

  return (
    <div className="lp-est">
      <span className="mc-badge mc-badge--pending lp-est__ex"><Icon name="info" /> Exemple, pas une garantie</span>
      <h3 className="h3" style={{ marginTop: 8 }}>À quoi pourrait ressembler un mois ?</h3>
      <div className="mc-field" style={{ marginTop: 20 }}>
        <label className="mc-label mc-between" htmlFor="est-n">
          <span>Avis par jour</span>
          <span className="money mc-num">{reviews}</span>
        </label>
        <input
          className="mc-range" id="est-n" type="range" min={MIN} max={MAX} value={reviews} aria-describedby="est-out"
          onChange={(e) => setReviews(Number(e.target.value))}
          style={{ '--fill': fill } as CSSProperties}
        />
      </div>
      <div className="mc-field" style={{ marginTop: 16 }}>
        <span className="mc-label" id="est-lvl">Votre niveau</span>
        <div className="mc-seg" role="radiogroup" aria-labelledby="est-lvl">
          {ORDERED_LEVELS.map((l, i) => (
            <button
              key={l}
              ref={(el) => { radios.current[i] = el }}
              type="button" role="radio" aria-checked={l === level} tabIndex={l === level ? 0 : -1}
              onClick={() => setLevel(l)}
              onKeyDown={(e) => onRadioKey(e, i)}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
      </div>
      <div className="lp-est__out" id="est-out" aria-live="polite">
        <div className="mc-muted body-s">Estimation mensuelle (30 jours)</div>
        <div className="lp-est__range">{`${(monthlyEstimate / 100).toFixed(0)} $`}</div>
        <div className="mc-muted body-s" style={{ marginTop: 4 }}>
          Soit <span>{reviews}</span> avis par jour × 30 jours × {levelCents[level] / 100} $ / avis
        </div>
      </div>
      <p className="lp-est__fine">
        Les résultats réels dépendent du nombre d'avis approuvés. Un avis rejeté par notre équipe n'est pas payé.
        Exemple non contractuel.
      </p>
    </div>
  )
}

/** Ancien estimateur conservé pour les tests — ne plus utiliser dans le nouveau layout. */
export function Estimator() { return null }
