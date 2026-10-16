import { redirect } from 'next/navigation'
import { NavLinks } from '@/app/admin/_components/nav-links'
import { signOut } from '@/lib/auth'
import { currentAdmin } from '@/lib/session'

export const metadata = { title: 'Back-office' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin()
  if (!admin) redirect('/admin/login?error=forbidden')

  async function logout() {
    'use server'
    await signOut({ redirectTo: '/admin/login' })
  }

  const items = [
    { href: '/admin', label: 'Tableau de bord' },
    { href: '/admin/pros', label: 'Pros' },
    { href: '/admin/missions', label: 'Missions' },
    { href: '/admin/review', label: 'Validation' },
    { href: '/admin/agents', label: 'Agents' },
    { href: '/admin/sms', label: 'SMS reçus' },
    ...(admin.role === 'ADMIN' ? [{ href: '/admin/settings', label: 'Réglages' }] : []),
  ]

  return (
    <div lang="fr" className="flex min-h-dvh bg-gray-50 text-gray-900">
      <aside className="sticky top-0 flex h-dvh w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <p className="px-5 py-5 text-sm font-semibold">Back-office agents</p>
        <NavLinks items={items} />
        <div className="mt-auto border-t border-gray-200 p-4 text-xs text-gray-600">
          <p className="truncate" title={admin.email}>{admin.email}</p>
          <p className="mt-0.5">{admin.role === 'ADMIN' ? 'Admin' : 'Setter'}</p>
          <form action={logout} className="mt-2">
            <button type="submit" className="text-emerald-800 underline">Se déconnecter</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  )
}
