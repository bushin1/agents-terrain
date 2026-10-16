// Données de démonstration pour tester le back-office et l'espace agent en local, sans Google OAuth.
// Usage : npm run seed:dev [-- prenom@allo-chantiers.fr]
// Refuse de tourner en production ou sur une base non locale. Ne supprime jamais rien : si les données
// de démo existent déjà, le script ne fait que réafficher les lignes de connexion.
import { randomUUID } from 'node:crypto'
import * as dotenv from 'dotenv'
import { assertSeedAllowed } from './seed-guard'

dotenv.config({ path: '.env.local' })

const H = 3_600_000
const WEEK_S = 7 * 24 * 3600
const COOKIE = 'authjs.session-token' // nom du cookie Auth.js quand l'app est servie en HTTP (localhost)
const DEMO_AGENT_EMAIL = 'maya.demo@example.com'
const fileId = () => randomUUID().replaceAll('-', '')
const png = (base64: string) => Buffer.from(base64, 'base64')

// PNG minuscules : bandes de couleur 8×6 par catégorie de photo, trait sinueux 120×40 pour la signature.
const PHOTO_PNG: Record<'LOGO' | 'VEHICLE' | 'TEAM' | 'EQUIPMENT' | 'JOB', string> = {
  LOGO: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAJElEQVR42mOQi1oARCkLngERMpsBqyiQwYBVFCqB1TQGku0AAAWpSDH2K/uvAAAAAElFTkSuQmCC',
  VEHICLE: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAJElEQVR42mNYYKMBRM+a8oAImc2AVRTIYMAqCpXAahoDyXYAABs6RHFdlQAGAAAAAElFTkSuQmCC',
  TEAM: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAJElEQVR42mPQaAoAorwT04AImc2AVRTIYMAqCpXAahoDyXYAAHCLQpHshQALAAAAAElFTkSuQmCC',
  EQUIPMENT: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAJElEQVR42mOoSNEAon2r8oAImc2AVRTIYMAqCpXAahoDyXYAABO6RHHbziwhAAAAAElFTkSuQmCC',
  JOB: 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAGCAIAAABxZ0isAAAAH0lEQVR42mOIAoMFYIDMZsAqCmQwYBWFSmA1jYFkOwCRWkZRddzX8AAAAABJRU5ErkJggg==',
}
const SIGNATURE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAHgAAAAoCAAAAAAQgWH5AAAA30lEQVR42u2XUQ6EIAwF5yS9/y3dZE02aij0PUw2UfhS6DiiSCvbnxpLvMTvFsfeXNcJR+Zc9QXHAR3zFUcCD5dwvMcjBDA7U7S/M8pk5z60u947sLyaOVo4nlcyN3FM8Nvte0uLK5taccpJGLa3aM6C8L0lcxpC+N6COQ9ggA6HwxxmNKVt7ol00uL0S/TG6A0Xl62F00FrH2p4OL2dKSZ2phFOGjO3Fw9xsigl7zk4ecYUE72YurilwjBwzsVYo1CRi5sazl1lZIg4TXamXi/iNFj7t0TB10/bEj9P/AHiCF6C6OIS2QAAAABJRU5ErkJggg=='

/** Ligne à coller dans la console du navigateur, sur http://localhost:3000, pour ouvrir une session. */
async function cookieLine(token: Record<string, unknown>): Promise<string> {
  const { encode } = await import('next-auth/jwt')
  const jwt = await encode({ token, secret: process.env.AUTH_SECRET!, salt: COOKIE, maxAge: WEEK_S })
  return `document.cookie = "${COOKIE}=${jwt}; path=/; max-age=${WEEK_S}"`
}

