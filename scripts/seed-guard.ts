/** Garde-fou du jeu de démo : jamais en production, jamais ailleurs que sur une base locale. */
export function assertSeedAllowed(env: Record<string, string | undefined>): void {
  if (env.NODE_ENV === 'production') throw new Error('seed-dev refusé : NODE_ENV=production')
  let host = ''
  try {
    host = new URL(env.DATABASE_URL ?? '').hostname
  } catch {
    host = ''
  }
  if (host !== 'localhost' && host !== '127.0.0.1') throw new Error(`seed-dev refusé : base non locale (${host || 'DATABASE_URL absente'})`)
}
