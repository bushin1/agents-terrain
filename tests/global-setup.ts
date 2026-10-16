import { execSync } from 'node:child_process'
import * as dotenv from 'dotenv'

// Applique les migrations sur la base de TEST avant toute la suite. Jamais de « migrate reset » :
// la remise à zéro se fait par TRUNCATE (tests/helpers/db.ts).
export default function setup() {
  dotenv.config({ path: '.env.local' })
  const url = process.env.DATABASE_URL_TEST
  if (!url) throw new Error('DATABASE_URL_TEST manquant dans .env.local')
  if (url === process.env.DATABASE_URL) throw new Error('DATABASE_URL_TEST doit viser une base distincte de DATABASE_URL')
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } })
}
