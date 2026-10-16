'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { runAction } from '@/app/admin/_lib/run-action'

export const createTarget = runAction(async (fd: FormData) => {
  await requireAdmin()
  const data = {
    placeId: String(fd.get('placeId')).trim(),
    name: String(fd.get('name')).trim(),
    city: String(fd.get('city')).trim(),
    state: String(fd.get('state')).trim().toUpperCase(),
    trade: String(fd.get('trade')).trim(),
    tier: (fd.get('tier') as 'SACRIFICIAL' | 'STANDARD' | 'PREMIUM') ?? 'SACRIFICIAL',
    maxPerDay: Number(fd.get('maxPerDay')) || 1,
    maxTotal: Number(fd.get('maxTotal')) || 20,
  }
  if (!data.placeId || !data.name || !data.city || !data.state) throw new Error('Missing required fields')
  await prisma.reviewTarget.create({ data })
  revalidatePath('/admin/targets')
})

export const toggleTarget = runAction(async (fd: FormData) => {
  await requireAdmin()
  const id = String(fd.get('id'))
  const target = await prisma.reviewTarget.findUniqueOrThrow({ where: { id } })
  await prisma.reviewTarget.update({ where: { id }, data: { active: !target.active } })
  revalidatePath('/admin/targets')
})

export const updateTargetTier = runAction(async (fd: FormData) => {
  await requireAdmin()
  const id = String(fd.get('id'))
  const tier = String(fd.get('tier')) as 'SACRIFICIAL' | 'STANDARD' | 'PREMIUM'
  await prisma.reviewTarget.update({ where: { id }, data: { tier } })
  revalidatePath('/admin/targets')
})

export const deleteTarget = runAction(async (fd: FormData) => {
  await requireAdmin()
  const id = String(fd.get('id'))
  const hasResults = await prisma.quickTaskResult.count({ where: { targetId: id } })
  if (hasResults > 0) throw new Error('Cannot delete: target has task results')
  await prisma.reviewTarget.delete({ where: { id } })
  revalidatePath('/admin/targets')
})
