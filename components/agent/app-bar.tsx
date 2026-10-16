import Link from 'next/link'
import { Icon } from '@/components/mc/icons'

export function AppBar({ title, back, right, large }: { title: string; back?: string; right?: React.ReactNode; large?: boolean }) {
  return (
    <header className={`mc-appbar${large ? ' mc-appbar--pad' : ''}`}>
      {back && (
        <Link href={back} className="mc-iconbtn" aria-label="Back">
          <Icon name="arrow-left" />
        </Link>
      )}
      <span className="mc-appbar__title" style={large ? { font: '650 24px/1.2 var(--font-display)' } : undefined}>{title}</span>
      {right}
    </header>
  )
}
