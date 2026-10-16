/**
 * Données de démonstration pour le VPS (ou local avec SEED_DEMO=1).
 * Crée : admin, agent GOLD avec historique, agent STARTER frais, cibles d'avis.
 * Usage : SEED_DEMO=1 DATABASE_URL=... AUTH_SECRET=... npx tsx scripts/seed-demo.ts
 */
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SEED_DEMO = process.env.SEED_DEMO === '1'
if (!SEED_DEMO) {
  const host = (() => { try { return new URL(process.env.DATABASE_URL ?? '').hostname } catch { return '' } })()
  if (host !== 'localhost' && host !== '127.0.0.1') {
    console.error('seed-demo refusé : passez SEED_DEMO=1 pour tourner hors localhost')
    process.exit(1)
  }
}

const WEEK_S = 7 * 24 * 3600
const COOKIE = process.env.NEXTAUTH_URL?.startsWith('https') ? '__Secure-authjs.session-token' : 'authjs.session-token'
const H = 3_600_000

const ADMIN_EMAIL = 'marvin@allo-chantiers.fr'
const GOLD_EMAIL = 'sofia.gold@demo.agents'
const STARTER_EMAIL = 'leo.starter@demo.agents'

async function cookieLine(token: Record<string, unknown>): Promise<string> {
  const { encode } = await import('next-auth/jwt')
  const jwt = await encode({ token, secret: process.env.AUTH_SECRET!, salt: COOKIE, maxAge: WEEK_S })
  return `document.cookie = "${COOKIE}=${jwt}; path=/; max-age=${WEEK_S}"`
}

