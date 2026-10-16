import type { CSSProperties } from 'react'

// Cadre hachuré « [Photo] » en attendant de vraies photos d'agents : la légende est le brief de prise de vue.
// Port de MapCrew.photo. Jamais de photo de stock ou générée à la place.
export function PhotoPlaceholder({ title, brief, className, style }: { title: string; brief: string; className?: string; style?: CSSProperties }) {
  return (
    <figure className={className ? `mc-photo ${className}` : 'mc-photo'} style={style}>
      <figcaption>
        <b>{`[Photo] ${title}`}</b>
        {brief}
      </figcaption>
    </figure>
  )
}
