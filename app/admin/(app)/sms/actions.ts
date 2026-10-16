'use server'

import { formText, type ActionState } from '@/app/admin/_lib/forms'
import { runAction } from '@/app/admin/_lib/run-action'
import { requireAdmin } from '@/lib/session'
import { markInboundHandled } from '@/modules/review'

export async function markHandledAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  return runAction(() => markInboundHandled(formText(fd, 'smsId'), admin.email), 'Marqué traité.')
}
