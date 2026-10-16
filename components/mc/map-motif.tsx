import type { CSSProperties, ReactNode } from 'react'
import { Pin, type PinProps } from './pin'

// Motif de quartier vu du dessus : îlots arrondis, un parc, une rivière, une avenue en diagonale,
// des pins et un trajet en pointillés. Port fidèle et déterministe de MapCrew.map (bundle.js) :
// même générateur à graine, mêmes options, même SVG. C'est une illustration, pas une carte.

export interface MapMotifOptions {
  seed?: number
  cols?: number
  rows?: number
  /** Largeur des rues, en unités de la boîte 0–100. */
  gap?: number
  /** Hauteur des rues = gap × aspect. */
  aspect?: number
  /** Index de l'îlot transformé en parc (par défaut : tiré au sort). */
  park?: number
  water?: boolean
  waterY?: number
  /** Épaisseur de l'avenue en px. */
  avenue?: number
  diagA?: number
  diagB?: number
  /** Trajet SVG dans l'espace 0–100. */
  route?: string
}

export interface MapRect {
  cls: 'm-block' | 'm-park'
  x: string
  y: string
  width: string
  height: string
  rx: string
}

export interface MapShapes {
  rects: MapRect[]
  water: string | null
  street: { d: string; width: number }
  route: string | null
}

/** Générateur pseudo-aléatoire de Park–Miller, identique à celui de bundle.js. */
function rng(seed: number): () => number {
  let s = seed || 7
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Formes du motif (fonction pure) : même graine, même dessin. */
export function mapMotif(o: MapMotifOptions = {}): MapShapes {
  const r = rng(o.seed || 11)
  const cols = o.cols || 6
  const rows = o.rows || 7
  const gx = o.gap || 2.2
  const gy = gx * (o.aspect || 1)
  const xs = [0]
  const ys = [0]
  for (let i = 0; i < cols; i++) xs.push(xs[i] + 0.7 + r() * 0.6)
  for (let j = 0; j < rows; j++) ys.push(ys[j] + 0.7 + r() * 0.6)
  const sx = 104 / xs[cols]
  const sy = 104 / ys[rows]
  const park = o.park != null ? o.park : Math.floor(r() * cols * rows)
  const rects: MapRect[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = xs[i] * sx - 2 + gx / 2
      const x1 = xs[i + 1] * sx - 2 - gx / 2
      const y0 = ys[j] * sy - 2 + gy / 2
      const y1 = ys[j + 1] * sy - 2 - gy / 2
      const split = r() > 0.55
      const cls = j * cols + i === park ? 'm-park' : 'm-block'
      if (split && cls === 'm-block') {
        // Îlot coupé en deux par une ruelle.
        const mid = y0 + (y1 - y0) * (0.4 + r() * 0.2)
        rects.push({ cls: 'm-block', x: x0.toFixed(2), y: y0.toFixed(2), width: (x1 - x0).toFixed(2), height: (mid - y0 - gy * 0.25).toFixed(2), rx: '1.1' })
        rects.push({ cls: 'm-block', x: x0.toFixed(2), y: (mid + gy * 0.25).toFixed(2), width: (x1 - x0).toFixed(2), height: (y1 - mid - gy * 0.25).toFixed(2), rx: '1.1' })
      } else {
        rects.push({ cls, x: x0.toFixed(2), y: y0.toFixed(2), width: (x1 - x0).toFixed(2), height: (y1 - y0).toFixed(2), rx: '1.4' })
      }
    }
  }
  const wy = o.waterY || 80
  return {
    rects,
    water: o.water !== false ? `M-2 ${wy} C 14 ${wy - 6}, 30 ${wy + 12}, 48 102 L -2 102 Z` : null,
    street: { d: `M-2 ${o.diagA || 72} L 102 ${o.diagB || 18}`, width: o.avenue || 7 },
    route: o.route || null,
  }
}

export interface MapMotifProps extends MapMotifOptions {
  /** Position de l'agent en % [x, y]. */
  you?: [number, number]
  /** Diamètre du cercle de rayon autour de l'agent, en px (exige `you`). */
  radius?: number
  pins?: PinProps[]
  height?: number
  style?: CSSProperties
  /** Avec un label, la carte est un groupe nommé ; sinon elle reste décorative. */
  label?: string
  className?: string
  /** Contenu ajouté par-dessus (équivalent de l'option `extra` de bundle.js). */
  children?: ReactNode
}

export function MapMotif({ you, radius, pins = [], height, style, label, className, children, ...options }: MapMotifProps) {
  const shapes = mapMotif(options)
  return (
    <div
      className={className ? `mc-map ${className}` : 'mc-map'}
      style={{ ...(height ? { height } : {}), ...style }}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {shapes.rects.map((b, k) => (
          <rect key={k} className={b.cls} x={b.x} y={b.y} width={b.width} height={b.height} rx={b.rx} />
        ))}
        {shapes.water ? <path className="m-water" d={shapes.water} /> : null}
        <path className="m-street" vectorEffect="non-scaling-stroke" strokeWidth={shapes.street.width} d={shapes.street.d} />
        {shapes.route ? <path className="m-route" vectorEffect="non-scaling-stroke" d={shapes.route} /> : null}
      </svg>
      {radius && you ? (
        <span
          style={{
            position: 'absolute', zIndex: 1, left: `${you[0]}%`, top: `${you[1]}%`, width: radius, height: radius,
            transform: 'translate(-50%,-50%)', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--signal) 8%, transparent)',
            boxShadow: 'inset 0 0 0 1.5px var(--signal-text)', opacity: 0.7,
          }}
        />
      ) : null}
      {you ? <span className="mc-you" style={{ left: `${you[0]}%`, top: `${you[1]}%` }} role="img" aria-label="You are here" /> : null}
      {pins.map((p, k) => (
        <Pin key={k} {...p} />
      ))}
      {children}
    </div>
  )
}
