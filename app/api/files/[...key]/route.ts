import { prisma } from '@/lib/prisma'
import { currentAdmin, currentAgent } from '@/lib/session'
import { assertSafeKey, getStorage } from '@/modules/storage'

const notFound = () => new Response('Not found', { status: 404 })

// Photos et signatures : l'équipe voit tout, un agent ne voit que les fichiers de SES missions.
// 404 (et non 403) dans tous les cas de refus : on ne confirme pas l'existence d'un fichier.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params
  const key = parts.join('/')
  try {
    assertSafeKey(key)
  } catch {
    return notFound()
  }
  const [root, missionId] = parts
  if (root !== 'missions' || !missionId) return notFound()

  // Côté équipe, seuls les ADMIN voient les photos et signatures (les SETTER gèrent pros et missions, spec §5).
  if (!(await currentAdmin(['ADMIN']))) {
    const agent = await currentAgent()
    const mission = agent ? await prisma.mission.findUnique({ where: { id: missionId }, select: { agentId: true } }) : null
    if (!agent || mission?.agentId !== agent.id) return notFound()
  }

  const file = await getStorage().get(key)
  if (!file) return notFound()
  return new Response(new Uint8Array(file.body), {
    headers: {
      'content-type': file.contentType,
      'cache-control': 'private, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  })
}
