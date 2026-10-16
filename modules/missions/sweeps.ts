import { prisma } from '@/lib/prisma'
import { formatSlot } from '@/lib/time'
import { sendSms, smsTemplates } from '@/modules/sms'
import type { StepsData } from './checklist-rule'
import { NEEDS_FIX_DAYS, NO_SHOW_SMS_HOURS, needsFixExpired, noShowAction, reminderDue } from './mission-rule'
import { RELEASE_RESET, moveMission } from './transition'

const H = 3_600_000

async function trySms(to: string, body: string) {
  try {
    await sendSms(to, body)
  } catch (e) {
    console.error('[sweeps] SMS échoué', e)
  }
}

/** Absences (spec §4.5) : SMS à l'agent à +2 h, remise en OPEN et alerte NO_SHOW à +24 h. */
export async function runNoShowSweep(now: Date = new Date()): Promise<{ sms: number; released: number }> {
  const late = await prisma.mission.findMany({
    where: { status: 'ACCEPTED', slotAt: { lte: new Date(now.getTime() - NO_SHOW_SMS_HOURS * H) } },
    include: { agent: true, pro: true, submission: true },
  })
  let sms = 0
  let released = 0
  for (const m of late) {
    if (!m.agent) continue
    const hasCheckin = !!((m.submission?.steps ?? {}) as StepsData).checkin
    const action = noShowAction({ slotAt: m.slotAt, hasCheckin, noShowSmsAt: m.noShowSmsAt }, now)
    if (action === 'SMS') {
      const claimed = await prisma.mission.updateMany({ where: { id: m.id, noShowSmsAt: null }, data: { noShowSmsAt: now } })
      if (claimed.count === 1) {
        await trySms(m.agent.phone, smsTemplates.agentNoShowCheck({ businessName: m.pro.businessName }))
        sms++
      }
    } else if (action === 'RELEASE') {
      const agent = m.agent
      // Une mission en erreur (déjà reprise, changée entre-temps) ne bloque pas les suivantes.
      const done = await prisma.$transaction(async (tx) => {
        // Même verrou que l'enregistrement d'une étape : un check-in qui arrive en même temps gagne.
        await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${m.id}))) AS l`
        const fresh = await tx.submission.findUnique({ where: { missionId: m.id } })
        if (((fresh?.steps ?? {}) as StepsData).checkin) return false
        await moveMission(tx, m.id, 'OPEN', 'system', { data: RELEASE_RESET, reason: 'Aucun check-in 24 h après le créneau', expectFrom: 'ACCEPTED', expectAgentId: agent.id })
        await tx.fraudFlag.upsert({
          where: { missionId_agentId_type: { missionId: m.id, agentId: agent.id, type: 'NO_SHOW' } },
          create: { missionId: m.id, agentId: agent.id, type: 'NO_SHOW', detail: 'Aucun check-in 24 h après le créneau' },
          update: { resolved: false },
        })
        return true
      }).catch((e) => {
        console.error(`[sweeps] absence : mission ${m.id} ignorée`, e)
        return false
      })
      if (done) {
        await trySms(agent.phone, smsTemplates.agentMissionReleased({ businessName: m.pro.businessName }))
        released++
      }
    }
  }
  return { sms, released }
}

/** Corrections non faites sous 7 jours → REJECTED (spec §7.2). */
export async function runNeedsFixSweep(now: Date = new Date()): Promise<number> {
  const stale = await prisma.mission.findMany({
    where: { status: 'NEEDS_FIX', needsFixAt: { lte: new Date(now.getTime() - NEEDS_FIX_DAYS * 24 * H) } },
    include: { agent: true },
  })
  let n = 0
  for (const m of stale) {
    if (!m.needsFixAt || !needsFixExpired(m.needsFixAt, now)) continue
    const reason = `Fix not completed within ${NEEDS_FIX_DAYS} days.`
    try {
      // expectFrom : une correction resoumise entre la lecture et le verrou n'est pas rejetée.
      await prisma.$transaction((tx) => moveMission(tx, m.id, 'REJECTED', 'system', { data: { rejectReason: reason }, reason, expectFrom: 'NEEDS_FIX' }))
    } catch (e) {
      console.error(`[sweeps] correction expirée : mission ${m.id} ignorée`, e)
      continue
    }
    if (m.agent) await trySms(m.agent.phone, smsTemplates.agentRejected({ reason }))
    n++
  }
  return n
}

/** Rappels la veille, au pro et à l'agent. */
export async function runReminderSweep(now: Date = new Date()): Promise<number> {
  const soon = await prisma.mission.findMany({
    where: { status: 'ACCEPTED', reminderSentAt: null, slotAt: { gt: now, lte: new Date(now.getTime() + 24 * H) } },
    include: { agent: true, pro: true },
  })
  let n = 0
  for (const m of soon) {
    if (!m.agent || !reminderDue(m, now)) continue
    const claimed = await prisma.mission.updateMany({ where: { id: m.id, reminderSentAt: null }, data: { reminderSentAt: now } })
    if (claimed.count !== 1) continue
    const slot = formatSlot(m.slotAt, m.pro.timeZone)
    await trySms(m.pro.phone, smsTemplates.proReminder({ agentFirstName: m.agent.firstName, slot }))
    await trySms(m.agent.phone, smsTemplates.agentReminder({ businessName: m.pro.businessName, slot }))
    n++
  }
  return n
}
