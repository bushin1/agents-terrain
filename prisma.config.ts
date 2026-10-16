// Prisma 7 ne charge plus .env tout seul : on lit .env.local comme Next. Une variable déjà
// présente dans l'environnement (tests, Docker) n'est pas écrasée.
import * as dotenv from 'dotenv'
import { defineConfig } from 'prisma/config'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
})
