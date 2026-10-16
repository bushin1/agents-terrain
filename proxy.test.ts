import { encode } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { proxy } from './proxy'

const COOKIE = 'authjs.session-token' // nom du cookie hors HTTPS (dev, tests)

async function request(path: string, token?: Record<string, unknown>) {
  const headers = new Headers()
  if (token) {
    const jwt = await encode({ token, secret: process.env.AUTH_SECRET!, salt: COOKIE })
    headers.set('cookie', `${COOKIE}=${jwt}`)
  }
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers })
}

describe('proxy', () => {
  it('redirige un visiteur de /agent vers /login', async () => {
    const res = await proxy(await request('/agent/missions'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login')
  })
  it('laisse passer un agent connecté', async () => {
    const res = await proxy(await request('/agent/missions', { kind: 'agent', agentId: 'a1' }))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
  it('renvoie un agent qui tente /admin vers la connexion admin', async () => {
    const res = await proxy(await request('/admin/review', { kind: 'agent', agentId: 'a1' }))
    expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login')
  })
  it('laisse passer un admin sur /admin, mais pas sur /agent', async () => {
    const admin = { kind: 'admin', email: 'marvin@allo-chantiers.fr' }
    expect((await proxy(await request('/admin', admin))).headers.get('x-middleware-next')).toBe('1')
    expect((await proxy(await request('/agent', admin))).status).toBe(307)
  })
  it('répond 401 en JSON sur l’API agent sans session', async () => {
    const res = await proxy(await request('/api/agent/missions/m1/steps'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })
  it('la page de connexion admin reste publique', async () => {
    expect((await proxy(await request('/admin/login'))).headers.get('x-middleware-next')).toBe('1')
  })
})
