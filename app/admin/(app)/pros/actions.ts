'use server'

import type { ProStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { actionError, formText, formValues, pickEnum, type ActionState } from '@/app/admin/_lib/forms'
import { requireAdmin } from '@/lib/session'
import { createMission, createPro, importPros, setProStatus, updatePro } from '@/modules/missions'
import { readCsvInput, type ImportState } from './csv-input'

// Statuts qu'un setter pose lui-même ; le service vérifie la transition (spec §7.3).
const MANUAL_STATUSES: readonly ProStatus[] = ['TO_CALL', 'AGREED', 'LOST']

export async function createProAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const values = formValues(fd)
  let proId: string
  try {
    const r = await createPro(values, admin.email)
    if (!r.ok) return { fieldErrors: r.fieldErrors, values }
    proId = r.pro.id
  } catch (e) {
    return { error: actionError(e), values }
  }
  revalidatePath('/admin', 'layout')
  redirect(`/admin/pros/${proId}?notice=created`)
}

export async function updateProAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const values = formValues(fd)
  const proId = formText(fd, 'proId')
  try {
    const r = await updatePro(proId, values, admin.email)
    if (!r.ok) return { fieldErrors: r.fieldErrors, values }
  } catch (e) {
    return { error: actionError(e), values }
  }
  revalidatePath('/admin', 'layout')
  redirect(`/admin/pros/${proId}?notice=updated`)
}

export async function importProsAction(_prev: ImportState, fd: FormData): Promise<ImportState> {
  const admin = await requireAdmin()
  const input = await readCsvInput(fd)
  if (!input.ok) return { error: input.error }
  try {
    const result = await importPros(input.csv, admin.email)
    revalidatePath('/admin', 'layout')
    return { result }
  } catch (e) {
    return { error: actionError(e) }
  }
}

export async function setProStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const to = pickEnum(formText(fd, 'to'), MANUAL_STATUSES)
  if (!to) return { error: 'Statut inconnu.' }
  try {
    await setProStatus(formText(fd, 'proId'), to, admin.email, formText(fd, 'reason') || undefined)
  } catch (e) {
    return { error: actionError(e) }
  }
  revalidatePath('/admin', 'layout')
  return { ok: 'Statut mis à jour.' }
}

export async function createMissionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const values = formValues(fd)
  const proId = formText(fd, 'proId')
  try {
    const r = await createMission(proId, values, admin.email)
    if (!r.ok) return { error: r.error, values }
  } catch (e) {
    return { error: actionError(e), values }
  }
  revalidatePath('/admin', 'layout')
  redirect(`/admin/pros/${proId}?notice=mission`)
}
