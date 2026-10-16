import { requireAgentIn } from '@/lib/agent-guard'
import { getSettings } from '@/modules/settings'
import { TasksView } from '@/components/agent/tasks-view'
import { prisma } from '@/lib/prisma'
import { maxTasksPerDay, checkTaskEligibility } from '@/modules/quick-tasks/task-rule'
import type { AgentLevel } from '@prisma/client'

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function TasksPage() {
  const agent = await requireAgentIn(['ACTIVE'])
  const settings = await getSettings()
  const now = new Date()
  const dayStart = startOfDay(now)

  const [todayCount, verifiedCount, totalEarned, activeTask, recentTasks, lastTask] = await Promise.all([
    prisma.quickTaskResult.count({ where: { agentId: agent.id, createdAt: { gte: dayStart } } }),
    prisma.quickTaskResult.count({ where: { agentId: agent.id, status: 'VERIFIED' } }),
    prisma.earning.aggregate({ where: { agentId: agent.id, tier: 'QUICK_TASK', status: 'PAYABLE' }, _sum: { amountCents: true } }),
    prisma.quickTaskResult.findFirst({ where: { agentId: agent.id, status: 'ASSIGNED' }, include: { target: { select: { name: true, city: true, trade: true, placeId: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.quickTaskResult.findMany({ where: { agentId: agent.id, status: { not: 'ASSIGNED' } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, status: true, createdAt: true, target: { select: { name: true, city: true } } } }),
    prisma.quickTaskResult.findFirst({ where: { agentId: agent.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
  ])

  const max = maxTasksPerDay(agent.level as AgentLevel, settings.quickTask)
  const eligibility = checkTaskEligibility({
    level: agent.level as AgentLevel,
    todayTaskCount: todayCount,
    lastTaskAt: lastTask?.createdAt ?? null,
    now,
    settings: settings.quickTask,
  })

  return (
    <TasksView
      level={agent.level}
      todayCount={todayCount}
      maxToday={max}
      verifiedCount={verifiedCount}
      pendingBalanceCents={totalEarned._sum.amountCents ?? 0}
      cashoutThresholdCents={settings.quickTask.cashoutThresholdCents}
      taskAmountCents={settings.tierAmountsCents.QUICK_TASK}
      canRequest={eligibility.ok}
      reason={eligibility.ok ? null : eligibility.reason}
      activeTask={activeTask ? {
        id: activeTask.id,
        missionId: activeTask.missionId,
        businessName: activeTask.target.name,
        city: activeTask.target.city,
        trade: activeTask.target.trade,
        reviewText: activeTask.reviewText,
        placeId: activeTask.target.placeId,
        expiresAt: activeTask.expiresAt.toISOString(),
      } : null}
      recentTasks={recentTasks.map((t) => ({
        id: t.id,
        status: t.status,
        businessName: t.target.name,
        city: t.target.city,
        createdAt: t.createdAt.toISOString(),
      }))}
    />
  )
}
