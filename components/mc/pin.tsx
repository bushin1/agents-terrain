import type { CSSProperties } from 'react'

// Pin de marque (goutte + œil), port de MapCrew.pinSVG / MapCrew.pin (bundle.js).
export const PIN_BODY_PATH =
  'M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z'

export interface PinProps {
  /** Position en % de la boîte de la carte ; sans x/y, le pin est rendu en ligne. */
  x?: number
  y?: number
  state?: 'done' | 'muted'
  /** Étiquette au-dessus du pin : montant (« $115 ») ou « Bonus ». */
  tag?: string
  bonus?: boolean
  selected?: boolean
  label?: string
  /** Pin cliquable vers une page (lien). */
  href?: string
  /** Pin bouton : uniquement depuis un composant client (un composant serveur ne passe pas de fonction). */
  onClick?: () => void
}

function PinSvg({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 34 44" aria-hidden="true">
      <path className="p-body" d={PIN_BODY_PATH} style={selected ? { strokeWidth: 2.5 } : undefined} />
      <circle className="p-eye" cx="17" cy="16.5" r="5.5" />
    </svg>
  )
}

export function Pin({ x, y, state, tag, bonus, selected = false, label = 'Mission', href, onClick }: PinProps) {
  const className = 'mc-pin' + (state === 'done' ? ' mc-pin--done' : state === 'muted' ? ' mc-pin--muted' : '')
  const position: CSSProperties = x != null && y != null ? { left: `${x}%`, top: `${y}%` } : { position: 'relative', transform: 'none' }
  const inner = (
    <>
      <PinSvg selected={selected} />
      {tag ? <span className={bonus ? 'mc-pin__tag mc-pin__tag--bonus' : 'mc-pin__tag'}>{tag}</span> : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={className} style={position} aria-pressed={selected} aria-label={label} onClick={onClick}>
        {inner}
      </button>
    )
  }
  // Le CSS ne lève que les boutons [aria-pressed="true"] : pour un lien ou une image, l'état sélectionné est en ligne.
  const lifted: CSSProperties = selected && x != null && y != null ? { transform: 'translate(-50%, -100%) translateY(-4px) scale(1.12)' } : {}
  if (href) {
    return (
      <a className={className} style={{ ...position, ...lifted }} href={href} aria-label={label} aria-current={selected ? 'true' : undefined}>
        {inner}
      </a>
    )
  }
  return (
    <span className={className} style={{ ...position, ...lifted, cursor: 'default' }} role="img" aria-label={label}>
      {inner}
    </span>
  )
}
