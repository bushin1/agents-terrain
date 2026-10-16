'use server'

import { formText, type ActionState } from '@/app/admin/_lib/forms'
import { runAction } from '@/app/admin/_lib/run-action'
import { requireAdmin } from '@/lib/session'
import { refuseAgent, unlockAgent } from '@/modules/academy'
import { reactivateAgent, suspendAgent } from '@/modules/agents'
import { voidEarning } from '@/modules/ledger'

export async function suspendAgentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  return runAction(() => suspendAgent(formText(fd, 'agentId'), admin.email, formText(fd, 'reason')), 'Agent suspendu ; ses missions acceptées sont remises en ligne.')
}

export async function reactivateAgentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  return runAction(() => reactivateAgent(formText(fd, 'agentId'), admin.email), 'Agent réactivé.')
}

export async function unlockAgentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  return runAction(() => unlockAgent(formText(fd, 'agentId'), admin.email), 'Agent débloqué : il peut repasser le quiz.')
}

export async function refuseAgentAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  const reason = formText(fd, 'reason')
  if (!reason) return { error: 'Motif obligatoire.' }
  return runAction(() => refuseAgent(formText(fd, 'agentId'), admin.email, reason), 'Candidature refusée.')
}

export async function voidEarningAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await requireAdmin(['ADMIN'])
  return runAction(() => voidEarning(formText(fd, 'earningId'), formText(fd, 'reason'), admin.email), 'Gain annulé.')
}
