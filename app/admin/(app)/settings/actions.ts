'use server'

import { revalidatePath } from 'next/cache'
import { actionError, formValues, type ActionState } from '@/app/admin/_lib/forms'
import { requireAdmin } from '@/lib/session'
import { SettingsSchema, saveSettings } from '@/modules/settings'
import { settingsErrors, settingsFromForm } from './settings-form-data'

export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  const values = formValues(fd)
  const read = settingsFromForm(fd)
  if (!read.ok) return { fieldErrors: read.fieldErrors, values }
  const parsed = SettingsSchema.safeParse(read.value)
  if (!parsed.success) return { fieldErrors: settingsErrors(parsed.error.issues), values }
  try {
    await saveSettings(parsed.data, admin.email)
  } catch (e) {
    return { error: actionError(e), values }
  }
  revalidatePath('/admin', 'layout')
  return { ok: 'Réglages enregistrés. Ils comptent pour les prochains gains ; les gains déjà créés ne changent pas.', values }
}
