import type { AuditLog, ProStatus } from '@prisma/client'
import { formatParis } from '@/app/admin/_lib/format'
import { AUDIT_LABELS, PRO_STATUS_LABELS } from '@/app/admin/_lib/labels'

/** Journal des actions (AuditLog), la plus récente en premier. */
export function AuditList({ entries }: { entries: AuditLog[] }) {
  if (entries.length === 0) return <p className="text-sm text-gray-500">Aucune action enregistrée.</p>
  return (
    <ol className="space-y-2 text-sm">
      {entries.map((e) => {
        const to = (e.data as Record<string, unknown> | null)?.to
        return (
          <li key={e.id} className="border-l-2 border-gray-200 pl-3">
            <p className="font-medium">
              {AUDIT_LABELS[e.action] ?? e.action}
              {typeof to === 'string' && ` → ${PRO_STATUS_LABELS[to as ProStatus] ?? to}`}
            </p>
            <p className="text-xs text-gray-500">{formatParis(e.createdAt)} · {e.actor}</p>
            {e.reason && <p className="text-xs text-gray-700">Motif : {e.reason}</p>}
          </li>
        )
      })}
    </ol>
  )
}
