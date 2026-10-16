'use server'

import { dollarsToCents, formatUsd } from '@/app/admin/_lib/format'
import { formText, type ActionState } from '@/app/admin/_lib/forms'
import { runAction } from '@/app/admin/_lib/run-action'
import { requireAdmin } from '@/lib/session'
import { cancelMission, rescheduleMission, setUrgencyBonus, widenMission } from '@/modules/missions'

export async function widenMissionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const miles = Number(formText(fd, 'miles'))
  return runAction(() => widenMission(formText(fd, 'missionId'), miles, admin.email), `Rayon de diffusion élargi à ${miles} miles.`)
}

export async function urgencyBonusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const cents = dollarsToCents(formText(fd, 'dollars'))
  if (cents == null) return { error: 'Montant invalide (ex. 15 ou 15.50).' }
  return runAction(() => setUrgencyBonus(formText(fd, 'missionId'), cents, admin.email), `Bonus urgence : ${formatUsd(cents)}.`)
}

export async function rescheduleMissionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  return runAction(async () => {
    const r = await rescheduleMission(formText(fd, 'missionId'), formText(fd, 'slotLocal'), admin.email)
    if (!r.ok) throw new Error(r.error)
  }, 'Mission replanifiée et republiée.')
}

export async function cancelMissionAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin()
  const markProLost = fd.get('markProLost') === 'on'
  return runAction(() => cancelMission(formText(fd, 'missionId'), admin.email, formText(fd, 'reason'), markProLost), 'Mission annulée.')
}
