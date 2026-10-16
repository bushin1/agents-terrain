import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { canTransitionAgent } from '@/modules/agents/agent-rule'
import { CONTRACT_VERSION } from './contract-text'

export { CONTRACT_IS_DRAFT, CONTRACT_SECTIONS, CONTRACT_VERSION } from './contract-text'

/**
 * Signature en click-wrap avec le nom légal tapé (maquette « Get paid setup »).
 * Phase 1 : CERTIFIED → ACTIVE ; la phase 2 exigera aussi Stripe payouts_enabled.
 */
export async function signContract(
  agentId: string,
  sig: { ip: string; signedName: string },
  now: Date = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const signedName = sig.signedName.trim().replace(/\s+/g, ' ')
  if (signedName.length < 3 || signedName.length > 120) return { ok: false, error: 'Type your full legal name to sign.' }
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    if (agent.status !== 'CERTIFIED' || !canTransitionAgent(agent.status, 'ACTIVE')) {
      return { ok: false, error: 'Finish your training before signing the agreement.' }
    }
    await tx.agent.update({
      where: { id: agentId },
      data: { status: 'ACTIVE', contractVersion: CONTRACT_VERSION, contractSignedAt: now, contractIp: sig.ip, contractSignedName: signedName },
    })
    await logAudit(tx, { actor: `agent:${agentId}`, action: 'agent.contract_signed', entity: 'Agent', entityId: agentId, data: { version: CONTRACT_VERSION } })
    return { ok: true }
  })
}
