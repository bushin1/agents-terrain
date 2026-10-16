'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-md px-3 py-2 text-sm ${active ? 'bg-emerald-50 font-medium text-emerald-900' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