async function main() {
  if (!process.env.AUTH_SECRET) { console.error('AUTH_SECRET manquant'); process.exit(1) }

  const { prisma } = await import('../lib/prisma')
  const { SYSTEM_PRO_ID } = await import('../modules/quick-tasks')

  // ── Admin ────────────────────────────────────────────────────────────────────
  await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, role: 'ADMIN' },
    update: { role: 'ADMIN' },
  })

  // ── Cibles d'avis ────────────────────────────────────────────────────────────
  const targets = [
    { placeId: 'demo-target-1', name: 'Boulangerie Montréal', city: 'Montréal', state: 'QC', trade: 'bakery', tier: 'STANDARD' as const },
    { placeId: 'demo-target-2', name: 'Café Québec', city: 'Québec', state: 'QC', trade: 'cafe', tier: 'STANDARD' as const },
    { placeId: 'demo-target-3', name: 'Resto Paris 11', city: 'Paris', state: 'FR', trade: 'restaurant', tier: 'SACRIFICIAL' as const },
    { placeId: 'demo-target-4', name: 'Pizza New York', city: 'New York', state: 'NY', trade: 'pizza', tier: 'SACRIFICIAL' as const },
  ]
  for (const t of targets) {
    await prisma.reviewTarget.upsert({ where: { placeId: t.placeId }, create: t, update: {} })
  }
  const [t1, t2] = await Promise.all([
    prisma.reviewTarget.findUniqueOrThrow({ where: { placeId: 'demo-target-1' } }),
    prisma.reviewTarget.findUniqueOrThrow({ where: { placeId: 'demo-target-2' } }),
  ])

  // ── Agent GOLD (historique) ───────────────────────────────────────────────────
  let gold = await prisma.agent.findUnique({ where: { email: GOLD_EMAIL } })
  if (!gold) {
    gold = await prisma.agent.create({
      data: {
        firstName: 'Sofia',
        lastName: 'Larose',
        email: GOLD_EMAIL,
        phone: '+15145550001',
        birthDate: new Date('1998-04-12'),
        zip: 'H2X 1Y3',
        lat: 45.5088,
        lng: -73.5878,
        radiusMiles: 10,
        hasCar: true,
        availability: ['mon-am', 'tue-am', 'wed-am', 'thu-am', 'fri-am'],
        status: 'ACTIVE',
        level: 'GOLD',
        trustScore: 95,
        contractVersion: '1',
        contractSignedAt: new Date(Date.now() - 90 * 24 * H),
        contractSignedName: 'Sofia Larose',
        contractIp: '127.0.0.1',
      },
    })

    // Pro fantôme pour les missions quick-task
    let sysPro = await prisma.pro.findUnique({ where: { id: SYSTEM_PRO_ID } })
    if (!sysPro) {
      sysPro = await prisma.pro.create({
        data: {
          id: SYSTEM_PRO_ID,
          businessName: 'Quick Task System',
          phone: '+15550000000',
          trade: 'system',
          address: '1 System St',
          city: 'Montréal',
          state: 'QC',
          zip: 'H1A 0A1',
          lat: 45.5,
          lng: -73.5,
          timeZone: 'America/Toronto',
          status: 'CLIENT',
        },
      })
    }

    // 12 missions quick-task VERIFIED (historique avis)
    const now = Date.now()
    for (let i = 0; i < 12; i++) {
      const daysAgo = 30 - i * 2
      const slotAt = new Date(now - daysAgo * 24 * H)
      const targetId = i % 2 === 0 ? t1.id : t2.id
      const mission = await prisma.mission.create({
        data: {
          proId: SYSTEM_PRO_ID,
          agentId: gold.id,
          type: 'QUICK_TASK',
          status: 'VALIDATED',
          slotAt,
          publishedAt: slotAt,
          acceptedAt: slotAt,
          submittedAt: new Date(slotAt.getTime() + H),
          validatedAt: new Date(slotAt.getTime() + 2 * H),
          suggestedCategory: 'quick_task',
        },
      })
      await prisma.quickTaskResult.create({
        data: {
          missionId: mission.id,
          targetId,
          agentId: gold.id,
          status: 'VERIFIED',
          reviewText: `Très bonne expérience — avis démo ${i + 1}`,
          verifiedAt: new Date(slotAt.getTime() + 2 * H),
          survivedCheck: true,
          survivedAt: new Date(slotAt.getTime() + 15 * 24 * H),
          expiresAt: new Date(slotAt.getTime() + 3 * H),
        },
      })
      await prisma.earning.create({
        data: {
          agentId: gold.id,
          missionId: mission.id,
          tier: 'QUICK_TASK',
          baseAmountCents: 500,
          levelBonusPct: 0,
          amountCents: 500,
          status: 'PAID',
        },
      })
    }
  }

  // ── Agent STARTER (frais) ─────────────────────────────────────────────────────
  let starter = await prisma.agent.findUnique({ where: { email: STARTER_EMAIL } })
  if (!starter) {
    starter = await prisma.agent.create({
      data: {
        firstName: 'Léo',
        lastName: 'Dupont',
        email: STARTER_EMAIL,
        phone: '+15145550002',
        birthDate: new Date('2003-09-01'),
        zip: 'H3B 0A1',
        lat: 45.5017,
        lng: -73.5673,
        radiusMiles: 5,
        hasCar: false,
        availability: ['sat-am', 'sat-pm', 'sun-am'],
        status: 'ACTIVE',
        level: 'STARTER',
        trustScore: 50,
        contractVersion: '1',
        contractSignedAt: new Date(Date.now() - 2 * 24 * H),
        contractSignedName: 'Léo Dupont',
        contractIp: '127.0.0.1',
      },
    })
  }

  // ── Lignes de cookies ─────────────────────────────────────────────────────────
  const [adminCookie, goldCookie, starterCookie] = await Promise.all([
    cookieLine({ sub: ADMIN_EMAIL, email: ADMIN_EMAIL, role: 'ADMIN', type: 'admin' }),
    cookieLine({ sub: gold.id, email: GOLD_EMAIL, agentId: gold.id, type: 'agent' }),
    cookieLine({ sub: starter.id, email: STARTER_EMAIL, agentId: starter.id, type: 'agent' }),
  ])

  console.log('\n✅ Données de démo créées.\n')
  console.log('=== ACCÈS DÉMO ===')
  console.log('\n-- Admin (marvin@allo-chantiers.fr) --')
  console.log('URL : /admin')
  console.log('Cookie :', adminCookie)
  console.log('\n-- Agent GOLD (Sofia — 12 avis, 60 $) --')
  console.log('URL : /agent/earnings')
  console.log('Cookie :', goldCookie)
  console.log('\n-- Agent STARTER (Léo — 0 avis) --')
  console.log('URL : /agent/quick-tasks')
  console.log('Cookie :', starterCookie)
  console.log('\nCollez la ligne dans la console DevTools sur le bon domaine, rechargez.')

  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
