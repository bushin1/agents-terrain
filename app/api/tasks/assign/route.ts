import { NextRequest, NextResponse } from 'next/server'
import { currentAgent } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { getSettings } from '@/modules/settings'
import { assignTask } from '@/modules/quick-tasks'

export async function POST(req: NextRequest) {
  const agent = await currentAgent()
  if (!agent || agent.status !== 'ACTIVE') return NextResponse.json({ ok: false, reason: 'Unauthorized' }, { status: 401 })

  const settings = await getSettings()
  const result = await assignTask(prisma, agent.id, settings)

  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || null
  await prisma.mission.update({
    where: { id: result.task.missionId },
    data: { charteAcceptedAt: new Date(), charteAcceptedIp: ip },
  })

  return NextResponse.json({
    ok: true,
    task: {
      id: result.task.id,
      missionId: result.task.missionId,
      businessName: result.task.businessName,
      city: result.task.city,
      trade: result.task.trade,
      reviewText: result.task.reviewText,
      placeId: result.task.reviewUrl.split('placeid=')[1],
      expiresAt: result.task.expiresAt.toISOString(),
    },
  })
}
