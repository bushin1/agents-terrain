import { jsonError, visitResponse } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { deletePhoto } from '@/modules/missions'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  const { id, photoId } = await params
  return visitResponse(await deletePhoto(agent, id, photoId))
}
