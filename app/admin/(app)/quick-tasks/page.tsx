import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { approveTask, rejectTask } from './actions'
import { ActionForm } from '@/app/admin/_components/action-form'

export const metadata = { title: 'Quick Tasks Review' }

export default async function QuickTasksPage() {
  await requireAdmin()

  const pending = await prisma.quickTaskResult.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { createdAt: 'asc' },
    include: {
      target: { select: { name: true, city: true, state: true, placeId: true } },
      agent: { select: { firstName: true, lastName: true, level: true, id: true } },
    },
  })

  const recent = await prisma.quickTaskResult.findMany({
    where: { status: { in: ['VERIFIED', 'FAILED'] } },
    orderBy: { verifiedAt: 'desc' },
    take: 20,
    include: {
      target: { select: { name: true, city: true } },
      agent: { select: { firstName: true, lastName: true } },
    },
  })

  const agentStats = await prisma.quickTaskResult.groupBy({
    by: ['agentId'],
    where: { status: 'VERIFIED' },
    _count: true,
  })

  const removedCount = await prisma.quickTaskResult.count({ where: { survivedCheck: false } })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="text-xl font-semibold">Quick Tasks</h1>
        <div className="flex gap-4 text-sm text-gray-500">
          <span className="text-amber-600 font-medium">{pending.length} pending</span>
          <span>{agentStats.length} active agents</span>
          {removedCount > 0 && <span className="text-red-600">{removedCount} reviews removed</span>}
        </div>
      </div>

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Pending verification</h2>
          <div className="space-y-3">
            {pending.map((t) => (
              <div key={t.id} className="rounded-lg border bg-white p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{t.target.name}</p>
                    <p className="text-sm text-gray-500">{t.target.city}, {t.target.state}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Agent: {t.agent.firstName} {t.agent.lastName} ({t.agent.level})
                    </p>
                  </div>
                  <div className="text-xs text-gray-400">{t.createdAt.toLocaleDateString()}</div>
                </div>
                <div className="mt-3 rounded bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Review text:</p>
                  <p className="text-sm italic">{t.reviewText}</p>
                </div>
                {t.screenshotKey && (
                  <p className="text-xs text-gray-400 mt-2">Screenshot: {t.screenshotKey}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <ActionForm action={approveTask}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <button type="submit" className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-white">Approve</button>
                  </ActionForm>
                  <ActionForm action={rejectTask}>
                    <input type="hidden" name="taskId" value={t.id} />
                    <button type="submit" className="rounded bg-red-600 px-3 py-1.5 text-sm text-white">Reject</button>
                  </ActionForm>
                  <a
                    href={`https://search.google.com/local/writereview?placeid=${t.target.placeId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border px-3 py-1.5 text-sm text-gray-600"
                  >
                    Check on Maps
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400 mb-8">
          No tasks pending verification
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Recently reviewed</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Business</th>
                <th className="pb-2">Agent</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2">{t.target.name}, {t.target.city}</td>
                  <td className="py-2">{t.agent.firstName} {t.agent.lastName}</td>
                  <td className="py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="py-2 text-gray-500">{t.verifiedAt?.toLocaleDateString() ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
