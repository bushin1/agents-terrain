'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { runAction } from '@/app/admin/_lib/run-action'
import type { ActionState } from '@/app/admin/_lib/forms'

export async function createTarget(_prev: ActionState, fd: FormData): Promise<ActionState> {
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
  return runAction(() => prisma.reviewTarget.create({ data }), 'Target created.')
}

export async function toggleTarget(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const id = String(fd.get('id'))
  return runAction(async () => {
    const target = await prisma.reviewTarget.findUniqueOrThrow({ where: { id } })
    await prisma.reviewTarget.update({ where: { id }, data: { active: !target.active } })
  }, 'Target toggled.')
}

export async function updateTargetTier(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const id = String(fd.get('id'))
  const tier = String(fd.get('tier')) as 'SACRIFICIAL' | 'STANDARD' | 'PREMIUM'
  return runAction(() => prisma.reviewTarget.update({ where: { id }, data: { tier } }), 'Tier updated.')
}

export async function deleteTarget(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const id = String(fd.get('id'))
  return runAction(async () => {
    const hasResults = await prisma.quickTaskResult.count({ where: { targetId: id } })
    if (hasResults > 0) throw new Error('Cannot delete: target has task results')
    await prisma.reviewTarget.delete({ where: { id } })
  }, 'Target deleted.')
}