async function main() {
  try {
    assertSeedAllowed(process.env)
    if (!process.env.AUTH_SECRET) throw new Error('AUTH_SECRET manquant dans .env.local')
  } catch (e) {
    console.error((e as Error).message)
    process.exit(1)
  }
  const adminEmail = (process.argv[2] ?? 'marvin@allo-chantiers.fr').toLowerCase()

  // Imports après dotenv : DATABASE_URL et STORAGE_DIR doivent être chargés.
  const { prisma } = await import('../lib/prisma')
  const { getStorage } = await import('../modules/storage')
  const { refreshFraudFlags } = await import('../modules/review')
  const { CONSENT_VERSION } = await import('../modules/missions')
  const { CONTRACT_VERSION } = await import('../modules/contract')

  await prisma.adminUser.upsert({ where: { email: adminEmail }, create: { email: adminEmail, role: 'ADMIN' }, update: { role: 'ADMIN' } })

  let maya = await prisma.agent.findUnique({ where: { email: DEMO_AGENT_EMAIL } })
  if (maya) {
    console.log('Données de démo déjà présentes : rien de créé.')
  } else {
    const now = Date.now()
    const at = (hours: number) => new Date(now + hours * H)
    const boston = { timeZone: 'America/New_York', state: 'MA' }
    maya = await prisma.agent.create({
      data: {
        firstName: 'Maya', lastName: 'Thompson-Okafor', email: DEMO_AGENT_EMAIL, phone: '+16175550101', birthDate: new Date('2005-03-14'),
        zip: '02116', lat: 42.3496, lng: -71.0746, radiusMiles: 25, hasCar: true, availability: ['mon-am', 'wed-pm', 'sat-am'],
        status: 'ACTIVE', phoneVerifiedAt: at(-300), contractVersion: CONTRACT_VERSION, contractSignedAt: at(-240),
        contractSignedName: 'Maya Thompson-Okafor', contractIp: '127.0.0.1',
      },
    })
    const sam = await prisma.agent.create({
      data: {
        firstName: 'Sam', lastName: 'Rivera', email: 'sam.demo@example.com', phone: '+16175550102', birthDate: new Date('2003-08-02'),
        zip: '02130', lat: 42.3097, lng: -71.1151, radiusMiles: 15, hasCar: false, availability: ['sat-am', 'sun-am'],
        status: 'LOCKED', phoneVerifiedAt: at(-100), failedAttempts: 3, lastAttemptAt: at(-2),
      },
    })
    for (const [i, score] of [55, 60, 65].entries()) {
      await prisma.trainingAttempt.create({ data: { agentId: sam.id, score, passed: false, answers: {}, createdAt: at(-2 - (2 - i) * 25) } })
    }

    const delgado = await prisma.pro.create({
      data: {
        ...boston, businessName: 'Delgado Concrete & Masonry Restoration Services LLC', contactName: 'Frank Delgado', phone: '+16175550142',
        address: '120 Tremont Street', city: 'Boston', zip: '02108', lat: 42.3564, lng: -71.0621, trade: 'Concrete contractor',
        status: 'MISSION_OPEN', notes: 'Appelé le 12/10 : d’accord pour une visite le matin.\nParle anglais et espagnol.',
      },
    })
    const fence = await prisma.pro.create({
      data: {
        ...boston, businessName: 'Back Bay Fence & Gate Co.', contactName: 'Linda Park', phone: '+16175550143', address: '45 Newbury Street',
        city: 'Boston', zip: '02116', lat: 42.3519, lng: -71.0747, trade: 'Fence contractor', status: 'MISSION_OPEN',
      },
    })
    await prisma.pro.create({
      data: {
        ...boston, businessName: 'Jamaica Plain Roofing & Gutters', contactName: 'Dave O’Brien', phone: '+16175550144', address: '700 Centre Street',
        city: 'Jamaica Plain', zip: '02130', lat: 42.3118, lng: -71.1146, trade: 'Roofing contractor', status: 'AGREED',
      },
    })

    // Visite d'hier, soumise, note du pro 2/5 → alerte LOW_PRO_RATING (confirmation exigée pour valider).
    const slot = at(-26)
    const visit = await prisma.mission.create({
      data: {
        proId: delgado.id, agentId: maya.id, status: 'SUBMITTED', slotAt: slot, publishedAt: at(-120), acceptedAt: at(-96),
        submittedAt: at(-25), postVisitSmsAt: at(-25), proRating: 2, suggestedCategory: 'Concrete contractor',
        instructions: 'Owner speaks English and Spanish\nAsk for a photo of the mixer truck',
      },
    })
    const step = (minutes: number) => {
      const clientAt = new Date(slot.getTime() + minutes * 60_000)
      return { clientAt: clientAt.toISOString(), receivedAt: new Date(clientAt.getTime() + 3000).toISOString() }
    }
    const signatureKey = `missions/${visit.id}/signature-${fileId()}.png`
    await getStorage().put(signatureKey, png(SIGNATURE_PNG))
    const submission = await prisma.submission.create({
      data: {
        missionId: visit.id,
        steps: {
          checkin: { lat: 42.3567, lng: -71.0624, accuracy: 12, ...step(2) },
          consent: { signerName: 'Frank Delgado', textVersion: CONSENT_VERSION, signatureKey, ...step(10) },
          profile: { listingName: 'Delgado Concrete & Masonry', category: 'Concrete contractor', city: 'Boston', zip: '02108', mode: 'CREATED', ...step(25) },
          invite: { result: 'INVITE_SENT', ...step(30) },
          verification: { result: 'VIDEO_NOT_OFFERED', ...step(40) },
          checkout: step(45),
        },
      },
    })
    for (const category of ['LOGO', 'LOGO', 'VEHICLE', 'VEHICLE', 'TEAM', 'TEAM', 'EQUIPMENT', 'EQUIPMENT', 'JOB', 'JOB'] as const) {
      const storageKey = `missions/${visit.id}/photos/${fileId()}.png`
      await getStorage().put(storageKey, png(PHOTO_PNG[category]))
      const { clientAt, receivedAt } = step(20)
      await prisma.photo.create({ data: { submissionId: submission.id, storageKey, category, clientAt: new Date(clientAt), receivedAt: new Date(receivedAt) } })
    }
    await refreshFraudFlags(visit.id)

    // Mission publiée il y a 72 h, sans preneur → encart « Non prises ».
    const open = await prisma.mission.create({
      data: { proId: fence.id, status: 'OPEN', slotAt: at(48), publishedAt: at(-72), suggestedCategory: 'Fence contractor' },
    })
    await prisma.inboundSms.create({ data: { fromPhone: fence.phone, body: 'Hi, can we move the visit to Friday morning?', missionId: open.id } })
    console.log('Données de démo créées : 2 agents (1 actif, 1 bloqué au quiz), 3 pros, 2 missions (1 à valider), 1 SMS reçu.')
  }

  console.log(`\nAdmin : ${adminEmail} (ADMIN)`)
  console.log('Connexion sans Google : ouvrir http://localhost:3000, coller UNE ligne dans la console du navigateur, recharger.')
  console.log('(une seule session à la fois : la seconde ligne remplace la première)\n')
  console.log('Session admin :')
  console.log(await cookieLine({ kind: 'admin', email: adminEmail, name: 'Admin (dev)', sub: adminEmail }))
  console.log('\nSession agent (Maya) :')
  console.log(await cookieLine({ kind: 'agent', agentId: maya.id, name: maya.firstName, sub: maya.id }))
  await prisma.$disconnect()
}

main()
