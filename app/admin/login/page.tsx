import { redirect } from 'next/navigation'
import { loginErrorMessage } from '@/app/admin/_lib/forms'
import { signIn } from '@/lib/auth'
import { currentAdmin } from '@/lib/session'

export const metadata = { title: 'Connexion — back-office' }

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams
  if (!error && (await currentAdmin())) redirect('/admin')
  const message = loginErrorMessage(error)

  async function login() {
    'use server'
    await signIn('google', { redirectTo: '/admin' })
  }

  return (
    <div lang="fr" className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 text-gray-900">
      <main className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Back-office agents terrain</h1>
        <p className="mt-1 text-sm text-gray-600">Réservé à l’équipe, avec votre compte Google @allo-chantiers.fr.</p>
        {message && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{message}</p>}
        <form action={login} className="mt-6">
          <button type="submit" className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Se connecter avec Google
          </button>
        </form>
      </main>
    </div>
  )
}
