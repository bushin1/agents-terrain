import type { Pro, ProStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { US_TIME_ZONES, defaultTimeZoneForState } from '@/lib/time'
import { logAudit } from '@/modules/audit'
import { geocodeAddress } from '@/modules/geo'
import { normalizeUsPhone } from '@/modules/sms'
import { parseProsCsv } from './csv-rule'
import { STATUSES_CANCELLED_ON_LOST, canSetProStatusManually } from './pro-rule'
import { moveMission } from './transition'

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null)
const optionalCoord = z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === '' ? null : Number(v)))

// Messages en français : ce formulaire n'est utilisé que dans le back-office.
export const ProInputSchema = z.object({
  businessName: z.string().trim().min(2, 'Nom trop court').max(150),
  contactName: optionalText(100),
  phone: z.string().transform((v, ctx) => normalizeUsPhone(v) ?? (ctx.addIssue({ code: 'custom', message: 'Téléphone US invalide' }), z.NEVER)),
  address: z.string().trim().min(3, 'Adresse manquante').max(200),
  city: z.string().trim().min(2, 'Ville manquante').max(80),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, 'État à 2 lettres').transform((s) => s.toUpperCase()),
  zip: z.string().trim().regex(/^\d{5}$/, 'Code postal à 5 chiffres'),
  trade: z.string().trim().min(2, 'Métier manquant').max(80),
  timeZone: optionalText(60),
  existingPlaceId: optionalText(200),
  notes: optionalText(2000),
  lat: optionalCoord,
  lng: optionalCoord,
})

export type ProFormResult = { ok: true; pro: Pro; warning: string | null } | { ok: false; fieldErrors: Record<string, string> }
const NO_COORDS = 'Adresse introuvable : saisissez la latitude et la longitude à la main avant de créer une mission.'

async function prepare(input: Record<string, unknown>) {
  const parsed = ProInputSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message
    return { ok: false as const, fieldErrors }
  }
  const p = parsed.data
  const timeZone = p.timeZone ?? defaultTimeZoneForState(p.state)
  if (!timeZone || !US_TIME_ZONES.includes(timeZone)) return { ok: false as const, fieldErrors: { timeZone: 'Fuseau horaire inconnu' } }
  const manual = p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  const coords = manual ? { lat: p.lat!, lng: p.lng! } : await geocodeAddress(`${p.address}, ${p.city}, ${p.state} ${p.zip}`)
  const { lat: _lat, lng: _lng, ...rest } = p
  return { ok: true as const, data: { ...rest, timeZone, lat: coords?.lat ?? null, lng: coords?.lng ?? null } }
}

export async function createPro(input: Record<string, unknown>, actor: string): Promise<ProFormResult> {
  const prep = await prepare(input)
  if (!prep.ok) return prep
  const pro = await prisma.$transaction(async (tx) => {
    const created = await tx.pro.create({ data: prep.data })
    await logAudit(tx, { actor, action: 'pro.create', entity: 'Pro', entityId: created.id })
    return created
  })
  return { ok: true, pro, warning: pro.lat == null ? NO_COORDS : null }
}

export async function updatePro(proId: string, input: Record<string, unknown>, actor: string): Promise<ProFormResult> {
  const prep = await prepare(input)
  if (!prep.ok) return prep
  const pro = await prisma.$transaction(async (tx) => {
    const updated = await tx.pro.update({ where: { id: proId }, data: prep.data })
    await logAudit(tx, { actor, action: 'pro.update', entity: 'Pro', entityId: proId })
    return updated
  })
  return { ok: true, pro, warning: pro.lat == null ? NO_COORDS : null }
}

export const MAX_IMPORT_ROWS = 300

/** Import CSV : chaque ligne valide devient un pro TO_CALL ; les doublons de téléphone sont ignorés. */
export async function importPros(csv: string, actor: string): Promise<{ created: number; withoutCoords: number; errors: { line: number; message: string }[] }> {
  const { rows, errors } = parseProsCsv(csv)
  // Le géocodage se fait ligne par ligne (jusqu'à 10 s chacune) : on plafonne la taille d'un import.
  if (rows.length > MAX_IMPORT_ROWS) return { created: 0, withoutCoords: 0, errors: [{ line: 1, message: `Fichier trop long : ${MAX_IMPORT_ROWS} lignes au plus par import` }] }
  let created = 0
  let withoutCoords = 0
  const out = [...errors]
  for (const row of rows) {
    const line = row.line
    if (await prisma.pro.findFirst({ where: { phone: row.phone } })) {
      out.push({ line, message: 'Déjà présent (même téléphone)' })
      continue
    }
    const r = await createPro({ ...row, contactName: row.contactName ?? undefined }, actor)
    if (!r.ok) {
      out.push({ line, message: Object.values(r.fieldErrors).join(', ') })
      continue
    }
    created++
    if (r.warning) withoutCoords++
  }
  return { created, withoutCoords, errors: out.sort((a, b) => a.line - b.line) }
}

/** Statut posé à la main par un setter (TO_CALL ↔ AGREED, ou LOST avec motif). */
export async function setProStatus(proId: string, to: ProStatus, actor: string, reason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Pro" WHERE id = ${proId} FOR UPDATE` // même ordre de verrou que moveMission
    const pro = await tx.pro.findUniqueOrThrow({ where: { id: proId } })
    if (!canSetProStatusManually(pro.status, to)) throw new Error(`Statut refusé : ${pro.status} → ${to}`)
    if (to === 'LOST') {
      if (!reason?.trim()) throw new Error('Motif obligatoire')
      const running = await tx.mission.findMany({ where: { proId, status: { in: [...STATUSES_CANCELLED_ON_LOST] } } })
      for (const m of running) await moveMission(tx, m.id, 'CANCELLED', actor, { data: { cancelReason: 'Pro perdu' }, reason, markProLost: true })
    }
    await tx.pro.update({ where: { id: proId }, data: { status: to, lostReason: to === 'LOST' ? reason! : null } })
    await logAudit(tx, { actor, action: 'pro.status', entity: 'Pro', entityId: proId, reason, data: { to } })
  })
}

export async function listPros(filter: { status?: ProStatus; q?: string } = {}) {
  const q = filter.q?.trim()
  return prisma.pro.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(q ? { OR: [{ businessName: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })
}

export async function getPro(proId: string) {
  return prisma.pro.findUnique({
    where: { id: proId },
    include: { missions: { orderBy: { createdAt: 'desc' }, include: { agent: { select: { id: true, firstName: true, lastName: true } } } } },
  })
}
