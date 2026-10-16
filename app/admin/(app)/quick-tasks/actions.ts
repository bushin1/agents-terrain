'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { getSettings } from '@/modules/settings'
import { verifyTask } from '@/modules/quick-tasks'
import { runAction } from '@/app/admin/_lib/run-action'
import type { ActionState } from '@/app/admin/_lib/forms'

export async function approveTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const taskId = String(fd.get('taskId'))
  const settings = await getSettings()
  return runAction(async () => {
    const result = await verifyTask(prisma, taskId, true, settings)
    if (!result.ok) throw new Error(result.reason)
  }, 'Task approved.')
}

export async function rejectTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin()
  const taskId = String(fd.get('taskId'))
  const settings = await getSettings()
  return runAction(async () => {
    const result = await verifyTask(prisma, taskId, false, settings)
    if (!result.ok) throw new Error(result.reason)
  }, 'Task rejected.')
}
