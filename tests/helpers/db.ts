import { prisma } from '@/lib/prisma'

// Vide toutes les tables de la base de test (sauf l'historique des migrations).
// Garde-fou : refuse de tourner ailleurs que sur une base dont le nom finit par « _test ».
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? ''
  if (!/_test(\?.*)?$/.test(url)) throw new Error(`resetDb refusé : ${url || '(DATABASE_URL vide)'} n'est pas une base de test`)
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (rows.length === 0) return
  const list = rows.map((r) => `"${r.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`)
}
