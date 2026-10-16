import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Les tests d'intégration partagent une base : on exécute les fichiers un par un.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    environment: 'node',
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? '',
      AUTH_SECRET: 'test-secret-test-secret-test-secret-1234',
      CRON_SECRET: 'test-cron-secret-test-cron-secret-1234',
      PUBLIC_BASE_URL: 'https://agents.example.test',
      TWILIO_AUTH_TOKEN: 'test-twilio-token',
      STORAGE_DRIVER: 'local',
      STORAGE_DIR: '.data/test-uploads',
      MANAGER_INVITE_EMAIL: 'manager@example.com',
    },
  },
})
