import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { normalizeUsPhone, parseInbound } from '@/modules/sms'
import { refreshFraudFlags } from './flags'

export const REPLY_WINDOW_DAYS = 7

/**
 * Réponse d'un pro au SMS après visite (spec §4.6, §9.2). Une note 1–5 ou « NO » est rattachée à sa
 * dernière visite sans réponse (7 jours au plus) ; tout le reste va dans « SMS reçus ».
 */
export async function handleInboundSms(
  fromRaw: string,
  body: string,
  now: Date = new Date(),
  messageSid: string | null = null,
): Promise<{ matched: boolean; missionId: string | null; duplicate?: true }> {
  if (messageSid && (await prisma.inboundSms.findUnique({ where: { messageSid } }))) return { matched: false, missionId: null, duplicate: true }
  const from = normalizeUsPhone(fromRaw) ?? fromRaw
  const reply = parseInbound(body)
  const since = new Date(now.getTime() - REPLY_WINDOW_DAYS * 86_400_000)
  const awaiting =
    reply.kind === 'OTHER'
      ? null
      : await prisma.mission.findFirst({
          where: { pro: { phone: from }, postVisitSmsAt: { gte: since }, proRating: null, proDenied: false },
          orderBy: { postVisitSmsAt: 'desc' },
        })

  if (awaiting) {
    const data = reply.kind === 'RATING' ? { proRating: reply.value } : { proDenied: true }
    // Mise à jour conditionnelle : deux réponses rapprochées ne s'écrasent pas.
    const done = await prisma.$transaction(async (tx) => {
      const res = await tx.mission.updateMany({ where: { id: awaiting.id, proRating: null, proDenied: false }, data })
      if (res.count !== 1) return false
      await tx.inboundSms.create({ data: { fromPhone: from, body, missionId: awaiting.id, handled: true, messageSid } })
      await logAudit(tx, { actor: 'system', action: 'mission.pro_reply', entity: 'Mission', entityId: awaiting.id, data: { reply: body.trim().slice(0, 20) } })
      // Dans la transaction : une réponse « NO » ou une note basse a toujours son alerte avant toute validation.
      await refreshFraudFlags(awaiting.id, tx)
      return true
    })
    if (done) return { matched: true, missionId: awaiting.id }
  }

  const latest = await prisma.mission.findFirst({ where: { pro: { phone: from } }, orderBy: { createdAt: 'desc' }, select: { id: true } })
  await prisma.inboundSms.create({ data: { fromPhone: from, body, missionId: latest?.id ?? null, handled: false, messageSid } })
  return { matched: false, missionId: null }
}

export async function listInbound(filter: { handled?: boolean } = {}) {
  return prisma.inboundSms.findMany({
    where: filter.handled === undefined ? {} : { handled: filter.handled },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

export async function markInboundHandled(id: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.inboundSms.update({ where: { id }, data: { handled: true } })
    await logAudit(tx, { actor, action: 'sms.handled', entity: 'InboundSms', entityId: id })
  })
}
