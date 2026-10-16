import { jsonError, visitResponse, type IdContext } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { saveStep } from '@/modules/missions'

export async function POST(req: Request, { params }: IdContext) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }
  if (!body || typeof body !== 'object' || typeof (body as { step?: unknown }).step !== 'string') return jsonError(400, 'Missing step')
  const { step, data } = body as { step: string; data?: unknown }
  const { id } = await params
  return visitResponse(await saveStep(agent, id, step, data))
}
