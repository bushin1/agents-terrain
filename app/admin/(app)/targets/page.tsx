import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-access'
import { createTarget, toggleTarget, updateTargetTier, deleteTarget } from './actions'
import { ActionForm } from '@/app/admin/_components/action-form'

export const metadata = { title: 'Review Targets' }

export default async function TargetsPage() {
  await requireAdmin()

  const targets = await prisma.reviewTarget.findMany({
    orderBy: [{ active: 'desc' }, { tier: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { results: true } } },
  })

  const stats = await prisma.quickTaskResult.groupBy({
    by: ['status'],
    _count: true,
  })
  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="text-xl font-semibold">Review Targets</h1>
        <div className="flex gap-4 text-sm text-gray-500">
          <span>Assigned: {statMap.ASSIGNED ?? 0}</span>
          <span>Submitted: {statMap.SUBMITTED ?? 0}</span>
          <span className="text-emerald-700 font-medium">Verified: {statMap.VERIFIED ?? 0}</span>
          <span className="text-red-600">Failed: {statMap.FAILED ?? 0}</span>
        </div>
      </div>

      <details className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <summary className="cursor-pointer font-medium text-sm">Add target</summary>
        <ActionForm action={createTarget} className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm">
            Place ID <input name="placeId" required className="mt-1 block w-full rounded border px-3 py-2 text-sm" placeholder="ChIJ..." />
          </label>
          <label className="text-sm">
            Business name <input name="name" required className="mt-1 block w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            City <input name="city" required className="mt-1 block w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            State <input name="state" required maxLength={2} className="mt-1 block w-full rounded border px-3 py-2 text-sm" placeholder="TX" />
          </label>
          <label className="text-sm">
            Trade <input name="trade" required className="mt-1 block w-full rounded border px-3 py-2 text-sm" placeholder="fencing" />
          </label>
          <label className="text-sm">
            Tier
            <select name="tier" className="mt-1 block w-full rounded border px-3 py-2 text-sm">
              <option value="SACRIFICIAL">Sacrificial</option>
              <option value="STANDARD">Standard</option>
              <option value="PREMIUM">Premium</option>
            </select>
          </label>
          <label className="text-sm">
            Max/day <input name="maxPerDay" type="number" defaultValue={1} min={1} className="mt-1 block w-full rounded border px-3 py-2 text-sm" />
          </label>
          <label className="text-sm">
            Max total <input name="maxTotal" type="number" defaultValue={20} min={1} className="mt-1 block w-full rounded border px-3 py-2 text-sm" />
          </label>
          <div className="col-span-2">
            <button type="submit" className="rounded bg-emerald-700 px-4 py-2 text-sm text-white">Add</button>
          </div>
        </ActionForm>
      </details>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">Name</th>
            <th className="pb-2">City</th>
            <th className="pb-2">Tier</th>
            <th className="pb-2 text-center">Reviews</th>
            <th className="pb-2 text-center">Max</th>
            <th className="pb-2 text-center">Active</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {targets.map((t) => (
            <tr key={t.id} className={`border-b ${t.active ? '' : 'opacity-50'}`}>
              <td className="py-2 font-medium">{t.name}</td>
              <td className="py-2">{t.city}, {t.state}</td>
              <td className="py-2">
                <ActionForm action={updateTargetTier} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <select name="tier" defaultValue={t.tier} onChange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()} className="rounded border px-2 py-1 text-xs">
                    <option value="SACRIFICIAL">Sacrificial</option>
                    <option value="STANDARD">Standard</option>
                    <option value="PREMIUM">Premium</option>
                  </select>
                </ActionForm>
              </td>
              <td className="py-2 text-center">{t.reviewCount}</td>
              <td className="py-2 text-center">{t.maxTotal}</td>
              <td className="py-2 text-center">
                <ActionForm action={toggleTarget} className="inline">
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className={`rounded px-2 py-1 text-xs ${t.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                    {t.active ? 'ON' : 'OFF'}
                  </button>
                </ActionForm>
              </td>
              <td className="py-2 text-right">
                {t._count.results === 0 && (
                  <ActionForm action={deleteTarget} className="inline">
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="text-xs text-red-500 hover:underline">Delete</button>
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {targets.length === 0 && <p className="mt-8 text-center text-gray-400">No targets yet. Add one above.</p>}
    </div>
  )
}
