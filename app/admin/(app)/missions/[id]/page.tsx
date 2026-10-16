import { notFound, redirect } from 'next/navigation'
import { missionHref } from '@/app/admin/_lib/format'
import { requireAdmin } from '@/lib/session'
import { getReviewDetail } from '@/modules/review'

export default async function MissionLinkPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const mission = await getReviewDetail((await params).id)
  if (!mission) notFound()
  redirect(missionHref(mission))
}
