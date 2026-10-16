import { createHash, timingSafeEqual } from 'node:crypto'
import { runNeedsFixSweep, runNoShowSweep, runReminderSweep } from '@/modules/missions'

// Appelées par le cron du VPS (voir docs/runbook.md), toutes les 15 minutes :
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://<domaine>/api/cron/no-show
const JOBS: Record<string, () => Promise<unknown>> = {
  'no-show': () => runNoShowSweep(),
  'needs-fix': () => runNeedsFixSweep(),
  reminders: () => runReminderSweep(),
}

function secretOk(received: string | null): boolean {
  const expected = process.env.CRON_SECRET ?? ''
  if (expected.length < 32 || !received) return false // fermé tant que le secret n'est pas configuré
  const a = createHash('sha256').update(received).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!secretOk(req.headers.get('x-cron-secret'))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { job } = await params
  const run = Object.hasOwn(JOBS, job) ? JOBS[job] : undefined
  if (!run) return Response.json({ error: 'Unknown job' }, { status: 404 })
  return Response.json({ job, result: await run() })
}
