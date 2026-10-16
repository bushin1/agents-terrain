import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUser, Agent } from '@prisma/client'
import { getStorage } from '@/modules/storage'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { GET } from '@/app/api/files/[...key]/route'

const session = vi.hoisted(() => ({ agent: null as Agent | null, admin: null as AdminUser | null }))
vi.mock('@/lib/session', () => ({
  currentAgent: async () => session.agent,
  currentAdmin: async (roles: string[] = ['ADMIN', 'SETTER']) => (session.admin && roles.includes(session.admin.role) ? session.admin : null),
}))

const get = (key: string) => GET(new Request(`http://localhost/api/files/${key}`), { params: Promise.resolve({ key: key.split('/') }) })

describe('fichiers protégés', () => {
  beforeEach(async () => {
    await resetDb()
    session.agent = null
    session.admin = null
  })

  it('l’agent de la mission et l’équipe y accèdent ; personne d’autre', async () => {
    const owner = await makeAgent()
    const m = await makeMission({ agentId: owner.id, status: 'SUBMITTED' })
    const key = `missions/${m.id}/photos/abc123.jpg`
    await getStorage().put(key, Buffer.from([0xff, 0xd8, 0xff]))

    expect((await get(key)).status).toBe(404) // anonyme
    session.agent = await makeAgent()
    expect((await get(key)).status).toBe(404) // autre agent
    session.agent = owner
    const ok = await get(key)
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-type')).toBe('image/jpeg')
    expect(ok.headers.get('cache-control')).toBe('private, max-age=3600')
    session.agent = null
    session.admin = { email: 'marvin@allo-chantiers.fr', role: 'ADMIN', createdAt: new Date() }
    expect((await get(key)).status).toBe(200)
    session.admin = { email: 'setter@allo-chantiers.fr', role: 'SETTER', createdAt: new Date() }
    expect((await get(key)).status).toBe(404)
  })

  it('refuse une clé hors du dossier des missions ou mal formée', async () => {
    session.admin = { email: 'marvin@allo-chantiers.fr', role: 'ADMIN', createdAt: new Date() }
    expect((await get('other/x.jpg')).status).toBe(404)
    expect((await get('missions/../secrets.png')).status).toBe(404)
  })
})
