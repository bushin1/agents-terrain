import Link from 'next/link'

export const inputClass =
  'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600'
export const buttonLinkClass = 'inline-block rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50'
export const linkClass = 'text-emerald-800 underline-offset-2 hover:underline'
export const tdClass = 'px-3 py-2 align-top'

export function PageHeader({ title, back, children }: { title: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      {back && <Link href={back.href} className="text-sm text-gray-500 hover:underline">← {back.label}</Link>}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {children && <div className="flex flex-wrap gap-2">{children}</div>}
      </div>
    </header>
  )
}

const BANNER_TONES = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

export function Banner({ tone = 'info', children }: { tone?: keyof typeof BANNER_TONES; children: React.ReactNode }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-md border px-4 py-3 text-sm ${BANNER_TONES[tone]}`}>{children}</div>
}

export function Card({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

const BADGE_TONES = { gray: 'bg-gray-100 text-gray-700', green: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800' }

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE_TONES; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}>{children}</span>
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>
}

/** Champ de formulaire : libellé, contrôle, aide et erreur. */
export function Field({ label, help, error, children }: { label: string; help?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-800">{label}</span>
      <span className="mt-1 block">{children}</span>
      {help && <span className="mt-1 block text-xs text-gray-500">{help}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  )
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>{head.map((h, i) => <th key={i} className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

/** Filtre par statut sous forme de pastilles (paramètre ?status=). */
export function FilterLinks<T extends string>({ base, hash = '', current, options, labels }: { base: string; hash?: string; current?: T; options: readonly T[]; labels: Record<T, string> }) {
  const cls = (active: boolean) =>
    active ? 'rounded-full bg-gray-900 px-3 py-1 text-white' : 'rounded-full bg-white px-3 py-1 text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50'
  return (
    <nav className="mb-3 flex flex-wrap gap-2 text-sm">
      <Link href={`${base}${hash}`} className={cls(!current)}>Tous</Link>
      {options.map((o) => <Link key={o} href={`${base}?status=${o}${hash}`} className={cls(current === o)}>{labels[o]}</Link>)}
    </nav>
  )
}
