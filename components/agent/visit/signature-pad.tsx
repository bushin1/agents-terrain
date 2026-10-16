'use client'
import { useEffect, useRef } from 'react'

/** Zone de signature au doigt. Renvoie un PNG (data URL) après chaque trait, ou null après « Clear ». */
export function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const inked = useRef(false)

  useEffect(() => {
    const c = ref.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = getComputedStyle(c).getPropertyValue('--ink').trim() || '#17201c'
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const ctx = () => ref.current!.getContext('2d')!

  return (
    <div className="mc-stack" style={{ gap: 8 }}>
      <canvas
        ref={ref}
        role="img"
        aria-label="Signature area: the owner signs here with a finger"
        style={{ width: '100%', height: 180, touchAction: 'none', background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drawing.current = true
          const p = point(e)
          ctx().beginPath()
          ctx().moveTo(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const p = point(e)
          ctx().lineTo(p.x, p.y)
          ctx().stroke()
          inked.current = true
        }}
        onPointerUp={() => {
          drawing.current = false
          if (inked.current) onChange(ref.current!.toDataURL('image/png'))
        }}
      />
      <button
        type="button"
        className="mc-btn mc-btn--ghost mc-btn--sm"
        style={{ alignSelf: 'flex-start', padding: 0 }}
        onClick={() => {
          const c = ref.current!
          ctx().clearRect(0, 0, c.width, c.height)
          inked.current = false
          onChange(null)
        }}
      >
        Clear signature
      </button>
    </div>
  )
}
