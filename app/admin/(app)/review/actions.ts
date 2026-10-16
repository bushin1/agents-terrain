'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { actionError, formText, type ActionState } from '@/app/admin/_lib/forms'
import { runAction } from '@/app/admin/_lib/run-action'
import { requireAdmin } from '@/lib/session'
import { reject, requestFix, resolveFlag, validate } from '@/modules/review'

export async function validateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  let earnedCents: number
  try {
    const r = await validate(formText(fd, 'missionId'), admin.email, { confirmFlags: fd.get('confirmFlags') === 'on' })
    if (!r.ok) return { error: r.error, needsConfirmation: r.needsConfirmation }
    earnedCents = r.earnedCents
  } catch (e) {
    return { error: actionError(e) }
  }
  revalidatePath('/admin', 'layout')
  redirect(`/admin/review?done=validated&amount=${earnedCents}`)
}

export async function requestFixAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  const message = formText(fd, 'message')
  if (!message) return { error: 'Message obligatoire.' }
  try {
    await requestFix(formText(fd, 'missionId'), admin.email, message)
  } catch (e) {
    return { error: actionError(e) }
  }
  revalidatePath('/admin', 'layout')
  redirect('/admin/review?done=fix')
}

export async function rejectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  const reason = formText(fd, 'reason')
  if (!reason) return { error: 'Motif obligatoire.' }
  try {
    await reject(formText(fd, 'missionId'), admin.email, reason, fd.get('markProLost') === 'on')
  } catch (e) {
    return { error: actionError(e) }
  }
  revalidatePath('/admin', 'layout')
  redirect('/admin/review?done=rejected')
}

export async function resolveFlagAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  return runAction(() => resolveFlag(formText(fd, 'flagId'), admin.email), 'Alerte marquée résolue.')
}
