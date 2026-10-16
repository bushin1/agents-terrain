'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/mc/icons'

const TABS = [
  { href: '/agent/missions', icon: 'map', label: 'Missions' },
  { href: '/agent/tasks', icon: 'zap', label: 'Tasks' },
  { href: '/agent/visits', icon: 'calendar', label: 'Visits' },
  { href: '/agent/earnings', icon: 'wallet', label: 'Earnings' },
  { href: '/agent/profile', icon: 'user', label: 'Profile' },
] as const

export function TabBar() {
  const path = usePathname()
  return (
    <nav className="mc-tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="mc-tab" aria-current={path.startsWith(t.href) ? 'page' : undefined}>
          <Icon name={t.icon} className="mc-ico--lg" />
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
