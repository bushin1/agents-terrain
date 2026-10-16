import type { Prisma } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from './defaults'

const KEY = 'app'

export async function getSettings(db: Db = prisma): Promise<Settings> {
  const row = await db.setting.findUnique({ where: { key: KEY } })
  if (!row) return structuredClone(DEFAULT_SETTINGS)
  const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(row.value as object) })
  if (parsed.success) return parsed.data
  // Valeur enregistrée devenue invalide : on le signale bruyamment plutôt que de payer des montants inattendus.
  console.error('[settings] réglages enregistrés invalides, valeurs par défaut utilisées', parsed.error.issues)
  return structuredClone(DEFAULT_SETTINGS)
}

export async function saveSettings(input: unknown, actor: string): Promise<Settings> {
  const value = SettingsSchema.parse(input)
  const json = value as unknown as Prisma.InputJsonValue
  await prisma.$transaction(async (tx) => {
    await tx.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: json }, update: { value: json } })
    await logAudit(tx, { actor, action: 'settings.update', entity: 'Setting', entityId: KEY, data: json })
  })
  return value
}

export { DEFAULT_SETTINGS, SettingsSchema, type Settings }
