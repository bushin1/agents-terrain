// Ajoute (ou change le rôle d') un compte du back-office.
// Usage : npm run admin:add -- prenom@allo-chantiers.fr [ADMIN|SETTER]
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const [rawEmail, role = 'ADMIN'] = process.argv.slice(2)
  const email = (rawEmail ?? '').toLowerCase()
  if (!/^[a-z0-9._%+-]+@allo-chantiers\.fr$/.test(email) || (role !== 'ADMIN' && role !== 'SETTER')) {
    console.error('Usage : npm run admin:add -- prenom@allo-chantiers.fr [ADMIN|SETTER]')
    process.exit(1)
  }
  const { prisma } = await import('../lib/prisma') // après dotenv : DATABASE_URL doit être chargé
  await prisma.adminUser.upsert({ where: { email }, create: { email, role }, update: { role } })
  console.log(`OK : ${email} → ${role}`)
  await prisma.$disconnect()
}

main()
