import { execFileSync } from 'node:child_process'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
process.env.DATABASE_URL = process.env.DATABASE_URL_E2E // avant tout import du client Prisma
process.env.TWILIO_ACCOUNT_SID = '' // aucun SMS réel depuis le processus de test

// Le chargeur de Playwright ne résout pas l'alias « @/ » dans les modules importés transitivement (Node 22.23 + Playwright 1.64) :
// le code du service (Prisma, otp-rule, review) s'exécute donc dans un processus tsx, qui lit tsconfig.json.
function runTs<T>(code: string, args: unknown = null): T {
  const out = execFileSync('npx', ['tsx', '-e', code], {
    env: { ...process.env, E2E_ARGS: JSON.stringify(args) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  return JSON.parse(out.trim().split('\n').pop()!) as T
}

export const AGENT_PHONE = '+16175550100'

/** Base e2e vide, puis un agent ACTIVE à Boston et une mission ouverte dans 3 jours chez un pro voisin. */
export function seed(): Promise<{ missionId: string }> {
  return Promise.resolve(runTs<{ missionId: string }>(`
    import { prisma } from '@/lib/prisma'
    ;(async () => {
      const rows = await prisma.$queryRaw<{ tablename: string }[]>\`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'\`
      if (rows.length) await prisma.$executeRawUnsafe(\`TRUNCATE \${rows.map((r) => \`"\${r.tablename}"\`).join(', ')} RESTART IDENTITY CASCADE\`)
      await prisma.agent.create({
        data: {
          firstName: 'Maya', lastName: 'Thompson-Okafor', email: 'maya.e2e@example.com', phone: '${AGENT_PHONE}', birthDate: new Date('2004-05-01'),
          zip: '02116', lat: 42.3496, lng: -71.0746, radiusMiles: 25, hasCar: true, availability: ['mon-am'], status: 'ACTIVE',
          phoneVerifiedAt: new Date(), contractVersion: 'e2e', contractSignedAt: new Date(), contractSignedName: 'Maya Thompson-Okafor',
        },
      })
      const pro = await prisma.pro.create({
        data: {
          businessName: 'Delgado Concrete & Masonry Restoration Services LLC', contactName: 'Frank Delgado', phone: '+16175550142',
          address: '120 Tremont Street', city: 'Boston', state: 'MA', zip: '02108', lat: 42.3564, lng: -71.0621,
          timeZone: 'America/New_York', trade: 'Concrete contractor', status: 'MISSION_OPEN',
        },
      })
      const mission = await prisma.mission.create({
        data: { proId: pro.id, slotAt: new Date(Date.now() + 3 * 86_400_000), suggestedCategory: 'Concrete contractor', instructions: 'Owner has 3 trucks' },
      })
      console.log(JSON.stringify({ missionId: mission.id }))
      await prisma.$disconnect()
    })()
  `))
}

/** Remplace le dernier code émis pour le numéro par un code connu (le SMS n'est pas lisible depuis le test). */
export async function forceLatestOtp(phone: string, code: string) {
  runTs(
    `
    import { prisma } from '@/lib/prisma'
    import { hashOtp } from '@/modules/recruitment/otp-rule'
    ;(async () => {
      const { phone, code } = JSON.parse(process.env.E2E_ARGS!)
      const otp = await prisma.otpCode.findFirstOrThrow({ where: { phone }, orderBy: { createdAt: 'desc' } })
      await prisma.otpCode.update({ where: { id: otp.id }, data: { codeHash: hashOtp(code, phone, process.env.AUTH_SECRET!) } })
      console.log('null')
      await prisma.$disconnect()
    })()
  `,
    { phone, code },
  )
}

export async function validateAsTeam(missionId: string) {
  const r = runTs<{ ok: boolean; error?: string }>(
    `
    import { prisma } from '@/lib/prisma'
    import { validate } from '@/modules/review'
    ;(async () => {
      const r = await validate(JSON.parse(process.env.E2E_ARGS!), 'e2e@allo-chantiers.fr', { confirmFlags: true })
      console.log(JSON.stringify(r))
      await prisma.$disconnect()
    })()
  `,
    missionId,
  )
  if (!r.ok) throw new Error(r.error)
}
