import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
const db = process.env.DATABASE_URL_E2E
if (!db || !/_e2e(\?.*)?$/.test(db)) throw new Error('DATABASE_URL_E2E doit viser une base dont le nom finit par _e2e')

// Serveur de dev dédié (port 3100) sur la base e2e ; téléphone Android simulé, position au cabinet du pro.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 }, // première compilation de next dev
  workers: 1,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:3100',
    geolocation: { latitude: 42.3564, longitude: -71.0621 },
    permissions: ['geolocation'],
  },
  webServer: {
    command: 'npx prisma migrate deploy && npx next dev -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...(process.env as Record<string, string>),
      DATABASE_URL: db,
      AUTH_URL: 'http://localhost:3100',
      PUBLIC_BASE_URL: 'http://localhost:3100',
      STORAGE_DRIVER: 'local',
      STORAGE_DIR: '.data/e2e-uploads',
      TWILIO_ACCOUNT_SID: '', // SMS affichés dans la console, jamais envoyés
    },
  },
})
