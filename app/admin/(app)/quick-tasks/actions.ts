'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/session'
import { getSettings } from '@/modules/settings'
import { verifyTask } from '@/modules/quick-tasks'
import { runAction } from '@/app/admin/_lib/run-action'

export const approveTask = runAction(async (fd: FormData) => {
  await requireAdmin()
  const taskId = String(fd.get('taskId'))
  const settings = await getSettings()
  const result = await verifyTask(prisma, taskId, true, settings)
  if (!result.ok) throw new Error(result.reason)
  revalidatePath('/admin/quick-tasks')
})

export const rejectTask = runAction(async (fd: FormData) => {
  await requireAdmin()
  const taskId = String(fd.get('taskId'))
  const settings = await getSettings()
  const result = await verifyTask(prisma, taskId, false, settings)
  if (!result.ok) throw new Error(result.reason)
  revalidatePath('/admin/quick-tasks')
})
