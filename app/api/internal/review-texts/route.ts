import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const { placeId, text, rating, sourceRef, businessName, city, state, trade } = body as Record<string, string | number | undefined>

  if (typeof placeId !== 'string' || !placeId || typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'Missing placeId or text' }, { status: 400 })
  }

  if (typeof businessName === 'string' && businessName && typeof city === 'string' && city) {
    await prisma.reviewTarget.upsert({
      where: { placeId },
      update: {},
      create: {
        placeId,
        name: businessName,
        city,
        state: typeof state === 'string' && state ? state : 'US',
        trade: typeof trade === 'string' && trade ? trade : 'general',
      },
    })
  }

  const pending = await prisma.pendingReviewText.create({
    data: {
      placeId,
      text: text.trim(),
      rating: typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : 4,
      sourceRef: typeof sourceRef === 'string' ? sourceRef : null,
    },
  })

  return NextResponse.json({ ok: true, id: pending.id })
}
