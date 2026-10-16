import { NextResponse, type NextRequest } from 'next/server'
import { currentAgent } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { submitTask } from '@/modules/quick-tasks'
import { getStorage } from '@/modules/storage'

export async function POST(req: NextRequest) {
  const agent = await currentAgent()
  if (!agent || agent.status !== 'ACTIVE') return NextResponse.json({ ok: false, reason: 'Unauthorized' }, { status: 401 })

  const fd = await req.formData()
  const taskId = fd.get('taskId')
  const file = fd.get('screenshot')

  if (typeof taskId !== 'string' || !(file instanceof File)) {
    return NextResponse.json({ ok: false, reason: 'Missing taskId or screenshot' }, { status: 400 })
  }

  const ext = file.type === 'image/png' ? 'png' : 'jpg'
  const key = `tasks/${agent.id}/${taskId}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const storage = getStorage()
  await storage.put(key, buf)

  const result = await submitTask(prisma, taskId, agent.id, key)

  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason })

  return NextResponse.json({ ok: true })
}
