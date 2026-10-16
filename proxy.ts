import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

// Première barrière seulement : chaque page, route et server action revérifie avec lib/session.ts
// (requireAdmin / requireAgent), car une server action peut être appelée depuis n'importe quel chemin.
//
// /admin réservé à l'équipe, /agent et /api/agent réservés aux agents. Aucun accès base ici.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminArea = pathname.startsWith('/admin') && pathname !== '/admin/login'
  const agentArea = pathname === '/agent' || pathname.startsWith('/agent/') || pathname.startsWith('/api/agent/')
  if (!adminArea && !agentArea) return NextResponse.next()

  let kind: unknown = null
  try {
    // Cookie « __Secure- » seulement quand l'app est servie en HTTPS (AUTH_URL), pas selon NODE_ENV :
    // un `next start` local en HTTP doit rester utilisable.
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie: (process.env.AUTH_URL ?? '').startsWith('https://') })
    kind = token?.kind
  } catch {
    kind = null // jeton illisible → non connecté
  }
  if ((adminArea && kind === 'admin') || (agentArea && kind === 'agent')) return NextResponse.next()

  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = request.nextUrl.clone()
  url.pathname = adminArea ? '/admin/login' : '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/admin/:path*', '/agent', '/agent/:path*', '/api/agent/:path*'] }
