import { headers } from 'next/headers'

/** Adresse IP du visiteur derrière Traefik (première valeur de X-Forwarded-For), ou null. */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  const first = (h.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return first || h.get('x-real-ip') || null
}
