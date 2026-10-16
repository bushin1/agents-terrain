import { jsonError, visitResponse, type IdContext } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { submitVisit } from '@/modules/missions'

export async function POST(_req: Request, { params }: IdContext) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  const { id } = await params
  return visitResponse(await submitVisit(agent, id))
}
