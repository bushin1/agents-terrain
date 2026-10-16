# Agents terrain GBP — Phase 1 (cœur) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le cœur de la plateforme d'agents terrain : landing, candidature avec vérification SMS, formation et quiz, contrat, pipeline des pros, missions avec dispatch, checklist de visite mobile (hors-ligne), file de validation avec anti-fraude, calcul des gains, SMS entrants et sortants, journal des actions admin.

**Architecture:** App Next.js 16 autonome (App Router) avec Postgres et Prisma 7. Le métier vit dans `modules/<nom>/` : des fichiers `*-rule.ts` **purs** (aucun accès base, testés par `*.test.ts`) et des services (`index.ts` ou fichiers dédiés) qui orchestrent Prisma, testés contre une vraie base de test (`*.int.test.ts`). Les pages `app/agent/*` (anglais, mobile) et `app/admin/*` (français) n'appellent que les interfaces publiques des modules. Auth.js v5 : Google Workspace pour l'équipe, code SMS pour les agents.

**Tech Stack:** Next.js 16.2.6, React 19.2.4, TypeScript 5, Tailwind 4 (back-office), design system MapCrew (`design/mapcrew/`, écrans agent et landing), Prisma 7.8 + `@prisma/adapter-pg`, Postgres 16, Auth.js (`next-auth` 5 beta), Zod 4, Vitest 4, Twilio (REST via `fetch`), Cloudflare R2 (`@aws-sdk/client-s3`), `exifr`, `idb-keyval`.

**Design system :** `design/mapcrew/` (copie du design system MapCrew publié, avec `tokens.css` généré depuis `tokens.json`). Les écrans agent et la landing reprennent ses classes (`mc-*`, `lp-*`), ses maquettes (`components/*/preview.html`) et ses règles de contenu (`README.md`). Les aides JS de `bundle.js` (icônes, motif de carte, carte de mission) sont portées en composants React serveur dans `components/mc/` ; `bundle.js` n'est jamais chargé dans l'app.

**Spec :** `docs/superpowers/specs/2026-10-16-agents-terrain-gbp-design.md` (sections 1 à 7, 9.2, 9.3, 10 à 13).

---

## Ce que la phase 1 livre, et ce qu'elle laisse aux phases suivantes

- **Activation d'un agent :** en phase 1, `CERTIFIED` → `ACTIVE` dès que le contrat est signé. La condition Stripe (`payouts_enabled`) s'ajoute en phase 2, dans `modules/contract`.
- **Gains :** le module `ledger` gère tous les paliers. En phase 1, seuls `VISIT`, `RETURN_VISIT` et `URGENCY` sont déclenchés (à la validation d'une mission). `LIVE` et `CLIENT` seront déclenchés en phase 3 par les modules `listing` et `billing`. L'écran « Earnings » complet et les virements arrivent en phase 2 ; la phase 1 affiche le solde sur l'accueil de l'agent.
- **Missions de retour :** le type `RETURN_VISIT` existe (checklist réduite, palier dédié). Le bouton qui en crée une depuis `VERIFICATION_FAILED` arrive en phase 3 avec le suivi des fiches.
- **Emails :** aucun en phase 1 (la connexion se fait par SMS).
- **Pilotage (KPIs) :** phase 3.
- **Pas de lancement public avant la phase 2.** La landing reprend les promesses du design system (« Paid every Friday via Stripe », « Identity-verified agents ») qui n'existent qu'avec la phase 2. La phase 1 se teste en interne.
- **Carte des missions :** le motif de quartier du design system, avec les missions placées selon leur direction et leur distance depuis l'agent, arrondies (≈ 1 km). Ce n'est pas une carte réelle : aucun fond de carte tiers en phase 1.

## Conventions

- Identifiants de code en anglais. Textes visibles par les agents en anglais, textes du back-office en français. Commentaires en français, comme gmb-tracker.
- Montants toujours en **cents** (entiers).
- Téléphones toujours en **E.164 US** (`+1XXXXXXXXXX`), normalisés à l'entrée par `normalizeUsPhone`.
- Toute action d'un admin qui change un statut écrit une ligne `AuditLog` dans la même transaction.
- Un fichier `*-rule.ts` n'importe jamais `@/lib/prisma`. Il peut importer directement un autre fichier `*-rule.ts` (ou `modules/geo/distance.ts`) d'un autre module : ce sont des fonctions pures. Les services, eux, ne passent que par l'`index.ts` des autres modules.
- Lancer un seul fichier de test : `npx vitest run <chemin>`. Tous les tests : `npm test`.

## Carte des fichiers

```
agents-terrain/
├── package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs
├── vitest.config.ts, prisma.config.ts, .env.example, .gitignore
├── Dockerfile, docker-compose.yml, docs/runbook.md                 (chunk 19)
├── prisma/schema.prisma, prisma/migrations/
├── proxy.ts                                                        garde d'accès /admin, /agent, /api/agent
├── types/next-auth.d.ts
├── lib/
│   ├── prisma.ts            client Prisma + type Db
│   ├── time.ts              fuseaux horaires US, conversion de créneaux
│   ├── brand.ts             nom de marque, email gestionnaire
│   ├── auth.ts              Auth.js (Google équipe + code SMS agents)
│   └── session.ts           requireAgent / requireAdmin
├── modules/
│   ├── audit/               logAudit
│   ├── settings/            réglages (montants, niveaux, rayon d'élargissement)
│   ├── storage/             stockage de fichiers (local / R2)
│   ├── geo/                 distances, géocodage ZIP et adresse
│   ├── sms/                 driver Twilio, gabarits, analyse des réponses, signature webhook, SMS entrants
│   ├── recruitment/         candidature, codes SMS (OTP)
│   ├── academy/             contenu de formation, quiz, verrouillage
│   ├── contract/            texte et signature du contrat
│   ├── agents/              statuts agent, actions admin sur les agents
│   ├── ledger/              calcul et enregistrement des gains
│   ├── missions/            pros, missions, dispatch, checklist de visite, tâches planifiées
│   └── review/              anti-fraude, file de validation
├── app/
│   ├── page.tsx, manifest.ts                    landing + PWA
│   ├── apply/, login/                           candidature, connexion agent
│   ├── agent/                                   espace agent (accueil, formation, contrat, missions, visite)
│   ├── admin/                                   back-office
│   └── api/                                     auth, étapes de visite, photos, fichiers, SMS entrants, cron
├── scripts/add-admin.ts                         ajoute un compte du back-office (chunk 6)
└── tests/                                       setup, reset de base, fabriques de données
```


## Chunk 1: Socle (projet, base de données, tests)

### Task 1: Initialiser le projet Next.js

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.gitignore`, `.env.example`
- Create: `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `lib/brand.ts`
- Use (déjà dans le repo) : `design/mapcrew/` — le design system MapCrew (README, `tokens.json`, `tokens.css` généré par `build-tokens.mjs`, `components/bundle.css`, maquettes `components/*/preview.html`)

- [ ] **Step 0: Travailler sur une branche**

Run: `git checkout -b phase-1`
Expected: « Switched to a new branch 'phase-1' ». Tous les commits du plan vont sur cette branche.

- [ ] **Step 1: Créer `package.json`**

```json
{
  "name": "agents-terrain",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "admin:add": "tsx scripts/add-admin.ts"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.700.0",
    "@prisma/adapter-pg": "^7.8.0",
    "@prisma/client": "^7.8.0",
    "dotenv": "^16.4.5",
    "exifr": "^7.1.3",
    "idb-keyval": "^6.2.1",
    "next": "16.2.6",
    "next-auth": "^5.0.0-beta.31",
    "pg": "^8.21.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pg": "^8.20.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "prisma": "^7.8.0",
    "tailwindcss": "^4",
    "tsx": "^4.19.0",
    "typescript": "^5",
    "vitest": "^4.1.9"
  }
}
```

- [ ] **Step 2: Créer `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Créer `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`**

`next.config.ts` :

```ts
import type { NextConfig } from 'next'

// En-têtes de sécurité appliqués à toutes les réponses. La caméra et la géolocalisation sont
// autorisées pour notre propre origine : la checklist de visite en a besoin.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
```

`postcss.config.mjs` :

```js
const config = { plugins: { '@tailwindcss/postcss': {} } }
export default config
```

`eslint.config.mjs` :

```js
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '.data/**']),
])
```

- [ ] **Step 4: Créer `.gitignore` et `.env.example`**

`.gitignore` :

```
node_modules/
.next/
out/
.data/
coverage/
*.tsbuildinfo
next-env.d.ts
.env
.env*.local
secrets.env
```

`.env.example` (à copier en `.env.local`, en remplaçant `USER` par le résultat de `whoami`) :

```
DATABASE_URL=postgresql://USER@localhost:5432/agents_terrain
DATABASE_URL_TEST=postgresql://USER@localhost:5432/agents_terrain_test
AUTH_SECRET=remplacer-par-32-caracteres-aleatoires-minimum
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
PUBLIC_BASE_URL=http://localhost:3000
CRON_SECRET=remplacer-par-32-caracteres-aleatoires-minimum
STORAGE_DRIVER=local
STORAGE_DIR=.data/uploads
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
MANAGER_INVITE_EMAIL=manager@example.com
NEXT_PUBLIC_BRAND_NAME=MapCrew
```

- [ ] **Step 5: Créer `lib/brand.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`**

`lib/brand.ts` :

```ts
// Nom de marque provisoire (à remplacer par la marque définitive via la variable d'environnement)
// et email du compte gestionnaire Google dédié, affiché à l'agent à l'étape « invitation ».
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'MapCrew'

export function managerInviteEmail(): string {
  return process.env.MANAGER_INVITE_EMAIL || 'manager@example.com'
}
```

`app/globals.css` (Tailwind sert au back-office ; les écrans agent et la landing utilisent les classes `mc-*` / `lp-*` du design system) :

```css
@import "tailwindcss";

/* Polices du design system, servies par next/font (pas d'appel à Google Fonts depuis le navigateur). */
:root {
  --font-display: var(--font-bricolage), "Helvetica Neue", Arial, sans-serif;
  --font-sans: var(--font-public-sans), "Helvetica Neue", Arial, sans-serif;
}

body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-sans);
}
```

`app/layout.tsx` :

```tsx
import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google'
import { BRAND_NAME } from '@/lib/brand'
// Ordre important : jetons, puis composants du design system, puis surcharges locales.
import '@/design/mapcrew/tokens.css'
import '@/design/mapcrew/components/bundle.css'
import './globals.css'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-bricolage', display: 'swap' })
const publicSans = Public_Sans({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--font-public-sans', display: 'swap' })

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: 'Get paid to help local contractors get on Google Maps.',
}

export const viewport: Viewport = { themeColor: '#1f3b2f', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${bricolage.variable} ${publicSans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
```

`app/page.tsx` (provisoire, remplacé au chunk 13) :

```tsx
import { BRAND_NAME } from '@/lib/brand'

export default function Home() {
  return <main className="p-8 text-2xl font-semibold">{BRAND_NAME}</main>
}
```

- [ ] **Step 6: Installer et vérifier**

Run: `npm install`
Expected: installation sans erreur (des avertissements `peer` sont acceptables). Si une version n'existe pas, prendre la dernière de la même majeure (`npm install <paquet>@<majeure>`).

Run: `cp .env.example .env.local && sed -i '' "s/USER/$(whoami)/g" .env.local && npx tsc --noEmit`
Expected: aucune erreur.

Run: `npm run dev` puis ouvrir `http://localhost:3000`
Expected: la page affiche « MapCrew ». Arrêter le serveur.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app"
```

### Task 2: Schéma Prisma et bases locales

**Files:**
- Create: `prisma.config.ts`, `prisma/schema.prisma`, `lib/prisma.ts`

- [ ] **Step 1: Créer les deux bases locales**

Run: `createdb agents_terrain && createdb agents_terrain_test`
Expected: aucune sortie. (Postgres 16 Homebrew doit tourner : `brew services start postgresql@16`.)

- [ ] **Step 2: Créer `prisma.config.ts`**

```ts
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
```

- [ ] **Step 3: Créer `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

// ── Agents ─────────────────────────────────────────────────────────────────────

enum AgentStatus {
  APPLICANT
  TRAINING
  LOCKED
  REFUSED
  CERTIFIED
  ACTIVE
  SUSPENDED
}

model Agent {
  id               String            @id @default(cuid())
  firstName        String
  lastName         String
  email            String            @unique
  phone            String            @unique // E.164 US
  birthDate        DateTime          @db.Date
  zip              String
  lat              Float
  lng              Float
  radiusMiles      Int
  hasCar           Boolean
  availability     String[] // créneaux « mon-am », « mon-pm », … « sun-pm »
  status           AgentStatus       @default(APPLICANT)
  phoneVerifiedAt  DateTime?
  failedAttempts   Int               @default(0)
  lastAttemptAt    DateTime?
  contractVersion  String?
  contractSignedAt DateTime?
  contractSignedName String? // nom légal tapé pour signer
  contractIp       String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  attempts         TrainingAttempt[]
  missions         Mission[]
  earnings         Earning[]
  flags            FraudFlag[]

  @@index([status])
}

// Codes à usage unique envoyés par SMS (candidature et connexion). Seule l'empreinte est stockée.
model OtpCode {
  id        String    @id @default(cuid())
  phone     String
  codeHash  String
  expiresAt DateTime
  attempts  Int       @default(0)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([phone, createdAt])
}

model TrainingAttempt {
  id        String   @id @default(cuid())
  agentId   String
  agent     Agent    @relation(fields: [agentId], references: [id])
  score     Int // pourcentage 0–100
  passed    Boolean
  answers   Json
  createdAt DateTime @default(now())

  @@index([agentId, createdAt])
}

// ── Pros et missions ───────────────────────────────────────────────────────────

enum ProStatus {
  TO_CALL
  AGREED
  MISSION_OPEN
  VISITED
  LISTING_LIVE
  CLIENT
  LOST
}

model Pro {
  id              String    @id @default(cuid())
  businessName    String
  contactName     String?
  phone           String // E.164 US
  address         String
  city            String
  state           String // code à 2 lettres
  zip             String
  lat             Float?
  lng             Float?
  timeZone        String // IANA, ex. America/New_York
  trade           String
  status          ProStatus @default(TO_CALL)
  notes           String?
  existingPlaceId String? // fiche publique déjà existante avant la visite (à revendiquer)
  lostReason      String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  missions        Mission[]

  @@index([status])
  @@index([phone])
}

enum MissionType {
  VISIT
  RETURN_VISIT
}

enum MissionStatus {
  OPEN
  ACCEPTED
  SUBMITTED
  NEEDS_FIX
  VALIDATED
  REJECTED
  CANCELLED
}

model Mission {
  id                   String        @id @default(cuid())
  proId                String
  pro                  Pro           @relation(fields: [proId], references: [id])
  agentId              String?
  agent                Agent?        @relation(fields: [agentId], references: [id])
  type                 MissionType   @default(VISIT)
  parentMissionId      String? // mission VISIT d'origine, pour une RETURN_VISIT
  parentMission        Mission?      @relation("ReturnOf", fields: [parentMissionId], references: [id])
  returnMissions       Mission[]     @relation("ReturnOf")
  status               MissionStatus @default(OPEN)
  slotAt               DateTime
  publishedAt          DateTime      @default(now())
  acceptedAt           DateTime?
  submittedAt          DateTime?
  validatedAt          DateTime?
  needsFixAt           DateTime?
  fixMessage           String?
  rejectReason         String?
  cancelReason         String?
  broadcastRadiusMiles Int?
  urgencyBonusCents    Int           @default(0)
  suggestedCategory    String
  instructions         String?
  reminderSentAt       DateTime?
  noShowSmsAt          DateTime?
  postVisitSmsAt       DateTime?
  proRating            Int?
  proDenied            Boolean       @default(false)
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  submission           Submission?
  earnings             Earning[]
  flags                FraudFlag[]

  @@index([status, slotAt])
  @@index([agentId, status])
  @@index([proId])
}

// Données de la checklist. `steps` suit le schéma Zod de modules/missions/checklist-rule.ts.
model Submission {
  id        String   @id @default(cuid())
  missionId String   @unique
  mission   Mission  @relation(fields: [missionId], references: [id])
  steps     Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  photos    Photo[]
}

enum PhotoCategory {
  LOGO
  VEHICLE
  TEAM
  EQUIPMENT
  JOB
}

model Photo {
  id           String        @id @default(cuid())
  submissionId String
  submission   Submission    @relation(fields: [submissionId], references: [id])
  storageKey   String        @unique
  category     PhotoCategory
  exifTakenAt  DateTime?
  exifLat      Float?
  exifLng      Float?
  clientAt     DateTime
  receivedAt   DateTime      @default(now())

  @@index([submissionId])
}

// ── Gains ──────────────────────────────────────────────────────────────────────

enum EarningTier {
  VISIT
  LIVE
  CLIENT
  RETURN_VISIT
  URGENCY
}

enum EarningStatus {
  PAYABLE
  PAID
  VOID
}

model Earning {
  id              String        @id @default(cuid())
  agentId         String
  agent           Agent         @relation(fields: [agentId], references: [id])
  missionId       String
  mission         Mission       @relation(fields: [missionId], references: [id])
  tier            EarningTier
  baseAmountCents Int
  levelBonusPct   Int
  amountCents     Int
  status          EarningStatus @default(PAYABLE)
  voidReason      String?
  voidedBy        String?
  createdAt       DateTime      @default(now())

  @@unique([missionId, tier])
  @@index([agentId, status])
}

// ── Anti-fraude, SMS entrants ──────────────────────────────────────────────────

enum FraudType {
  CHECKIN_FAR
  DUPLICATE_PRO
  PHOTO_EXIF_MISMATCH
  PRO_DENIED
  LOW_PRO_RATING
  NO_SHOW
  LATE_SYNC
}

model FraudFlag {
  id        String    @id @default(cuid())
  missionId String
  mission   Mission   @relation(fields: [missionId], references: [id])
  agentId   String
  agent     Agent     @relation(fields: [agentId], references: [id])
  type      FraudType
  detail    String
  resolved  Boolean   @default(false)
  createdAt DateTime  @default(now())

  @@unique([missionId, agentId, type])
}

model InboundSms {
  id        String   @id @default(cuid())
  fromPhone String
  body      String
  missionId String?
  handled   Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([handled, createdAt])
}

// ── Back-office ────────────────────────────────────────────────────────────────

enum AdminRole {
  ADMIN
  SETTER
}

model AdminUser {
  email     String    @id
  role      AdminRole
  createdAt DateTime  @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  actor     String // email admin, « agent:<id> » ou « system »
  action    String
  entity    String
  entityId  String
  reason    String?
  data      Json?
  createdAt DateTime @default(now())

  @@index([entity, entityId])
}

model Setting {
  key       String   @id
  value     Json
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 4: Créer `lib/prisma.ts`**

```ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Client ou transaction : les services acceptent l'un ou l'autre pour pouvoir être composés.
export type Db = PrismaClient | Prisma.TransactionClient
```

- [ ] **Step 5: Générer la migration et le client**

Run: `npx prisma migrate dev --name init && npx prisma generate`
Expected: un dossier `prisma/migrations/<horodatage>_init/` avec `migration.sql`, puis « Generated Prisma Client ».

Run: `npx tsc --noEmit`
Expected: aucune erreur. Si `new PrismaClient({ adapter })` est refusé par le typage, remplacer par `new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(db): Prisma schema for phase 1"
```

### Task 3: Infrastructure de test (base de test, fabriques)

**Files:**
- Create: `vitest.config.ts`, `tests/global-setup.ts`, `tests/setup.ts`, `tests/helpers/db.ts`, `tests/helpers/factories.ts`
- Test: `tests/db.int.test.ts`

- [ ] **Step 1: Créer `vitest.config.ts`**

```ts
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
```

- [ ] **Step 2: Créer `tests/global-setup.ts`**

```ts
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
```

- [ ] **Step 3: Créer `tests/setup.ts` (complété au Task 9) et `tests/helpers/db.ts`**

`tests/setup.ts` :

```ts
// Préparation commune à chaque fichier de test. Le driver SMS de test est branché au Task 9.
export {}
```

`tests/helpers/db.ts` :

```ts
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
```

- [ ] **Step 4: Créer `tests/helpers/factories.ts`**

```ts
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

let seq = 0
const next = () => ++seq
const four = (n: number) => String(1000 + (n % 9000)).slice(-4)

// Agent actif à Boston (Back Bay), rayon 25 miles.
export async function makeAgent(data: Partial<Prisma.AgentUncheckedCreateInput> = {}) {
  const n = next()
  return prisma.agent.create({
    data: {
      firstName: 'Maya',
      lastName: `Agent${n}`,
      email: `agent${n}@example.com`,
      phone: `+1617555${four(n)}`,
      birthDate: new Date('2004-05-01'),
      zip: '02116',
      lat: 42.3496,
      lng: -71.0746,
      radiusMiles: 25,
      hasCar: true,
      availability: ['mon-am'],
      status: 'ACTIVE',
      phoneVerifiedAt: new Date(),
      ...data,
    },
  })
}

// Pro d'accord pour une visite, dans le centre de Boston.
export async function makePro(data: Partial<Prisma.ProUncheckedCreateInput> = {}) {
  const n = next()
  return prisma.pro.create({
    data: {
      businessName: `Boston Concrete & Masonry Restoration Services ${n}`,
      contactName: 'Frank Delgado',
      phone: `+1617666${four(n)}`,
      address: '120 Tremont Street',
      city: 'Boston',
      state: 'MA',
      zip: '02108',
      lat: 42.3564,
      lng: -71.0621,
      timeZone: 'America/New_York',
      trade: 'Concrete contractor',
      status: 'AGREED',
      ...data,
    },
  })
}

// Mission ouverte dans 3 jours ; crée le pro si besoin.
export async function makeMission(data: Partial<Prisma.MissionUncheckedCreateInput> = {}) {
  const proId = data.proId ?? (await makePro({ status: 'MISSION_OPEN' })).id
  return prisma.mission.create({
    data: {
      slotAt: new Date(Date.now() + 3 * 86_400_000),
      suggestedCategory: 'Concrete contractor',
      ...data,
      proId,
    },
  })
}
```

- [ ] **Step 5: Écrire le test de fumée `tests/db.int.test.ts`**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from './helpers/db'
import { makeAgent, makeMission } from './helpers/factories'

describe('base de test', () => {
  beforeEach(resetDb)

  it('crée et relit des données, puis repart de zéro', async () => {
    await makeAgent()
    const mission = await makeMission()
    expect(await prisma.agent.count()).toBe(1)
    expect(mission.status).toBe('OPEN')
    await resetDb()
    expect(await prisma.agent.count()).toBe(0)
  })
})
```

- [ ] **Step 6: Lancer le test**

Run: `npx vitest run tests/db.int.test.ts`
Expected: les migrations s'appliquent sur `agents_terrain_test`, puis `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test: integration test harness on a dedicated database"
```

## Chunk 2: Briques techniques (temps, géo, audit, réglages, stockage, SMS)

### Task 4: Fuseaux horaires et créneaux (`lib/time.ts`)

**Files:**
- Create: `lib/time.ts`
- Test: `lib/time.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { defaultTimeZoneForState, formatSlot, toZonedLocalInput, zonedLocalToUtc } from './time'

describe('zonedLocalToUtc', () => {
  it('heure d’été à New York (UTC−4)', () => {
    expect(zonedLocalToUtc('2026-07-01T10:00', 'America/New_York').toISOString()).toBe('2026-07-01T14:00:00.000Z')
  })
  it('heure d’hiver à New York (UTC−5), après le changement du 1er novembre 2026', () => {
    expect(zonedLocalToUtc('2026-11-03T10:00', 'America/New_York').toISOString()).toBe('2026-11-03T15:00:00.000Z')
  })
  it('Phoenix ne change pas d’heure (UTC−7)', () => {
    expect(zonedLocalToUtc('2026-07-01T09:30', 'America/Phoenix').toISOString()).toBe('2026-07-01T16:30:00.000Z')
  })
  it('refuse un format invalide', () => {
    expect(() => zonedLocalToUtc('2026-07-01 10:00', 'America/New_York')).toThrow()
  })
})

describe('formatSlot', () => {
  it('affiche le créneau dans le fuseau du pro', () => {
    const s = formatSlot(new Date('2026-07-01T14:00:00Z'), 'America/New_York')
    expect(s).toContain('10:00')
    expect(s).toContain('Jul')
  })
})

describe('toZonedLocalInput', () => {
  it('repasse un instant UTC à l’heure locale du pro, aller-retour exact', () => {
    const utc = new Date('2026-11-03T15:00:00Z')
    expect(toZonedLocalInput(utc, 'America/New_York')).toBe('2026-11-03T10:00')
    expect(zonedLocalToUtc(toZonedLocalInput(utc, 'America/Chicago'), 'America/Chicago').toISOString()).toBe(utc.toISOString())
  })
})

describe('defaultTimeZoneForState', () => {
  it('propose un fuseau par État', () => {
    expect(defaultTimeZoneForState('MA')).toBe('America/New_York')
    expect(defaultTimeZoneForState('tx')).toBe('America/Chicago')
    expect(defaultTimeZoneForState('AZ')).toBe('America/Phoenix')
  })
  it('renvoie null pour un code inconnu', () => {
    expect(defaultTimeZoneForState('ZZ')).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/time.test.ts`
Expected: FAIL (« Cannot find module './time' »).

- [ ] **Step 3: Écrire `lib/time.ts`**

```ts
// Les créneaux sont saisis à l'heure locale du pro et stockés en UTC.

const STATE_TZ: Record<string, string> = {
  AL: 'America/Chicago', AK: 'America/Anchorage', AZ: 'America/Phoenix', AR: 'America/Chicago',
  CA: 'America/Los_Angeles', CO: 'America/Denver', CT: 'America/New_York', DE: 'America/New_York',
  DC: 'America/New_York', FL: 'America/New_York', GA: 'America/New_York', HI: 'Pacific/Honolulu',
  ID: 'America/Boise', IL: 'America/Chicago', IN: 'America/Indiana/Indianapolis', IA: 'America/Chicago',
  KS: 'America/Chicago', KY: 'America/New_York', LA: 'America/Chicago', ME: 'America/New_York',
  MD: 'America/New_York', MA: 'America/New_York', MI: 'America/Detroit', MN: 'America/Chicago',
  MS: 'America/Chicago', MO: 'America/Chicago', MT: 'America/Denver', NE: 'America/Chicago',
  NV: 'America/Los_Angeles', NH: 'America/New_York', NJ: 'America/New_York', NM: 'America/Denver',
  NY: 'America/New_York', NC: 'America/New_York', ND: 'America/Chicago', OH: 'America/New_York',
  OK: 'America/Chicago', OR: 'America/Los_Angeles', PA: 'America/New_York', RI: 'America/New_York',
  SC: 'America/New_York', SD: 'America/Chicago', TN: 'America/Chicago', TX: 'America/Chicago',
  UT: 'America/Denver', VT: 'America/New_York', VA: 'America/New_York', WA: 'America/Los_Angeles',
  WV: 'America/New_York', WI: 'America/Chicago', WY: 'America/Denver',
}

export const US_TIME_ZONES = Array.from(new Set(Object.values(STATE_TZ))).sort()

/** Fuseau proposé par défaut pour un État (modifiable à la saisie : certains États en ont deux). */
export function defaultTimeZoneForState(state: string): string | null {
  return STATE_TZ[state.trim().toUpperCase()] ?? null
}

/** Décalage (ms) entre l'heure locale du fuseau et UTC à l'instant `ts`. */
function tzOffsetMs(ts: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ts))
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - ts
}

/** « 2026-07-01T10:00 » à l'heure locale du fuseau → instant UTC. */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local)
  if (!m) throw new Error(`Créneau invalide : ${local}`)
  const [, y, mo, d, h, mi] = m.map(Number)
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const first = tzOffsetMs(guess, timeZone)
  let ts = guess - first
  const second = tzOffsetMs(ts, timeZone)
  if (second !== first) ts = guess - second
  return new Date(ts)
}

/** Créneau lisible dans le fuseau du pro, ex. « Wed, Jul 1, 10:00 AM ». */
export function formatSlot(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(date)
}

/** Valeur pour un <input type="datetime-local"> à l'heure locale du fuseau. */
export function toZonedLocalInput(date: Date, timeZone: string): string {
  const local = new Date(date.getTime() + tzOffsetMs(date.getTime(), timeZone))
  return local.toISOString().slice(0, 16)
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run lib/time.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/time.ts lib/time.test.ts
git commit -m "feat: US time zones and slot conversion"
```

### Task 5: Distances et géocodage (`modules/geo`)

**Files:**
- Create: `modules/geo/distance.ts`, `modules/geo/geocode.ts`, `modules/geo/index.ts`
- Test: `modules/geo/distance.test.ts`, `modules/geo/geocode.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

`modules/geo/distance.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { approximate, distanceMeters, distanceMiles } from './distance'

describe('distanceMeters', () => {
  it('un degré de latitude ≈ 111 195 m', () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1)
  })
  it('Boston Common → Fenway Park ≈ 2,76 km', () => {
    const d = distanceMeters({ lat: 42.355, lng: -71.0656 }, { lat: 42.3467, lng: -71.0972 })
    expect(d).toBeGreaterThan(2700)
    expect(d).toBeLessThan(2800)
  })
  it('distance nulle pour le même point', () => {
    expect(distanceMeters({ lat: 42.3, lng: -71 }, { lat: 42.3, lng: -71 })).toBe(0)
  })
})

describe('distanceMiles', () => {
  it('convertit en miles', () => {
    expect(distanceMiles({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(69.09, 1)
  })
})

describe('approximate', () => {
  it('arrondit à environ 1 km pour masquer une adresse exacte', () => {
    expect(approximate({ lat: 42.35641, lng: -71.06213 })).toEqual({ lat: 42.36, lng: -71.06 })
  })
})
```

`modules/geo/geocode.test.ts` :

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { geocodeAddress, geocodeZip } from './geocode'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

afterEach(() => vi.unstubAllGlobals())

describe('geocodeZip', () => {
  it('lit la latitude, la longitude et l’État', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      places: [{ latitude: '42.3496', longitude: '-71.0746', 'state abbreviation': 'MA' }],
    })))
    expect(await geocodeZip('02116')).toEqual({ lat: 42.3496, lng: -71.0746, state: 'MA' })
  })
  it('renvoie null pour un ZIP inconnu', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({}, 404)))
    expect(await geocodeZip('00000')).toBeNull()
  })
  it('renvoie null si le réseau échoue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network') }))
    expect(await geocodeZip('02116')).toBeNull()
  })
})

describe('geocodeAddress', () => {
  it('lit les coordonnées du premier résultat Census', async () => {
    const fetchMock = vi.fn(async (_input: unknown) => jsonResponse({
      result: { addressMatches: [{ coordinates: { x: -71.0621, y: 42.3564 } }] },
    }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await geocodeAddress('120 Tremont St, Boston, MA 02108')).toEqual({ lat: 42.3564, lng: -71.0621 })
    expect(String(fetchMock.mock.calls[0][0])).toContain('onelineaddress')
  })
  it('renvoie null sans correspondance', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ result: { addressMatches: [] } })))
    expect(await geocodeAddress('nowhere')).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run modules/geo`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `modules/geo/distance.ts`, `modules/geo/geocode.ts`, `modules/geo/index.ts`**

`modules/geo/distance.ts` :

```ts
export interface Point { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000
export const METERS_PER_MILE = 1609.344

/** Distance à vol d'oiseau (formule de haversine), en mètres. */
export function distanceMeters(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function distanceMiles(a: Point, b: Point): number {
  return distanceMeters(a, b) / METERS_PER_MILE
}

/** Position arrondie au centième de degré (≈ 1 km) : sert à afficher une mission sans révéler l'adresse. */
export function approximate(p: Point): Point {
  return { lat: Math.round(p.lat * 100) / 100, lng: Math.round(p.lng * 100) / 100 }
}
```

`modules/geo/geocode.ts` :

```ts
// Géocodage gratuit et sans clé : Zippopotam pour un ZIP, le géocodeur du Census américain pour
// une adresse. Toute erreur (réseau, absence de résultat) renvoie null : l'appelant décide.

export async function geocodeZip(zip: string): Promise<{ lat: number; lng: number; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = (await res.json()) as { places?: { latitude: string; longitude: string; 'state abbreviation': string }[] }
    const p = data.places?.[0]
    if (!p) return null
    return { lat: Number(p.latitude), lng: Number(p.longitude), state: p['state abbreviation'] }
  } catch {
    return null
  }
}

export async function geocodeAddress(oneLine: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress')
    url.searchParams.set('address', oneLine)
    url.searchParams.set('benchmark', 'Public_AR_Current')
    url.searchParams.set('format', 'json')
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: { addressMatches?: { coordinates: { x: number; y: number } }[] } }
    const m = data.result?.addressMatches?.[0]
    if (!m) return null
    return { lat: m.coordinates.y, lng: m.coordinates.x }
  } catch {
    return null
  }
}
```

`modules/geo/index.ts` :

```ts
export { approximate, distanceMeters, distanceMiles, METERS_PER_MILE, type Point } from './distance'
export { geocodeAddress, geocodeZip } from './geocode'
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run modules/geo`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/geo
git commit -m "feat(geo): distances and free US geocoding"
```

### Task 6: Journal des actions (`modules/audit`)

**Files:**
- Create: `modules/audit/index.ts`
- Test: `modules/audit/audit.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { listAudit, logAudit } from './index'

describe('audit', () => {
  beforeEach(resetDb)

  it('enregistre une action et la relit, la plus récente en premier', async () => {
    await logAudit(prisma, { actor: 'marvin@allo-chantiers.fr', action: 'mission.validate', entity: 'Mission', entityId: 'm1' })
    await new Promise((r) => setTimeout(r, 5)) // deux horodatages distincts
    await logAudit(prisma, { actor: 'system', action: 'mission.reject', entity: 'Mission', entityId: 'm1', reason: 'délai' })
    const rows = await listAudit('Mission', 'm1')
    expect(rows.map((r) => r.action)).toEqual(['mission.reject', 'mission.validate'])
    expect(rows[0].reason).toBe('délai')
  })

  it('fonctionne dans une transaction', async () => {
    await prisma.$transaction(async (tx) => {
      await logAudit(tx, { actor: 'system', action: 'x', entity: 'Agent', entityId: 'a1', data: { n: 1 } })
    })
    expect(await prisma.auditLog.count()).toBe(1)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/audit`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/audit/index.ts`**

```ts
import type { Prisma } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'

export interface AuditEntry {
  actor: string // email admin, « agent:<id> » ou « system »
  action: string // ex. « mission.validate »
  entity: string
  entityId: string
  reason?: string
  data?: Prisma.InputJsonValue
}

/** À appeler avec la transaction qui fait le changement, pour que l'action et sa trace soient atomiques. */
export async function logAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({ data: entry })
}

export async function listAudit(entity: string, entityId: string) {
  return prisma.auditLog.findMany({ where: { entity, entityId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/audit`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/audit
git commit -m "feat(audit): audit log"
```

### Task 7: Réglages (`modules/settings`)

**Files:**
- Create: `modules/settings/defaults.ts`, `modules/settings/index.ts`
- Test: `modules/settings/settings.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from './index'

describe('settings', () => {
  beforeEach(resetDb)

  it('renvoie les valeurs par défaut tant que rien n’est enregistré', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS.tierAmountsCents.VISIT).toBe(4000)
  })

  it('enregistre, relit et trace la modification', async () => {
    const next = { ...DEFAULT_SETTINGS, tierAmountsCents: { ...DEFAULT_SETTINGS.tierAmountsCents, VISIT: 4500 } }
    await saveSettings(next, 'marvin@allo-chantiers.fr')
    expect((await getSettings()).tierAmountsCents.VISIT).toBe(4500)
    expect(await prisma.auditLog.count({ where: { action: 'settings.update' } })).toBe(1)
  })

  it('refuse des niveaux sans palier de départ à 0', async () => {
    const bad = { ...DEFAULT_SETTINGS, levels: DEFAULT_SETTINGS.levels.map((l) => ({ ...l, minValidated: l.minValidated + 1 })) }
    await expect(saveSettings(bad, 'x')).rejects.toThrow()
  })

  it('refuse un montant négatif', async () => {
    const bad = { ...DEFAULT_SETTINGS, tierAmountsCents: { ...DEFAULT_SETTINGS.tierAmountsCents, LIVE: -1 } }
    await expect(saveSettings(bad, 'x')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/settings`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/settings/defaults.ts` et `modules/settings/index.ts`**

`modules/settings/defaults.ts` :

```ts
import { z } from 'zod'

const cents = z.number().int().min(0)

export const SettingsSchema = z.object({
  tierAmountsCents: z.object({ VISIT: cents, LIVE: cents, CLIENT: cents, RETURN_VISIT: cents }),
  levels: z
    .array(z.object({
      name: z.enum(['BRONZE', 'SILVER', 'GOLD']),
      minValidated: z.number().int().min(0),
      bonusPct: z.number().int().min(0).max(100),
    }))
    .length(3)
    .refine((levels) => levels.some((l) => l.minValidated === 0), 'Un niveau doit commencer à 0 mission'),
  widenRadiusMiles: z.number().int().min(1).max(200), // rayon proposé par le bouton « Élargir »
})

export type Settings = z.infer<typeof SettingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  tierAmountsCents: { VISIT: 4000, LIVE: 2500, CLIENT: 5000, RETURN_VISIT: 2000 },
  levels: [
    { name: 'BRONZE', minValidated: 0, bonusPct: 0 },
    { name: 'SILVER', minValidated: 5, bonusPct: 10 },
    { name: 'GOLD', minValidated: 15, bonusPct: 20 },
  ],
  widenRadiusMiles: 50,
}
```

`modules/settings/index.ts` :

```ts
import type { Prisma } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { DEFAULT_SETTINGS, SettingsSchema, type Settings } from './defaults'

const KEY = 'app'

export async function getSettings(db: Db = prisma): Promise<Settings> {
  const row = await db.setting.findUnique({ where: { key: KEY } })
  if (!row) return structuredClone(DEFAULT_SETTINGS)
  const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(row.value as object) })
  if (parsed.success) return parsed.data
  // Valeur enregistrée devenue invalide : on le signale bruyamment plutôt que de payer des montants inattendus.
  console.error('[settings] réglages enregistrés invalides, valeurs par défaut utilisées', parsed.error.issues)
  return structuredClone(DEFAULT_SETTINGS)
}

export async function saveSettings(input: unknown, actor: string): Promise<Settings> {
  const value = SettingsSchema.parse(input)
  const json = value as unknown as Prisma.InputJsonValue
  await prisma.$transaction(async (tx) => {
    await tx.setting.upsert({ where: { key: KEY }, create: { key: KEY, value: json }, update: { value: json } })
    await logAudit(tx, { actor, action: 'settings.update', entity: 'Setting', entityId: KEY, data: json })
  })
  return value
}

export { DEFAULT_SETTINGS, SettingsSchema, type Settings }
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/settings`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/settings
git commit -m "feat(settings): tier amounts, levels and widen radius"
```

### Task 8: Stockage de fichiers (`modules/storage`)

**Files:**
- Create: `modules/storage/keys.ts`, `modules/storage/index.ts`, `modules/storage/local.ts`, `modules/storage/r2.ts`
- Test: `modules/storage/storage.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertSafeKey, contentTypeForKey } from './keys'
import { localDriver } from './local'

describe('clés de stockage', () => {
  it('accepte une clé de mission', () => {
    expect(() => assertSafeKey('missions/ckx1/photos/abc.jpg')).not.toThrow()
  })
  it('refuse une remontée de dossier ou une extension inconnue', () => {
    expect(() => assertSafeKey('../etc/passwd.jpg')).toThrow()
    expect(() => assertSafeKey('missions/a/../../b.jpg')).toThrow()
    expect(() => assertSafeKey('missions/a/b.exe')).toThrow()
  })
  it('déduit le type de contenu de l’extension', () => {
    expect(contentTypeForKey('a/b.jpg')).toBe('image/jpeg')
    expect(contentTypeForKey('a/b.png')).toBe('image/png')
  })
})

describe('localDriver', () => {
  it('écrit puis relit un fichier', async () => {
    const driver = localDriver(mkdtempSync(join(tmpdir(), 'storage-')))
    await driver.put('missions/m1/signature.png', Buffer.from([1, 2, 3]))
    const file = await driver.get('missions/m1/signature.png')
    expect(file?.contentType).toBe('image/png')
    expect([...file!.body]).toEqual([1, 2, 3])
  })
  it('renvoie null pour un fichier absent', async () => {
    const driver = localDriver(mkdtempSync(join(tmpdir(), 'storage-')))
    expect(await driver.get('missions/m1/none.jpg')).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/storage`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `modules/storage/keys.ts`, `index.ts`, `local.ts`, `r2.ts`**

`modules/storage/keys.ts` (types et règles de clés, sans dépendance, pour éviter un import circulaire entre `index.ts` et les drivers) :

```ts
export interface StoredFile { body: Buffer; contentType: string }

export interface StorageDriver {
  put(key: string, body: Buffer): Promise<void>
  get(key: string): Promise<StoredFile | null>
}

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png' }

/** Clés autorisées : segments alphanumériques séparés par « / », extension .jpg ou .png, jamais « .. ». */
export function assertSafeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*\.(jpg|png)$/i.test(key)) {
    throw new Error(`Clé de stockage refusée : ${key}`)
  }
}

export function contentTypeForKey(key: string): string {
  return TYPES[key.split('.').pop()!.toLowerCase()] ?? 'application/octet-stream'
}
```

`modules/storage/index.ts` :

```ts
import type { StorageDriver } from './keys'
import { localDriver } from './local'
import { r2Driver } from './r2'

export { assertSafeKey, contentTypeForKey, type StorageDriver, type StoredFile } from './keys'

let cached: StorageDriver | null = null

/** Driver choisi par STORAGE_DRIVER : « local » (dossier STORAGE_DIR) ou « r2 » (Cloudflare R2). */
export function getStorage(): StorageDriver {
  if (cached) return cached
  const driver = process.env.STORAGE_DRIVER ?? 'local'
  if (driver === 'r2') {
    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
      throw new Error('R2 incomplet : R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET')
    }
    cached = r2Driver({ accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET })
  } else {
    cached = localDriver(process.env.STORAGE_DIR ?? '.data/uploads')
  }
  return cached
}
```

`modules/storage/local.ts` :

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { assertSafeKey, contentTypeForKey, type StorageDriver } from './keys'

export function localDriver(dir: string): StorageDriver {
  const root = resolve(dir)
  const pathFor = (key: string) => {
    assertSafeKey(key)
    return join(root, key)
  }
  return {
    async put(key, body) {
      const path = pathFor(key)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, body)
    },
    async get(key) {
      try {
        return { body: await readFile(pathFor(key)), contentType: contentTypeForKey(key) }
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
      }
    },
  }
}
```

`modules/storage/r2.ts` :

```ts
import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { assertSafeKey, contentTypeForKey, type StorageDriver } from './keys'

interface R2Config { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string }

export function r2Driver(cfg: R2Config): StorageDriver {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  })
  return {
    async put(key, body) {
      assertSafeKey(key)
      await client.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentTypeForKey(key) }))
    },
    async get(key) {
      assertSafeKey(key)
      try {
        const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))
        const bytes = await res.Body!.transformToByteArray()
        return { body: Buffer.from(bytes), contentType: res.ContentType ?? contentTypeForKey(key) }
      } catch (e) {
        if (e instanceof NoSuchKey) return null
        throw e
      }
    },
  }
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/storage`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/storage
git commit -m "feat(storage): local and R2 file storage"
```

### Task 9: Envoi de SMS (`modules/sms/driver.ts`)

**Files:**
- Create: `modules/sms/driver.ts`
- Modify: `tests/setup.ts`
- Test: `modules/sms/driver.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { memorySmsDriver, sendSms, setSmsDriver, twilioDriver } from './driver'

afterEach(() => vi.unstubAllGlobals())

describe('twilioDriver', () => {
  it('envoie le message via l’API REST Twilio', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ sid: 'SM123' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const res = await twilioDriver('AC1', 'tok', '+16175550000').send('+16175551234', 'Hello')
    expect(res.id).toBe('SM123')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/AC1/Messages.json')
    expect(String(init.body)).toBe('To=%2B16175551234&From=%2B16175550000&Body=Hello')
    expect((init.headers as Record<string, string>).Authorization).toBe('Basic ' + Buffer.from('AC1:tok').toString('base64'))
  })

  it('lève une erreur si Twilio refuse', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'bad number' }), { status: 400 })))
    await expect(twilioDriver('AC1', 'tok', '+1').send('+1', 'x')).rejects.toThrow('Twilio 400: bad number')
  })
})

describe('memorySmsDriver', () => {
  it('garde les messages envoyés (driver branché par tests/setup.ts)', async () => {
    await sendSms('+16175551234', 'code 123456')
    expect(memorySmsDriver.sent).toEqual([{ to: '+16175551234', body: 'code 123456' }])
  })

  it('peut être remplacé', async () => {
    const custom = { send: vi.fn(async () => ({ id: 'x' })) }
    setSmsDriver(custom)
    await sendSms('+1', 'y')
    expect(custom.send).toHaveBeenCalledWith('+1', 'y')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/sms/driver.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/sms/driver.ts`**

```ts
// Envoi de SMS. En production : Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM).
// En développement sans Twilio : affichage dans la console (les codes de connexion y apparaissent).
// En test : driver mémoire branché par tests/setup.ts.

export interface SmsDriver {
  send(to: string, body: string): Promise<{ id: string }>
}

export function twilioDriver(accountSid: string, authToken: string, from: string): SmsDriver {
  return {
    async send(to, body) {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      })
      const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string }
      if (!res.ok) throw new Error(`Twilio ${res.status}: ${data.message ?? 'erreur inconnue'}`)
      return { id: data.sid ?? '' }
    },
  }
}

const consoleDriver: SmsDriver = {
  async send(to, body) {
    console.info(`[sms:console] → ${to} : ${body}`)
    return { id: 'console' }
  },
}

export const memorySmsDriver: SmsDriver & { sent: { to: string; body: string }[] } = {
  sent: [],
  async send(to, body) {
    memorySmsDriver.sent.push({ to, body })
    return { id: `mem-${memorySmsDriver.sent.length}` }
  },
}

let override: SmsDriver | null = null

export function setSmsDriver(driver: SmsDriver | null): void {
  override = driver
}

export function getSmsDriver(): SmsDriver {
  if (override) return override
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) return twilioDriver(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)
  if (process.env.NODE_ENV !== 'production') return consoleDriver
  throw new Error('SMS non configuré : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM')
}

export async function sendSms(to: string, body: string): Promise<{ id: string }> {
  return getSmsDriver().send(to, body)
}
```

- [ ] **Step 4: Brancher le driver mémoire dans `tests/setup.ts`**

Remplacer tout le contenu de `tests/setup.ts` par :

```ts
import { beforeEach } from 'vitest'
import { memorySmsDriver, setSmsDriver } from '@/modules/sms/driver'

// Chaque test part d'une boîte d'envoi SMS vide, sans jamais appeler Twilio.
beforeEach(() => {
  memorySmsDriver.sent.length = 0
  setSmsDriver(memorySmsDriver)
})
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run modules/sms/driver.test.ts && npm test`
Expected: PASS pour le fichier, puis toute la suite au vert.

- [ ] **Step 6: Commit**

```bash
git add modules/sms/driver.ts modules/sms/driver.test.ts tests/setup.ts
git commit -m "feat(sms): Twilio driver with console and memory fallbacks"
```


## Chunk 3: Règles pures — SMS, codes, agents, candidature, formation

Toutes les tâches de ce chunk créent des fichiers **purs** (aucun accès à la base dans le code testé). La base de test doit tout de même tourner : le `globalSetup` applique les migrations avant chaque exécution de Vitest.

### Task 10: Téléphones, réponses SMS et gabarits (`modules/sms`)

**Files:**
- Create: `modules/sms/sms-rule.ts`, `modules/sms/templates.ts`
- Test: `modules/sms/sms-rule.test.ts`, `modules/sms/templates.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

`modules/sms/sms-rule.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { normalizeUsPhone, parseInbound } from './sms-rule'

describe('normalizeUsPhone', () => {
  it.each([
    ['(617) 555-1234', '+16175551234'],
    ['617.555.1234', '+16175551234'],
    ['+1 617 555 1234', '+16175551234'],
    ['16175551234', '+16175551234'],
    ['  617-555-1234 ', '+16175551234'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeUsPhone(input)).toBe(expected)
  })

  it.each([
    ['+33 6 49 70 73 24'],
    ['555-1234'],
    ['017 555 1234'], // indicatif régional commençant par 0
    ['617 155 1234'], // central commençant par 1
    ['+1617555123'],
    ['617+5551234'],
    ['+6175551234'], // « + » suivi de 10 chiffres : indicatif pays absent
    [''],
  ])('refuse %s', (input) => {
    expect(normalizeUsPhone(input)).toBeNull()
  })
})

describe('parseInbound', () => {
  it('reconnaît une note de 1 à 5', () => {
    expect(parseInbound(' 4 ')).toEqual({ kind: 'RATING', value: 4 })
    expect(parseInbound('5!')).toEqual({ kind: 'RATING', value: 5 })
  })
  it('reconnaît NO, quelle que soit la casse', () => {
    expect(parseInbound('no')).toEqual({ kind: 'DENIED' })
    expect(parseInbound('No.')).toEqual({ kind: 'DENIED' })
  })
  it('classe tout le reste en OTHER', () => {
    expect(parseInbound('6')).toEqual({ kind: 'OTHER' })
    expect(parseInbound('Can we move to Friday?')).toEqual({ kind: 'OTHER' })
    expect(parseInbound('')).toEqual({ kind: 'OTHER' })
  })
})
```

`modules/sms/templates.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/lib/brand'
import { plain, smsTemplates } from './templates'

const samples = [
  smsTemplates.otp('123456'),
  smsTemplates.proVisitConfirmed({ agentFirstName: 'Maya', slot: 'Wed, Jul 1, 10:00 AM' }),
  smsTemplates.proReminder({ agentFirstName: 'Maya', slot: 'Wed, Jul 1, 10:00 AM' }),
  smsTemplates.agentReminder({ businessName: 'Boston Concrete', slot: 'Wed, Jul 1, 10:00 AM' }),
  smsTemplates.proPostVisit({ agentFirstName: 'Maya' }),
  smsTemplates.agentNoShowCheck({ businessName: 'Boston Concrete' }),
  smsTemplates.agentMissionReleased({ businessName: 'Boston Concrete' }),
  smsTemplates.agentValidated({ amount: '$44.00' }),
  smsTemplates.agentNeedsFix({ message: 'Add 2 more photos.' }),
  smsTemplates.agentRejected({ reason: 'Check-in too far from the business.' }),
]

describe('smsTemplates', () => {
  it('chaque message commence par la marque', () => {
    for (const s of samples) expect(s.startsWith(BRAND_NAME)).toBe(true)
  })
  it('aucun message ne se présente comme Google ni ne parle d’avis', () => {
    for (const s of samples) {
      expect(s).not.toMatch(/from google|google team|on behalf of google|google partner/i)
      expect(s).not.toMatch(/review|stars?\b/i)
    }
  })
  it('n’utilise que des caractères simples (pas de tiret long ni d’apostrophe typographique)', () => {
    for (const s of samples) expect(s).not.toMatch(/[–—’‘“”]/)
  })
  it('nettoie la typographie tapée par un admin', () => {
    expect(plain('L’adresse — « fausse » “ici”')).toBe("L'adresse - « fausse » \"ici\"")
    expect(smsTemplates.agentNeedsFix({ message: 'Add the owner’s truck – please.' })).not.toMatch(/[–—’‘“”]/)
  })
  it('le SMS après visite donne la consigne de réponse', () => {
    expect(smsTemplates.proPostVisit({ agentFirstName: 'Maya' })).toContain('Reply 1-5')
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run modules/sms/sms-rule.test.ts modules/sms/templates.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `modules/sms/sms-rule.ts` et `modules/sms/templates.ts`**

`modules/sms/sms-rule.ts` :

```ts
/** Numéro US (plan NANP) → E.164 « +1XXXXXXXXXX », ou null si ce n'est pas un numéro US valide. */
export function normalizeUsPhone(input: string): string | null {
  const compact = input.replace(/[\s().-]/g, '')
  const international = compact.startsWith('+')
  let digits = international ? compact.slice(1) : compact
  if (!/^\d+$/.test(digits)) return null
  if (international && digits.length !== 11) return null
  if (digits.length === 10) digits = '1' + digits
  // Indicatif régional et central ne commencent jamais par 0 ou 1.
  if (!/^1[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return '+' + digits
}

export type InboundReply = { kind: 'RATING'; value: 1 | 2 | 3 | 4 | 5 } | { kind: 'DENIED' } | { kind: 'OTHER' }

/** Réponse d'un pro au SMS après visite : une note 1–5, « NO », ou autre chose. */
export function parseInbound(body: string): InboundReply {
  const t = body.trim().toUpperCase().replace(/[.!]+$/, '')
  if (/^[1-5]$/.test(t)) return { kind: 'RATING', value: Number(t) as 1 | 2 | 3 | 4 | 5 }
  if (t === 'NO' || t === 'NOPE') return { kind: 'DENIED' }
  return { kind: 'OTHER' }
}
```

`modules/sms/templates.ts` :

```ts
import { BRAND_NAME } from '@/lib/brand'

/** Remplace la typographie qu'un clavier français ajoute (’ “ ” – —) par des caractères simples. */
export function plain(text: string): string {
  return text.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
}

// Textes des SMS. Règles : commencer par la marque, ne jamais se présenter comme Google, ne jamais
// parler d'avis, n'utiliser que des caractères simples (un tiret long fait passer le SMS en Unicode
// et réduit sa longueur à 70 caractères).
export const smsTemplates = {
  otp: (code: string) =>
    `${BRAND_NAME}: your code is ${code}. It expires in 10 minutes. Never share it.`,
  proVisitConfirmed: (p: { agentFirstName: string; slot: string }) =>
    `${BRAND_NAME}: ${plain(p.agentFirstName)} will visit you on ${p.slot} to help set up your free Google Business Profile, as agreed on the phone. Reply here if you need to change anything.`,
  proReminder: (p: { agentFirstName: string; slot: string }) =>
    `${BRAND_NAME} reminder: ${plain(p.agentFirstName)} visits you tomorrow, ${p.slot}.`,
  agentReminder: (p: { businessName: string; slot: string }) =>
    `${BRAND_NAME} reminder: your visit to ${plain(p.businessName)} is on ${p.slot}. Open the app before you go.`,
  proPostVisit: (p: { agentFirstName: string }) =>
    `${BRAND_NAME}: did ${plain(p.agentFirstName)} visit you today? Reply 1-5 to rate the visit, or NO if no one came.`,
  agentNoShowCheck: (p: { businessName: string }) =>
    `${BRAND_NAME}: we have not received your check-in for ${plain(p.businessName)}. Did you visit? Open the app to sync your visit.`,
  agentMissionReleased: (p: { businessName: string }) =>
    `${BRAND_NAME}: your mission at ${plain(p.businessName)} was released because no check-in was received within 24 hours.`,
  agentValidated: (p: { amount: string }) =>
    `${BRAND_NAME}: your visit was validated. ${p.amount} was added to your balance.`,
  agentNeedsFix: (p: { message: string }) =>
    `${BRAND_NAME}: your visit needs a fix: ${plain(p.message)} Open the app to complete it within 7 days.`,
  agentRejected: (p: { reason: string }) =>
    `${BRAND_NAME}: your visit was not validated. Reason: ${plain(p.reason)}`,
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run modules/sms/sms-rule.test.ts modules/sms/templates.test.ts`
Expected: PASS (21 tests : 16 + 5).

- [ ] **Step 5: Commit**

```bash
git add modules/sms/sms-rule.ts modules/sms/sms-rule.test.ts modules/sms/templates.ts modules/sms/templates.test.ts
git commit -m "feat(sms): US phone normalization, reply parsing and templates"
```

### Task 11: Signature des webhooks Twilio

**Files:**
- Create: `modules/sms/twilio-signature.ts`
- Test: `modules/sms/twilio-signature.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

La valeur attendue est l'exemple officiel de la documentation Twilio (« Validating requests »), recalculé indépendamment.

```ts
import { describe, expect, it } from 'vitest'
import { computeTwilioSignature, isValidTwilioSignature } from './twilio-signature'

const url = 'https://mycompany.com/myapp.php?foo=1&bar=2'
const params = {
  CallSid: 'CA1234567890ABCDE',
  Caller: '+12349013030',
  Digits: '1234',
  From: '+12349013030',
  To: '+18005551212',
}

describe('signature Twilio', () => {
  it('reproduit l’exemple de la documentation', () => {
    expect(computeTwilioSignature('12345', url, params)).toBe('0/KCTR6DLpKmkAf8muzZqo1nDgQ=')
  })
  it('accepte la bonne signature', () => {
    expect(isValidTwilioSignature('12345', url, params, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(true)
  })
  it('refuse une signature absente, fausse, ou des paramètres modifiés', () => {
    expect(isValidTwilioSignature('12345', url, params, null)).toBe(false)
    expect(isValidTwilioSignature('12345', url, params, 'AAAA')).toBe(false)
    expect(isValidTwilioSignature('12345', url, { ...params, Digits: '9999' }, '0/KCTR6DLpKmkAf8muzZqo1nDgQ=')).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/sms/twilio-signature.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/sms/twilio-signature.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

// Twilio signe chaque webhook : HMAC-SHA1 (clé = auth token) de l'URL publique complète suivie des
// paramètres POST triés par nom (nom puis valeur, concaténés), encodé en base64.
export function computeTwilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join('')
  return createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64')
}

export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
  signature: string | null,
): boolean {
  if (!signature) return false
  const expected = Buffer.from(computeTwilioSignature(authToken, url, params))
  const received = Buffer.from(signature)
  return expected.length === received.length && timingSafeEqual(expected, received)
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/sms/twilio-signature.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/sms/twilio-signature.ts modules/sms/twilio-signature.test.ts
git commit -m "feat(sms): Twilio webhook signature check"
```

### Task 12: Codes à usage unique (`modules/recruitment/otp-rule.ts`)

**Files:**
- Create: `modules/recruitment/otp-rule.ts`
- Test: `modules/recruitment/otp-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { OTP_MAX_ATTEMPTS, canIssueOtp, generateOtpCode, hashOtp, otpMatches, otpUsable } from './otp-rule'

const secret = 'test-secret-test-secret-test-secret-1234'
const now = new Date('2026-10-16T12:00:00Z')

describe('generateOtpCode', () => {
  it('produit 6 chiffres, zéros compris', () => {
    for (let i = 0; i < 200; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/)
  })
})

describe('hashOtp / otpMatches', () => {
  it('l’empreinte dépend du code et du numéro', () => {
    const h = hashOtp('123456', '+16175551234', secret)
    expect(otpMatches('123456', '+16175551234', secret, h)).toBe(true)
    expect(otpMatches('123457', '+16175551234', secret, h)).toBe(false)
    expect(otpMatches('123456', '+16175559999', secret, h)).toBe(false)
  })
})

describe('canIssueOtp', () => {
  it('3 codes maximum par fenêtre', () => {
    expect(canIssueOtp(2)).toBe(true)
    expect(canIssueOtp(3)).toBe(false)
  })
})

describe('otpUsable', () => {
  const base = { expiresAt: new Date(now.getTime() + 60_000), attempts: 0, usedAt: null }
  it('utilisable s’il n’est ni expiré, ni utilisé, ni épuisé', () => {
    expect(otpUsable(base, now)).toBe(true)
  })
  it('refusé après expiration, utilisation ou trop d’essais', () => {
    expect(otpUsable({ ...base, expiresAt: now }, now)).toBe(false)
    expect(otpUsable({ ...base, usedAt: now }, now)).toBe(false)
    expect(otpUsable({ ...base, attempts: OTP_MAX_ATTEMPTS }, now)).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/recruitment/otp-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/recruitment/otp-rule.ts`**

```ts
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

export const OTP_TTL_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_MAX_PER_WINDOW = 3
export const OTP_WINDOW_MINUTES = 15

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Empreinte HMAC du code lié au numéro : un code volé en base ne sert à rien. */
export function hashOtp(code: string, phone: string, secret: string): string {
  return createHmac('sha256', secret).update(`${phone}:${code}`).digest('hex')
}

export function otpMatches(code: string, phone: string, secret: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code, phone, secret), 'hex')
  const b = Buffer.from(hash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** `recentCount` = codes déjà émis pour ce numéro dans les OTP_WINDOW_MINUTES dernières minutes. */
export function canIssueOtp(recentCount: number): boolean {
  return recentCount < OTP_MAX_PER_WINDOW
}

export function otpUsable(otp: { expiresAt: Date; attempts: number; usedAt: Date | null }, now: Date): boolean {
  return !otp.usedAt && otp.expiresAt > now && otp.attempts < OTP_MAX_ATTEMPTS
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/recruitment/otp-rule.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/recruitment/otp-rule.ts modules/recruitment/otp-rule.test.ts
git commit -m "feat(recruitment): one-time code rules"
```

### Task 13: Statuts d'un agent (`modules/agents/agent-rule.ts`)

**Files:**
- Create: `modules/agents/agent-rule.ts`
- Test: `modules/agents/agent-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { canTransitionAgent, isAdult } from './agent-rule'

describe('canTransitionAgent (spec §7.1)', () => {
  it.each([
    ['APPLICANT', 'TRAINING'],
    ['TRAINING', 'CERTIFIED'],
    ['TRAINING', 'LOCKED'],
    ['LOCKED', 'TRAINING'],
    ['LOCKED', 'REFUSED'],
    ['CERTIFIED', 'ACTIVE'],
    ['ACTIVE', 'SUSPENDED'],
    ['SUSPENDED', 'ACTIVE'],
  ] as const)('%s → %s autorisé', (from, to) => {
    expect(canTransitionAgent(from, to)).toBe(true)
  })

  it.each([
    ['APPLICANT', 'ACTIVE'],
    ['TRAINING', 'ACTIVE'],
    ['REFUSED', 'TRAINING'],
    ['CERTIFIED', 'SUSPENDED'],
    ['SUSPENDED', 'TRAINING'],
  ] as const)('%s → %s refusé', (from, to) => {
    expect(canTransitionAgent(from, to)).toBe(false)
  })
})

describe('isAdult', () => {
  const now = new Date('2026-10-16T12:00:00Z')
  it('18 ans le jour même', () => {
    expect(isAdult(new Date('2008-10-16T00:00:00Z'), now)).toBe(true)
  })
  it('17 ans la veille de ses 18 ans', () => {
    expect(isAdult(new Date('2008-10-17T00:00:00Z'), now)).toBe(false)
  })
  it('largement majeur', () => {
    expect(isAdult(new Date('1990-01-01T00:00:00Z'), now)).toBe(true)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/agents/agent-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/agents/agent-rule.ts`**

```ts
import type { AgentStatus } from '@prisma/client'

// Machine d'état d'un agent (spec §7.1). En phase 1, CERTIFIED → ACTIVE à la signature du contrat ;
// la phase 2 ajoutera la condition Stripe dans modules/contract.
export const AGENT_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = {
  APPLICANT: ['TRAINING'],
  TRAINING: ['CERTIFIED', 'LOCKED'],
  LOCKED: ['TRAINING', 'REFUSED'],
  REFUSED: [],
  CERTIFIED: ['ACTIVE'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
}

export function canTransitionAgent(from: AgentStatus, to: AgentStatus): boolean {
  return AGENT_TRANSITIONS[from].includes(to)
}

/** 18 ans révolus à la date `now` (dates comparées en UTC). */
export function isAdult(birthDate: Date, now: Date): boolean {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear()
  const m = now.getUTCMonth() - birthDate.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < birthDate.getUTCDate())) age--
  return age >= 18
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/agents/agent-rule.test.ts`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/agents/agent-rule.ts modules/agents/agent-rule.test.ts
git commit -m "feat(agents): agent status machine and age check"
```

### Task 14: Formulaire de candidature (`modules/recruitment/apply-rule.ts`)

**Files:**
- Create: `modules/recruitment/apply-rule.ts`
- Test: `modules/recruitment/apply-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { AVAILABILITY_SLOTS, parseApplication } from './apply-rule'

const now = new Date('2026-10-16T12:00:00Z')
const valid = {
  firstName: '  Maya ',
  lastName: 'Thompson-Okafor',
  email: ' Maya.T@Example.com ',
  phone: '(617) 555-1234',
  birthDate: '2005-03-14',
  zip: '02116',
  radiusMiles: '25',
  hasCar: 'yes',
  availability: ['mon-am', 'wed-pm'],
  confirm18: 'on',
}

describe('parseApplication', () => {
  it('normalise une candidature valide', () => {
    const r = parseApplication(valid, now)
    expect(r.success).toBe(true)
    if (!r.success) return
    expect(r.data).toMatchObject({
      firstName: 'Maya',
      email: 'maya.t@example.com',
      phone: '+16175551234',
      zip: '02116',
      radiusMiles: 25,
      hasCar: true,
      availability: ['mon-am', 'wed-pm'],
    })
    expect(r.data.birthDate.toISOString()).toBe('2005-03-14T00:00:00.000Z')
  })

  it('refuse un mineur', () => {
    const r = parseApplication({ ...valid, birthDate: '2009-01-01' }, now)
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some((i) => i.message === 'You must be 18 or older')).toBe(true)
  })

  it.each([
    ['phone', '+33 6 49 70 73 24'],
    ['zip', '2116'],
    ['radiusMiles', '30'],
    ['email', 'not-an-email'],
    ['availability', []],
    ['confirm18', undefined],
    ['birthDate', '14/03/2005'],
    ['birthDate', '2005-02-30'],
  ])('refuse un champ %s invalide', (field, value) => {
    expect(parseApplication({ ...valid, [field]: value }, now).success).toBe(false)
  })

  it('propose 14 créneaux de disponibilité', () => {
    expect(AVAILABILITY_SLOTS).toHaveLength(14)
    expect(AVAILABILITY_SLOTS[0]).toBe('mon-am')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/recruitment/apply-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/recruitment/apply-rule.ts`**

```ts
import { z } from 'zod'
import { isAdult } from '@/modules/agents/agent-rule'
import { normalizeUsPhone } from '@/modules/sms/sms-rule'

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export const AVAILABILITY_SLOTS: string[] = DAYS.flatMap((d) => [`${d}-am`, `${d}-pm`])
export const RADIUS_OPTIONS = [5, 10, 25, 50] as const

// Messages en anglais : ils s'affichent tels quels sur le formulaire de candidature.
export function applicationSchema(now: Date) {
  return z.object({
    firstName: z.string().trim().min(1, 'Enter your first name').max(60),
    lastName: z.string().trim().min(1, 'Enter your last name').max(60),
    email: z.string().trim().toLowerCase().pipe(z.email({ message: 'Enter a valid email' })),
    phone: z.string().transform((v, ctx) => {
      const phone = normalizeUsPhone(v)
      if (!phone) {
        ctx.addIssue({ code: 'custom', message: 'Enter a valid US mobile number' })
        return z.NEVER
      }
      return phone
    }),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter your date of birth')
      // Refuse les dates impossibles (2005-02-30), que Date convertirait silencieusement en 2 mars.
      .refine((s) => {
        const d = new Date(`${s}T00:00:00Z`)
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
      }, 'Enter your date of birth')
      .transform((s) => new Date(`${s}T00:00:00Z`))
      .refine((d) => isAdult(d, now), 'You must be 18 or older'),
    zip: z.string().trim().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
    radiusMiles: z.coerce.number().refine((n) => (RADIUS_OPTIONS as readonly number[]).includes(n), 'Choose a travel radius'),
    hasCar: z.enum(['yes', 'no'], { message: 'Tell us if you have a car' }).transform((v) => v === 'yes'),
    availability: z
      .array(z.string().refine((s) => AVAILABILITY_SLOTS.includes(s), 'Unknown time slot'))
      .min(1, 'Pick at least one time slot'),
    confirm18: z.literal('on', { message: 'Confirm you are 18 or older' }),
  })
}

export type Application = z.output<ReturnType<typeof applicationSchema>>

export function parseApplication(input: Record<string, unknown>, now: Date = new Date()) {
  return applicationSchema(now).safeParse(input)
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/recruitment/apply-rule.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/recruitment/apply-rule.ts modules/recruitment/apply-rule.test.ts
git commit -m "feat(recruitment): application form validation"
```

### Task 15: Contenu de formation et quiz (`modules/academy`)

**Files:**
- Create: `modules/academy/content.ts`, `modules/academy/quiz-rule.ts`
- Test: `modules/academy/quiz-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { ACADEMY_MODULES, allQuestions, quizForClient } from './content'
import { PASS_PCT, attemptOutcome, canAttempt, scoreQuiz } from './quiz-rule'

const questions = allQuestions()
const allRight = Object.fromEntries(questions.map((q) => [q.id, q.correctIndex]))
const now = new Date('2026-10-16T12:00:00Z')

describe('contenu', () => {
  it('5 modules, des identifiants de question uniques, une bonne réponse valide par question', () => {
    expect(ACADEMY_MODULES).toHaveLength(5)
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length)
    for (const q of questions) expect(q.correctIndex).toBeLessThan(q.options.length)
  })
  it('la version envoyée au navigateur ne contient pas les réponses', () => {
    expect(JSON.stringify(quizForClient())).not.toContain('correctIndex')
  })
})

describe('scoreQuiz', () => {
  it('100 % si tout est juste, 0 % si rien n’est répondu', () => {
    expect(scoreQuiz(questions, allRight)).toBe(100)
    expect(scoreQuiz(questions, {})).toBe(0)
  })
  it('arrondi vers le bas', () => {
    const qs = [{ id: 'a', correctIndex: 0 }, { id: 'b', correctIndex: 0 }, { id: 'c', correctIndex: 0 }]
    expect(scoreQuiz(qs, { a: 0, b: 0, c: 1 })).toBe(66)
  })
})

describe('attemptOutcome', () => {
  it(`réussi à partir de ${PASS_PCT} %`, () => {
    expect(attemptOutcome(80, 2)).toEqual({ passed: true, failedAttempts: 2, lock: false })
  })
  it('verrouille au 3e échec', () => {
    expect(attemptOutcome(79, 0)).toEqual({ passed: false, failedAttempts: 1, lock: false })
    expect(attemptOutcome(50, 2)).toEqual({ passed: false, failedAttempts: 3, lock: true })
  })
})

describe('canAttempt', () => {
  it('premier essai possible en TRAINING', () => {
    expect(canAttempt({ status: 'TRAINING', failedAttempts: 0, lastAttemptAt: null }, now)).toEqual({ ok: true })
  })
  it('24 h d’attente après un échec', () => {
    const last = new Date(now.getTime() - 23 * 3_600_000)
    const r = canAttempt({ status: 'TRAINING', failedAttempts: 1, lastAttemptAt: last }, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.retryAt?.toISOString()).toBe(new Date(last.getTime() + 24 * 3_600_000).toISOString())
    expect(canAttempt({ status: 'TRAINING', failedAttempts: 1, lastAttemptAt: new Date(now.getTime() - 25 * 3_600_000) }, now).ok).toBe(true)
  })
  it('impossible hors TRAINING', () => {
    expect(canAttempt({ status: 'LOCKED', failedAttempts: 3, lastAttemptAt: null }, now).ok).toBe(false)
    expect(canAttempt({ status: 'CERTIFIED', failedAttempts: 0, lastAttemptAt: null }, now).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/academy`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `modules/academy/content.ts`**

Les vidéos ne sont pas encore tournées (spec §14) : chaque module a un résumé écrit qui suffit pour la phase 1, et `videoUrl` reste `null` jusqu'à ce qu'une vidéo existe.

```ts
import { BRAND_NAME } from '@/lib/brand'

export interface QuizQuestion { id: string; prompt: string; options: string[]; correctIndex: number }
export interface AcademyModule {
  id: string
  title: string
  minutes: number
  videoUrl: string | null
  summary: string[]
  questions: QuizQuestion[]
}

export const ACADEMY_MODULES: AcademyModule[] = [
  {
    id: 'why',
    title: 'Why a Google Business Profile matters',
    minutes: 4,
    videoUrl: null,
    summary: [
      'Most people find local contractors on Google Maps.',
      'A verified profile shows the business with its phone number, hours and photos.',
      'The profile is free and always belongs to the business owner.',
      'You help owners set it up correctly, on their own phone and their own Google account.',
    ],
    questions: [
      { id: 'why-1', prompt: 'Who owns the profile you help set up?', options: ['The business owner', `${BRAND_NAME}`, 'You, the field agent', 'A Google employee'], correctIndex: 0 },
      { id: 'why-2', prompt: 'How much does a Google Business Profile cost the owner?', options: ['$99 setup fee', 'Nothing, it is free', '$25 per month', 'It depends on the city'], correctIndex: 1 },
      { id: 'why-3', prompt: 'Whose Google account is the profile created with?', options: ['Yours', `${BRAND_NAME}’s`, 'The owner’s own account', 'Any account works'], correctIndex: 2 },
    ],
  },
  {
    id: 'visit',
    title: 'How a visit works',
    minutes: 5,
    videoUrl: null,
    summary: [
      'Open the mission in the app before you leave, so it works even with poor signal.',
      'Check in when you arrive, then ask the owner to sign the consent on your screen.',
      'The owner creates (or claims) the profile on their own phone. You guide; they type.',
      'The owner invites our manager email, you take at least 10 photos, then you help with verification and check out.',
      'If the owner has no Google account, help them create one on their own phone, with their own password.',
    ],
    questions: [
      { id: 'visit-1', prompt: 'What do you do first when you arrive?', options: ['Take photos', 'Check in in the app', 'Ask for the owner’s password', 'Call support'], correctIndex: 1 },
      { id: 'visit-2', prompt: 'The owner has no Google account. What do you do?', options: ['Create one for them with your email', `Use the ${BRAND_NAME} account`, 'Help them create one on their own phone, with their own password', 'Cancel the visit'], correctIndex: 2 },
      { id: 'visit-3', prompt: 'How many photos do you need at minimum?', options: ['3', '5', '10', '25'], correctIndex: 2 },
    ],
  },
  {
    id: 'photos',
    title: 'Photos that work',
    minutes: 4,
    videoUrl: null,
    summary: [
      'Real photos of the business, taken during the visit: logo or sign, branded vehicle, team, equipment, finished jobs.',
      'No stock images, no screenshots, no text added on top.',
      'Ask people before you photograph them.',
      'Landscape, well lit, in focus.',
    ],
    questions: [
      { id: 'photos-1', prompt: 'Which photo is fine to submit?', options: ['The owner’s branded truck, taken today', 'A stock image of a nice patio', 'A screenshot of a competitor’s work', 'A blurry photo of the sign'], correctIndex: 0 },
      { id: 'photos-2', prompt: 'Before photographing team members, you…', options: ['Ask for their consent', 'Blur their faces later', 'Take it quickly', 'Ask the owner only'], correctIndex: 0 },
      { id: 'photos-3', prompt: 'Can you add the business phone number as text on a photo?', options: ['Yes, it helps', 'No, never add text on photos', 'Only on the logo', 'Only in big cities'], correctIndex: 1 },
    ],
  },
  {
    id: 'verification',
    title: 'Helping with verification',
    minutes: 5,
    videoUrl: null,
    summary: [
      'Google decides how a profile is verified. Sometimes it asks for a short video.',
      'The owner records the video from their own account. Never from yours.',
      'A good video shows where the business is (street, signage), its equipment or branded vehicle, and proof the owner runs it (opening the shop, using the tools).',
      'If Google does not offer verification yet, select “Not offered yet”. That is normal.',
    ],
    questions: [
      { id: 'verif-1', prompt: 'Who records the verification video?', options: ['You, from your account', 'The owner, from their own account', `${BRAND_NAME} support`, 'Nobody, it is optional'], correctIndex: 1 },
      { id: 'verif-2', prompt: 'Google does not offer verification during your visit. What do you do?', options: ['Select “Not offered yet” and finish the visit', 'Leave without checking out', 'Ask the owner to pay for faster verification', 'Try from your own phone'], correctIndex: 0 },
      { id: 'verif-3', prompt: 'What should a verification video show?', options: ['Only the owner’s face', 'The location, the equipment, and proof the owner runs the business', 'Your ID card', 'The inside of your car'], correctIndex: 1 },
    ],
  },
  {
    id: 'rules',
    title: 'The rules',
    minutes: 4,
    videoUrl: null,
    summary: [
      `You never say you are from Google. You are an independent field agent with ${BRAND_NAME}.`,
      'You never ask for, type or write down an owner’s password.',
      'You never talk about or ask for reviews. Agents are never involved with reviews.',
      'The profile always uses the business’s real name and real address or service area.',
      'If something feels wrong, leave and contact support.',
    ],
    questions: [
      { id: 'rules-1', prompt: 'How do you introduce yourself?', options: ['“I’m from Google.”', '“I’m a Google partner.”', `“I’m a field agent with ${BRAND_NAME}, helping local contractors set up their free Google profile.”`, '“I’m calling on behalf of Google Maps.”'], correctIndex: 2 },
      { id: 'rules-2', prompt: 'The owner asks you to type their password for them.', options: ['Type it quickly', 'Hand the phone back and let them type it', 'Write it down for later', 'Ask them to text it to you'], correctIndex: 1 },
      { id: 'rules-3', prompt: 'The owner asks if you can leave them a 5-star review.', options: ['Agree, it helps them', 'Explain that agents never handle reviews', 'Ask a friend to do it', 'Do it after the visit'], correctIndex: 1 },
      { id: 'rules-4', prompt: 'Which business name goes on the profile?', options: ['The real name on their sign or license', 'Their name plus keywords like “Best Concrete Boston”', 'A shorter, catchier name', `${BRAND_NAME}’s name`], correctIndex: 0 },
    ],
  },
]

export function allQuestions(): QuizQuestion[] {
  return ACADEMY_MODULES.flatMap((m) => m.questions)
}

/** Questions sans les bonnes réponses, pour la page du quiz. */
export function quizForClient() {
  return ACADEMY_MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    questions: m.questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
  }))
}
```

- [ ] **Step 4: Écrire `modules/academy/quiz-rule.ts`**

```ts
import type { AgentStatus } from '@prisma/client'

export const PASS_PCT = 80
export const MAX_FAILED_ATTEMPTS = 3
export const RETRY_DELAY_HOURS = 24

/** Pourcentage de bonnes réponses, arrondi vers le bas. */
export function scoreQuiz(
  questions: { id: string; correctIndex: number }[],
  answers: Record<string, number | undefined>,
): number {
  if (questions.length === 0) return 0
  const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length
  return Math.floor((correct * 100) / questions.length)
}

export function attemptOutcome(score: number, failedAttempts: number): { passed: boolean; failedAttempts: number; lock: boolean } {
  if (score >= PASS_PCT) return { passed: true, failedAttempts, lock: false }
  const n = failedAttempts + 1
  return { passed: false, failedAttempts: n, lock: n >= MAX_FAILED_ATTEMPTS }
}

export function canAttempt(
  agent: { status: AgentStatus; failedAttempts: number; lastAttemptAt: Date | null },
  now: Date,
): { ok: true } | { ok: false; reason: string; retryAt?: Date } {
  if (agent.status !== 'TRAINING') return { ok: false, reason: 'The quiz is not available for your account right now.' }
  if (agent.failedAttempts > 0 && agent.lastAttemptAt) {
    const retryAt = new Date(agent.lastAttemptAt.getTime() + RETRY_DELAY_HOURS * 3_600_000)
    if (now < retryAt) return { ok: false, reason: `You can retry the quiz ${RETRY_DELAY_HOURS} hours after your last attempt.`, retryAt }
  }
  return { ok: true }
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run modules/academy`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add modules/academy
git commit -m "feat(academy): training content and quiz rules"
```


## Chunk 4: Règles pures — gains, missions, pros, dispatch

### Task 16: Calcul des gains (`modules/ledger/ledger-rule.ts`)

**Files:**
- Create: `modules/ledger/ledger-rule.ts`
- Test: `modules/ledger/ledger-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/modules/settings/defaults'
import { checkEligibility, computeAmount, levelFor } from './ledger-rule'

const settings = DEFAULT_SETTINGS
const DAY = 86_400_000
const now = new Date('2026-10-16T12:00:00Z')

describe('levelFor (spec §6.2)', () => {
  it.each([
    [0, 'BRONZE'], [4, 'BRONZE'], [5, 'SILVER'], [14, 'SILVER'], [15, 'GOLD'], [100, 'GOLD'],
  ] as const)('%i missions validées → %s', (n, level) => {
    expect(levelFor(n, settings.levels).name).toBe(level)
  })
})

describe('computeAmount', () => {
  it('VISIT au niveau Bronze', () => {
    expect(computeAmount({ tier: 'VISIT', validatedCount: 1, urgencyBonusCents: 0, settings }))
      .toEqual({ baseAmountCents: 4000, levelBonusPct: 0, amountCents: 4000 })
  })
  it('VISIT au niveau Silver (5e mission validée comprise)', () => {
    expect(computeAmount({ tier: 'VISIT', validatedCount: 5, urgencyBonusCents: 0, settings }).amountCents).toBe(4400)
  })
  it('LIVE au niveau Gold', () => {
    expect(computeAmount({ tier: 'LIVE', validatedCount: 15, urgencyBonusCents: 0, settings }).amountCents).toBe(3000)
  })
  it('URGENCY : montant de la mission, sans bonus de niveau', () => {
    expect(computeAmount({ tier: 'URGENCY', validatedCount: 20, urgencyBonusCents: 1500, settings }))
      .toEqual({ baseAmountCents: 1500, levelBonusPct: 0, amountCents: 1500 })
  })
  it('arrondit le bonus au cent le plus proche', () => {
    const custom = { ...settings, tierAmountsCents: { ...settings.tierAmountsCents, RETURN_VISIT: 3333 } }
    expect(computeAmount({ tier: 'RETURN_VISIT', validatedCount: 5, urgencyBonusCents: 0, settings: custom }).amountCents).toBe(3666)
  })
})

describe('checkEligibility (spec §6.3)', () => {
  const visit = { type: 'VISIT' as const, status: 'VALIDATED' as const, urgencyBonusCents: 0, validatedAt: new Date(now.getTime() - 10 * DAY) }

  it('VISIT : mission VISIT validée', () => {
    expect(checkEligibility({ tier: 'VISIT', mission: visit, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'VISIT', mission: { ...visit, status: 'SUBMITTED' }, now }).ok).toBe(false)
    expect(checkEligibility({ tier: 'VISIT', mission: { ...visit, type: 'RETURN_VISIT' }, now }).ok).toBe(false)
  })
  it('RETURN_VISIT : mission de retour validée', () => {
    expect(checkEligibility({ tier: 'RETURN_VISIT', mission: { ...visit, type: 'RETURN_VISIT' }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'RETURN_VISIT', mission: visit, now }).ok).toBe(false)
  })
  it('URGENCY : seulement avec un bonus', () => {
    expect(checkEligibility({ tier: 'URGENCY', mission: { ...visit, urgencyBonusCents: 1000 }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'URGENCY', mission: visit, now }).ok).toBe(false)
  })
  it('LIVE : dans les 60 jours après la validation de la visite', () => {
    expect(checkEligibility({ tier: 'LIVE', mission: { ...visit, validatedAt: new Date(now.getTime() - 60 * DAY) }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'LIVE', mission: { ...visit, validatedAt: new Date(now.getTime() - 61 * DAY) }, now }).ok).toBe(false)
  })
  it('CLIENT : dans les 90 jours', () => {
    expect(checkEligibility({ tier: 'CLIENT', mission: { ...visit, validatedAt: new Date(now.getTime() - 89 * DAY) }, now }).ok).toBe(true)
    expect(checkEligibility({ tier: 'CLIENT', mission: { ...visit, validatedAt: new Date(now.getTime() - 91 * DAY) }, now }).ok).toBe(false)
  })
  it('LIVE et CLIENT exigent la mission VISIT d’origine', () => {
    expect(checkEligibility({ tier: 'LIVE', mission: { ...visit, type: 'RETURN_VISIT' }, now }).ok).toBe(false)
    expect(checkEligibility({ tier: 'CLIENT', mission: { ...visit, status: 'REJECTED' }, now }).ok).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/ledger/ledger-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/ledger/ledger-rule.ts`**

```ts
import type { EarningTier, MissionStatus, MissionType } from '@prisma/client'
import type { Settings } from '@/modules/settings/defaults'

export const LIVE_WINDOW_DAYS = 60
export const CLIENT_WINDOW_DAYS = 90
const DAY_MS = 86_400_000

export function levelFor(validatedCount: number, levels: Settings['levels']): Settings['levels'][number] {
  const sorted = [...levels].sort((a, b) => a.minValidated - b.minValidated)
  let current = sorted[0]
  for (const level of sorted) if (validatedCount >= level.minValidated) current = level
  return current
}

/**
 * Montant d'un gain. `validatedCount` = missions VALIDATED de l'agent au moment de la création du gain,
 * mission courante comprise. URGENCY reprend le bonus de la mission, sans bonus de niveau.
 */
export function computeAmount(input: {
  tier: EarningTier
  validatedCount: number
  urgencyBonusCents: number
  settings: Pick<Settings, 'tierAmountsCents' | 'levels'>
}): { baseAmountCents: number; levelBonusPct: number; amountCents: number } {
  if (input.tier === 'URGENCY') {
    return { baseAmountCents: input.urgencyBonusCents, levelBonusPct: 0, amountCents: input.urgencyBonusCents }
  }
  const base = input.settings.tierAmountsCents[input.tier]
  const pct = levelFor(input.validatedCount, input.settings.levels).bonusPct
  return { baseAmountCents: base, levelBonusPct: pct, amountCents: base + Math.round((base * pct) / 100) }
}

export type Eligibility = { ok: true } | { ok: false; reason: string }

/**
 * Un gain se rattache toujours à une mission. Pour LIVE et CLIENT, c'est la mission VISIT d'origine
 * du pro (spec §6.1) ; les délais sont comptés depuis sa validation (spec §6.3).
 */
export function checkEligibility(input: {
  tier: EarningTier
  mission: { type: MissionType; status: MissionStatus; urgencyBonusCents: number; validatedAt: Date | null }
  now: Date
}): Eligibility {
  const { tier, mission, now } = input
  if (mission.status !== 'VALIDATED') return { ok: false, reason: 'mission non validée' }
  switch (tier) {
    case 'VISIT':
      return mission.type === 'VISIT' ? { ok: true } : { ok: false, reason: 'palier VISIT réservé aux missions VISIT' }
    case 'RETURN_VISIT':
      return mission.type === 'RETURN_VISIT' ? { ok: true } : { ok: false, reason: 'palier RETURN_VISIT réservé aux missions de retour' }
    case 'URGENCY':
      return mission.urgencyBonusCents > 0 ? { ok: true } : { ok: false, reason: 'aucun bonus urgence sur cette mission' }
    case 'LIVE':
    case 'CLIENT': {
      if (mission.type !== 'VISIT' || !mission.validatedAt) return { ok: false, reason: 'il faut la mission VISIT d’origine' }
      const days = tier === 'LIVE' ? LIVE_WINDOW_DAYS : CLIENT_WINDOW_DAYS
      if (now.getTime() - mission.validatedAt.getTime() > days * DAY_MS) return { ok: false, reason: `délai de ${days} jours dépassé` }
      return { ok: true }
    }
  }
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/ledger/ledger-rule.test.ts`
Expected: PASS (17 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/ledger/ledger-rule.ts modules/ledger/ledger-rule.test.ts
git commit -m "feat(ledger): earning amounts, levels and eligibility"
```

### Task 17: Cycle de vie d'une mission (`modules/missions/mission-rule.ts`)

**Files:**
- Create: `modules/missions/mission-rule.ts`
- Test: `modules/missions/mission-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { canRelease, canTransitionMission, needsFixExpired, noShowAction, reminderDue } from './mission-rule'

const H = 3_600_000
const now = new Date('2026-10-16T12:00:00Z')
const at = (hours: number) => new Date(now.getTime() + hours * H)

describe('canTransitionMission (spec §7.2)', () => {
  it.each([
    ['OPEN', 'ACCEPTED'], ['OPEN', 'CANCELLED'],
    ['ACCEPTED', 'SUBMITTED'], ['ACCEPTED', 'OPEN'], ['ACCEPTED', 'CANCELLED'],
    ['SUBMITTED', 'VALIDATED'], ['SUBMITTED', 'NEEDS_FIX'], ['SUBMITTED', 'REJECTED'],
    ['NEEDS_FIX', 'SUBMITTED'], ['NEEDS_FIX', 'REJECTED'], ['NEEDS_FIX', 'CANCELLED'],
  ] as const)('%s → %s autorisé', (from, to) => {
    expect(canTransitionMission(from, to)).toBe(true)
  })
  it.each([
    ['OPEN', 'SUBMITTED'], ['SUBMITTED', 'CANCELLED'], ['VALIDATED', 'REJECTED'], ['REJECTED', 'OPEN'], ['CANCELLED', 'OPEN'],
  ] as const)('%s → %s refusé', (from, to) => {
    expect(canTransitionMission(from, to)).toBe(false)
  })
})

describe('canRelease', () => {
  it('possible jusqu’à 24 h avant le créneau', () => {
    expect(canRelease(at(24), now)).toBe(true)
    expect(canRelease(at(23.9), now)).toBe(false)
  })
})

describe('needsFixExpired', () => {
  it('7 jours sans nouvelle soumission', () => {
    expect(needsFixExpired(new Date(now.getTime() - 7 * 24 * H), now)).toBe(true)
    expect(needsFixExpired(new Date(now.getTime() - 6.9 * 24 * H), now)).toBe(false)
  })
})

describe('noShowAction (spec §4.5)', () => {
  const base = { hasCheckin: false, noShowSmsAt: null }
  it('rien avant 2 h après le créneau, ou si le check-in est reçu', () => {
    expect(noShowAction({ ...base, slotAt: at(-1.9) }, now)).toBe('NONE')
    expect(noShowAction({ ...base, slotAt: at(-30), hasCheckin: true }, now)).toBe('NONE')
  })
  it('SMS à l’agent à partir de 2 h, une seule fois', () => {
    expect(noShowAction({ ...base, slotAt: at(-2) }, now)).toBe('SMS')
    expect(noShowAction({ ...base, slotAt: at(-3), noShowSmsAt: at(-1) }, now)).toBe('NONE')
  })
  it('remise en OPEN à partir de 24 h', () => {
    expect(noShowAction({ ...base, slotAt: at(-24) }, now)).toBe('RELEASE')
    expect(noShowAction({ ...base, slotAt: at(-30), noShowSmsAt: at(-28) }, now)).toBe('RELEASE')
  })
})

describe('reminderDue', () => {
  const base = { status: 'ACCEPTED' as const, reminderSentAt: null, acceptedAt: at(-72) }
  it('dans les 24 h avant le créneau', () => {
    expect(reminderDue({ ...base, slotAt: at(20) }, now)).toBe(true)
    expect(reminderDue({ ...base, slotAt: at(25) }, now)).toBe(false)
  })
  it('jamais deux fois, jamais après le créneau, seulement si ACCEPTED', () => {
    expect(reminderDue({ ...base, slotAt: at(20), reminderSentAt: at(-1) }, now)).toBe(false)
    expect(reminderDue({ ...base, slotAt: at(-1) }, now)).toBe(false)
    expect(reminderDue({ ...base, status: 'OPEN', slotAt: at(20) }, now)).toBe(false)
  })
  it('pas de rappel si la mission a été acceptée moins de 24 h avant le créneau', () => {
    expect(reminderDue({ ...base, acceptedAt: at(-1), slotAt: at(20) }, now)).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/mission-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/mission-rule.ts`**

```ts
import type { MissionStatus } from '@prisma/client'

const H = 3_600_000

// Machine d'état d'une mission (spec §7.2). VALIDATED, REJECTED et CANCELLED sont finaux.
export const MISSION_TRANSITIONS: Record<MissionStatus, readonly MissionStatus[]> = {
  OPEN: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['SUBMITTED', 'OPEN', 'CANCELLED'],
  SUBMITTED: ['VALIDATED', 'NEEDS_FIX', 'REJECTED'],
  NEEDS_FIX: ['SUBMITTED', 'REJECTED', 'CANCELLED'],
  VALIDATED: [],
  REJECTED: [],
  CANCELLED: [],
}

export function canTransitionMission(from: MissionStatus, to: MissionStatus): boolean {
  return MISSION_TRANSITIONS[from].includes(to)
}

export const MAX_ACCEPTED_PER_AGENT = 3
export const RELEASE_MIN_HOURS = 24
export const NEEDS_FIX_DAYS = 7
export const NO_SHOW_SMS_HOURS = 2
export const NO_SHOW_RELEASE_HOURS = 24

/** Désistement possible jusqu'à 24 h avant le créneau. */
export function canRelease(slotAt: Date, now: Date): boolean {
  return slotAt.getTime() - now.getTime() >= RELEASE_MIN_HOURS * H
}

export function needsFixExpired(needsFixAt: Date, now: Date): boolean {
  return now.getTime() - needsFixAt.getTime() >= NEEDS_FIX_DAYS * 24 * H
}

/**
 * Que faire d'une mission ACCEPTED dont le check-in n'est pas arrivé (spec §4.5).
 * Les services remettent noShowSmsAt, reminderSentAt et acceptedAt à null quand la mission repasse OPEN
 * ou change de créneau, pour que le prochain agent reçoive rappel et relance.
 */
export function noShowAction(
  m: { slotAt: Date; hasCheckin: boolean; noShowSmsAt: Date | null },
  now: Date,
): 'NONE' | 'SMS' | 'RELEASE' {
  if (m.hasCheckin) return 'NONE'
  const elapsed = now.getTime() - m.slotAt.getTime()
  if (elapsed >= NO_SHOW_RELEASE_HOURS * H) return 'RELEASE'
  if (elapsed >= NO_SHOW_SMS_HOURS * H && !m.noShowSmsAt) return 'SMS'
  return 'NONE'
}

/**
 * Rappel la veille : dans les 24 h avant le créneau, une fois. Choix assumé : pas de rappel si la mission a été
 * acceptée moins de 24 h avant le créneau (le SMS de confirmation vient d'arriver).
 */
export function reminderDue(
  m: { status: MissionStatus; slotAt: Date; acceptedAt: Date | null; reminderSentAt: Date | null },
  now: Date,
): boolean {
  if (m.status !== 'ACCEPTED' || m.reminderSentAt || !m.acceptedAt) return false
  const untilSlot = m.slotAt.getTime() - now.getTime()
  if (untilSlot <= 0 || untilSlot > 24 * H) return false
  return m.slotAt.getTime() - m.acceptedAt.getTime() >= 24 * H
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/mission-rule.test.ts`
Expected: PASS (24 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/missions/mission-rule.ts modules/missions/mission-rule.test.ts
git commit -m "feat(missions): mission lifecycle rules"
```

### Task 18: Statuts d'un pro (`modules/missions/pro-rule.ts`)

**Files:**
- Create: `modules/missions/pro-rule.ts`
- Test: `modules/missions/pro-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { STATUSES_CANCELLED_ON_LOST, canCreateVisitFor, canSetProStatusManually, proStatusAfter } from './pro-rule'

describe('proStatusAfter (spec §7.3)', () => {
  it('création d’une mission VISIT : AGREED → MISSION_OPEN', () => {
    expect(proStatusAfter('AGREED', { kind: 'CREATED', missionType: 'VISIT' })).toBe('MISSION_OPEN')
  })
  it('visite validée → VISITED', () => {
    expect(proStatusAfter('MISSION_OPEN', { kind: 'VALIDATED', missionType: 'VISIT' })).toBe('VISITED')
  })
  it('visite rejetée ou annulée → AGREED, ou LOST si demandé', () => {
    expect(proStatusAfter('MISSION_OPEN', { kind: 'REJECTED', missionType: 'VISIT' })).toBe('AGREED')
    expect(proStatusAfter('MISSION_OPEN', { kind: 'CANCELLED', missionType: 'VISIT' })).toBe('AGREED')
    expect(proStatusAfter('MISSION_OPEN', { kind: 'CANCELLED', missionType: 'VISIT', markLost: true })).toBe('LOST')
  })
  it('un pro LOST reste LOST, même si sa visite soumise est validée', () => {
    expect(proStatusAfter('LOST', { kind: 'VALIDATED', missionType: 'VISIT' })).toBe('LOST')
  })
  it('une mission de retour ne change jamais le statut du pro', () => {
    for (const kind of ['CREATED', 'VALIDATED', 'REJECTED', 'CANCELLED'] as const) {
      expect(proStatusAfter('VISITED', { kind, missionType: 'RETURN_VISIT' })).toBe('VISITED')
    }
  })
})

describe('canSetProStatusManually', () => {
  it('le setter passe un pro de TO_CALL à AGREED et inversement', () => {
    expect(canSetProStatusManually('TO_CALL', 'AGREED')).toBe(true)
    expect(canSetProStatusManually('AGREED', 'TO_CALL')).toBe(true)
  })
  it('LOST depuis n’importe quel statut sauf LOST', () => {
    expect(canSetProStatusManually('VISITED', 'LOST')).toBe(true)
    expect(canSetProStatusManually('LOST', 'LOST')).toBe(false)
  })
  it('les autres statuts ne se posent pas à la main', () => {
    expect(canSetProStatusManually('AGREED', 'VISITED')).toBe(false)
    expect(canSetProStatusManually('MISSION_OPEN', 'AGREED')).toBe(false)
  })
})

describe('canCreateVisitFor', () => {
  it('seulement pour un pro AGREED', () => {
    expect(canCreateVisitFor('AGREED')).toBe(true)
    expect(canCreateVisitFor('TO_CALL')).toBe(false)
    expect(canCreateVisitFor('VISITED')).toBe(false)
  })
})

describe('STATUSES_CANCELLED_ON_LOST', () => {
  it('annule les missions encore en cours', () => {
    expect([...STATUSES_CANCELLED_ON_LOST].sort()).toEqual(['ACCEPTED', 'NEEDS_FIX', 'OPEN'])
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/pro-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/pro-rule.ts`**

```ts
import type { MissionStatus, MissionType, ProStatus } from '@prisma/client'

export interface ProMissionEvent {
  kind: 'CREATED' | 'VALIDATED' | 'REJECTED' | 'CANCELLED'
  missionType: MissionType
  markLost?: boolean
}

/** Statut du pro après un événement sur une de ses missions (spec §7.3). */
export function proStatusAfter(current: ProStatus, event: ProMissionEvent): ProStatus {
  // Un pro perdu le reste (décision de l'équipe), même si une visite soumise avant est validée ensuite.
  if (current === 'LOST' || event.missionType === 'RETURN_VISIT') return current
  switch (event.kind) {
    case 'CREATED':
      return current === 'AGREED' ? 'MISSION_OPEN' : current
    case 'VALIDATED':
      return 'VISITED'
    case 'REJECTED':
    case 'CANCELLED':
      if (event.markLost) return 'LOST'
      return current === 'MISSION_OPEN' ? 'AGREED' : current
  }
}

/** Statuts qu'un setter peut poser lui-même ; les autres découlent des missions. */
export function canSetProStatusManually(from: ProStatus, to: ProStatus): boolean {
  if (to === 'LOST') return from !== 'LOST'
  return (from === 'TO_CALL' && to === 'AGREED') || (from === 'AGREED' && to === 'TO_CALL')
}

export function canCreateVisitFor(status: ProStatus): boolean {
  return status === 'AGREED'
}

/** Missions annulées quand le pro passe LOST. */
export const STATUSES_CANCELLED_ON_LOST: readonly MissionStatus[] = ['OPEN', 'ACCEPTED', 'NEEDS_FIX']
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/pro-rule.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/missions/pro-rule.ts modules/missions/pro-rule.test.ts
git commit -m "feat(missions): pro status rules"
```

### Task 19: Visibilité des missions (`modules/missions/dispatch-rule.ts`)

**Files:**
- Create: `modules/missions/dispatch-rule.ts`
- Test: `modules/missions/dispatch-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { isUntaken, isVisibleTo, needsReschedule } from './dispatch-rule'

const H = 3_600_000
const now = new Date('2026-10-16T12:00:00Z')
// Agent à Back Bay (Boston). Pro à Cambridge (≈ 2 miles) et à Worcester (≈ 40 miles).
const agent = { lat: 42.3496, lng: -71.0746, radiusMiles: 10 }
const cambridge = { lat: 42.3736, lng: -71.1097 }
const worcester = { lat: 42.2626, lng: -71.8023 }
const open = { status: 'OPEN' as const, slotAt: new Date(now.getTime() + 48 * H), broadcastRadiusMiles: null }

describe('isVisibleTo (spec §4.5)', () => {
  it('mission ouverte, à venir, dans le rayon de l’agent', () => {
    expect(isVisibleTo({ agent, mission: open, pro: cambridge, now })).toBe(true)
  })
  it('hors du rayon de l’agent', () => {
    expect(isVisibleTo({ agent, mission: open, pro: worcester, now })).toBe(false)
  })
  it('visible grâce au rayon de diffusion élargi', () => {
    expect(isVisibleTo({ agent, mission: { ...open, broadcastRadiusMiles: 50 }, pro: worcester, now })).toBe(true)
  })
  it('jamais si la mission n’est pas OPEN, si le créneau est passé, ou sans coordonnées', () => {
    expect(isVisibleTo({ agent, mission: { ...open, status: 'ACCEPTED' }, pro: cambridge, now })).toBe(false)
    expect(isVisibleTo({ agent, mission: { ...open, slotAt: now }, pro: cambridge, now })).toBe(false)
    expect(isVisibleTo({ agent, mission: open, pro: { lat: null, lng: null }, now })).toBe(false)
  })
})

describe('encarts du back-office (spec §5.2)', () => {
  it('« Non prises » : OPEN depuis 48 h, créneau à venir', () => {
    expect(isUntaken({ ...open, publishedAt: new Date(now.getTime() - 48 * H) }, now)).toBe(true)
    expect(isUntaken({ ...open, publishedAt: new Date(now.getTime() - 47 * H) }, now)).toBe(false)
  })
  it('« À replanifier » : OPEN avec un créneau passé', () => {
    expect(needsReschedule({ status: 'OPEN', slotAt: new Date(now.getTime() - H) }, now)).toBe(true)
    expect(needsReschedule({ status: 'ACCEPTED', slotAt: new Date(now.getTime() - H) }, now)).toBe(false)
    expect(needsReschedule(open, now)).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/dispatch-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/dispatch-rule.ts`**

```ts
import type { MissionStatus } from '@prisma/client'
import { distanceMiles, type Point } from '@/modules/geo/distance'

const H = 3_600_000
export const UNTAKEN_AFTER_HOURS = 48

/**
 * Une mission est proposée à un agent si le pro est dans SON rayon ou dans le rayon de diffusion de la mission.
 * Le statut ACTIVE de l'agent est vérifié par le service, pas ici.
 */
export function isVisibleTo(input: {
  agent: Point & { radiusMiles: number }
  mission: { status: MissionStatus; slotAt: Date; broadcastRadiusMiles: number | null }
  pro: { lat: number | null; lng: number | null }
  now: Date
}): boolean {
  const { agent, mission, pro, now } = input
  if (mission.status !== 'OPEN' || mission.slotAt <= now) return false
  if (pro.lat == null || pro.lng == null) return false
  const d = distanceMiles(agent, { lat: pro.lat, lng: pro.lng })
  return d <= agent.radiusMiles || (mission.broadcastRadiusMiles != null && d <= mission.broadcastRadiusMiles)
}

export function isUntaken(m: { status: MissionStatus; publishedAt: Date; slotAt: Date }, now: Date): boolean {
  return m.status === 'OPEN' && m.slotAt > now && now.getTime() - m.publishedAt.getTime() >= UNTAKEN_AFTER_HOURS * H
}

export function needsReschedule(m: { status: MissionStatus; slotAt: Date }, now: Date): boolean {
  return m.status === 'OPEN' && m.slotAt <= now
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/dispatch-rule.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/missions/dispatch-rule.ts modules/missions/dispatch-rule.test.ts
git commit -m "feat(missions): dispatch visibility rules"
```

## Chunk 5: Règles pures — checklist, anti-fraude, import CSV

### Task 20: Étapes de la checklist (`modules/missions/checklist-rule.ts`)

**Files:**
- Create: `modules/missions/checklist-rule.ts`
- Test: `modules/missions/checklist-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { MIN_PHOTOS, STEPS_BY_TYPE, editableSteps, missingSteps, parseStepInput, type StepsData } from './checklist-rule'

const clientAt = '2026-10-16T14:00:00.000Z'
const receivedAt = '2026-10-16T14:00:05.000Z'
const full: StepsData = {
  checkin: { lat: 42.3564, lng: -71.0621, accuracy: 12, clientAt, receivedAt },
  consent: { signerName: 'Frank Delgado', textVersion: 'consent-v1', signatureKey: 'missions/m1/signature.png', clientAt, receivedAt },
  profile: { listingName: 'Boston Concrete & Masonry', category: 'Concrete contractor', city: 'Boston', zip: '02108', mode: 'CREATED', clientAt, receivedAt },
  invite: { result: 'INVITE_SENT', clientAt, receivedAt },
  verification: { result: 'VIDEO_NOT_OFFERED', clientAt, receivedAt },
  checkout: { clientAt, receivedAt },
}

describe('missingSteps', () => {
  it('rien ne manque pour une visite complète avec assez de photos', () => {
    expect(missingSteps('VISIT', full, MIN_PHOTOS)).toEqual([])
  })
  it('signale les photos manquantes', () => {
    expect(missingSteps('VISIT', full, MIN_PHOTOS - 1)).toEqual(['photos'])
  })
  it('liste les étapes absentes dans l’ordre', () => {
    expect(missingSteps('VISIT', { checkin: full.checkin }, 0)).toEqual(['consent', 'profile', 'invite', 'photos', 'verification', 'checkout'])
  })
  it('une mission de retour n’exige ni accord, ni fiche, ni photos', () => {
    const { checkin, invite, verification, checkout } = full
    expect(missingSteps('RETURN_VISIT', { checkin, invite, verification, checkout }, 0)).toEqual([])
    expect(STEPS_BY_TYPE.RETURN_VISIT).toEqual(['checkin', 'invite', 'verification', 'checkout'])
  })
})

describe('editableSteps', () => {
  it('toutes les étapes tant que la mission est ACCEPTED', () => {
    expect(editableSteps('VISIT', 'ACCEPTED')).toEqual(STEPS_BY_TYPE.VISIT)
  })
  it('en NEEDS_FIX : photos, invitation et vérification seulement (spec §7.2)', () => {
    expect(editableSteps('VISIT', 'NEEDS_FIX')).toEqual(['invite', 'photos', 'verification'])
    expect(editableSteps('RETURN_VISIT', 'NEEDS_FIX')).toEqual(['invite', 'verification'])
  })
  it('aucune une fois soumise ou terminée', () => {
    expect(editableSteps('VISIT', 'SUBMITTED')).toEqual([])
    expect(editableSteps('VISIT', 'VALIDATED')).toEqual([])
  })
})

describe('parseStepInput', () => {
  it('valide un check-in', () => {
    const r = parseStepInput('checkin', { lat: 42.3, lng: -71.1, accuracy: 8, clientAt })
    expect(r.success).toBe(true)
  })
  it('refuse une vérification « autre méthode » sans préciser laquelle', () => {
    expect(parseStepInput('verification', { result: 'OTHER_METHOD_STARTED', clientAt }).success).toBe(false)
    expect(parseStepInput('verification', { result: 'OTHER_METHOD_STARTED', method: 'Postcard', clientAt }).success).toBe(true)
  })
  it('l’accord attend une signature PNG en data URL', () => {
    expect(parseStepInput('consent', { signerName: 'Frank Delgado', textVersion: 'consent-v1', signaturePng: 'data:image/png;base64,iVBORw0KGgo=', clientAt }).success).toBe(true)
    expect(parseStepInput('consent', { signerName: 'Frank Delgado', textVersion: 'consent-v1', signaturePng: 'hello', clientAt }).success).toBe(false)
  })
  it('refuse une étape inconnue ou un code postal invalide', () => {
    expect(parseStepInput('photos', {}).success).toBe(false)
    expect(parseStepInput('constructor', {}).success).toBe(false) // propriété héritée d'Object
    expect(parseStepInput('profile', { ...full.profile, zip: '2108' }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/checklist-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/checklist-rule.ts`**

```ts
import type { MissionStatus, MissionType } from '@prisma/client'
import { z } from 'zod'

export const MIN_PHOTOS = 10
export const MAX_SIGNATURE_DATAURL_CHARS = 700_000 // ≈ 500 Ko de PNG

const clientAt = z.iso.datetime({ offset: true })

// Ce que le téléphone envoie pour chaque étape. Les photos passent par une route dédiée (multipart).
export const StepInputSchemas = {
  checkin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0),
    clientAt,
  }),
  consent: z.object({
    signerName: z.string().trim().min(2).max(100),
    textVersion: z.string().min(1).max(40),
    signaturePng: z.string().startsWith('data:image/png;base64,').max(MAX_SIGNATURE_DATAURL_CHARS),
    clientAt,
  }),
  profile: z.object({
    listingName: z.string().trim().min(2).max(150),
    category: z.string().trim().min(2).max(100),
    city: z.string().trim().min(2).max(80),
    zip: z.string().regex(/^\d{5}$/),
    mode: z.enum(['CREATED', 'CLAIMED']),
    clientAt,
  }),
  invite: z.object({ result: z.enum(['INVITE_SENT', 'INVITE_NOT_ALLOWED_YET']), clientAt }),
  verification: z
    .object({
      result: z.enum(['VIDEO_DONE', 'VIDEO_NOT_OFFERED', 'OTHER_METHOD_STARTED']),
      method: z.string().trim().min(2).max(100).optional(),
      clientAt,
    })
    .refine((v) => v.result !== 'OTHER_METHOD_STARTED' || !!v.method, { message: 'Say which method Google offered', path: ['method'] }),
  checkout: z.object({ clientAt }),
}

export type InputStepName = keyof typeof StepInputSchemas
export type StepName = InputStepName | 'photos'

type Received = { receivedAt: string }

// Ce qui est enregistré dans Submission.steps (l'accord garde la clé du fichier signature, pas l'image).
export interface StepsData {
  checkin?: z.infer<typeof StepInputSchemas.checkin> & Received
  consent?: Omit<z.infer<typeof StepInputSchemas.consent>, 'signaturePng'> & { signatureKey: string } & Received
  profile?: z.infer<typeof StepInputSchemas.profile> & Received
  invite?: z.infer<typeof StepInputSchemas.invite> & Received
  verification?: z.infer<typeof StepInputSchemas.verification> & Received
  checkout?: z.infer<typeof StepInputSchemas.checkout> & Received
}

export const STEPS_BY_TYPE: Record<MissionType, readonly StepName[]> = {
  VISIT: ['checkin', 'consent', 'profile', 'invite', 'photos', 'verification', 'checkout'],
  RETURN_VISIT: ['checkin', 'invite', 'verification', 'checkout'],
}

const FIXABLE: readonly StepName[] = ['invite', 'photos', 'verification']

export function missingSteps(type: MissionType, steps: StepsData, photoCount: number): StepName[] {
  return STEPS_BY_TYPE[type].filter((s) => (s === 'photos' ? photoCount < MIN_PHOTOS : !steps[s]))
}

/** Étapes modifiables selon le statut (spec §7.2) : tout en ACCEPTED ; photos, invitation et vérification en NEEDS_FIX. */
export function editableSteps(type: MissionType, status: MissionStatus): StepName[] {
  const all = STEPS_BY_TYPE[type]
  if (status === 'ACCEPTED') return [...all]
  if (status === 'NEEDS_FIX') return all.filter((s) => FIXABLE.includes(s))
  return []
}

export function parseStepInput(step: string, data: unknown) {
  if (!Object.hasOwn(StepInputSchemas, step)) {
    return { success: false as const, error: `Unknown step: ${step}` }
  }
  const schema = StepInputSchemas[step as InputStepName]
  const r = schema.safeParse(data)
  return r.success
    ? { success: true as const, step: step as InputStepName, data: r.data }
    : { success: false as const, error: r.error.issues.map((i) => i.message).join('; ') }
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/checklist-rule.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/missions/checklist-rule.ts modules/missions/checklist-rule.test.ts
git commit -m "feat(missions): visit checklist rules"
```

### Task 21: Règles anti-fraude (`modules/review/fraud-rule.ts`)

**Files:**
- Create: `modules/review/fraud-rule.ts`
- Test: `modules/review/fraud-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { computeFraudFlags, normalizeAddress, type FraudInput } from './fraud-rule'

const H = 3_600_000
const checkinAt = new Date('2026-10-16T14:00:00Z')
const pro = { lat: 42.3564, lng: -71.0621 }
const clean: FraudInput = {
  pro,
  checkin: { lat: 42.3565, lng: -71.0622, accuracy: 15, clientAt: checkinAt, receivedAt: new Date(checkinAt.getTime() + 5000) },
  photos: [{ category: 'LOGO', exifTakenAt: new Date(checkinAt.getTime() + 10 * 60_000), exifLat: 42.3564, exifLng: -71.0621 }],
  duplicateValidatedCount: 0,
  proRating: 5,
  proDenied: false,
}
const types = (i: FraudInput) => computeFraudFlags(i).map((f) => f.type).sort()

describe('computeFraudFlags (spec §10)', () => {
  it('aucune alerte pour une visite propre', () => {
    expect(computeFraudFlags(clean)).toEqual([])
  })
  it('CHECKIN_FAR : à plus de 150 m, ou GPS imprécis', () => {
    expect(types({ ...clean, checkin: { ...clean.checkin!, lat: 42.3600 } })).toEqual(['CHECKIN_FAR']) // ≈ 400 m
    expect(types({ ...clean, checkin: { ...clean.checkin!, accuracy: 150 } })).toEqual(['CHECKIN_FAR'])
  })
  it('LATE_SYNC : reçu plus de 12 h après', () => {
    expect(types({ ...clean, checkin: { ...clean.checkin!, receivedAt: new Date(checkinAt.getTime() + 13 * H) } })).toEqual(['LATE_SYNC'])
  })
  it('PHOTO_EXIF_MISMATCH : photo de logo prise plus de 2 h avant le check-in, ou à plus de 500 m', () => {
    const old = { ...clean.photos[0], exifTakenAt: new Date(checkinAt.getTime() - 3 * H) }
    expect(types({ ...clean, photos: [old] })).toEqual(['PHOTO_EXIF_MISMATCH'])
    const far = { ...clean.photos[0], exifLat: 42.3700 } // ≈ 1,5 km
    expect(types({ ...clean, photos: [far] })).toEqual(['PHOTO_EXIF_MISMATCH'])
  })
  it('une vieille photo de chantier (JOB) ou sans EXIF n’est pas suspecte', () => {
    const job = { category: 'JOB' as const, exifTakenAt: new Date(checkinAt.getTime() - 300 * H), exifLat: null, exifLng: null }
    const noExif = { category: 'TEAM' as const, exifTakenAt: null, exifLat: null, exifLng: null }
    expect(types({ ...clean, photos: [job, noExif] })).toEqual([])
  })
  it('DUPLICATE_PRO, LOW_PRO_RATING, PRO_DENIED', () => {
    expect(types({ ...clean, duplicateValidatedCount: 1 })).toEqual(['DUPLICATE_PRO'])
    expect(types({ ...clean, proRating: 2 })).toEqual(['LOW_PRO_RATING'])
    expect(types({ ...clean, proRating: 3 })).toEqual([])
    expect(types({ ...clean, proRating: null, proDenied: true })).toEqual(['PRO_DENIED'])
  })
  it('GPS imprécis signalé même sans coordonnées du pro', () => {
    expect(types({ ...clean, pro: { lat: null, lng: null }, checkin: { ...clean.checkin!, accuracy: 500 } })).toEqual(['CHECKIN_FAR'])
  })
  it('sans check-in, aucune alerte de position', () => {
    expect(types({ ...clean, checkin: null })).toEqual([])
  })
})

describe('normalizeAddress', () => {
  it('rapproche deux écritures de la même adresse', () => {
    expect(normalizeAddress('120 Tremont Street, Suite 4', '02108')).toBe(normalizeAddress('120 tremont st. ste 4', '02108'))
  })
  it('distingue deux codes postaux', () => {
    expect(normalizeAddress('120 Tremont St', '02108')).not.toBe(normalizeAddress('120 Tremont St', '02109'))
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/review/fraud-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/review/fraud-rule.ts`**

```ts
import type { FraudType, PhotoCategory } from '@prisma/client'
import { distanceMeters } from '@/modules/geo/distance'

const H = 3_600_000
export const CHECKIN_MAX_METERS = 150
export const CHECKIN_MAX_ACCURACY_METERS = 100
export const LATE_SYNC_HOURS = 12
export const EXIF_MAX_HOURS_BEFORE = 2
export const EXIF_MAX_METERS = 500
export const LOW_RATING_MAX = 2
// Photos censées être prises pendant la visite (un chantier ancien peut l'être bien avant).
const ON_SITE: readonly PhotoCategory[] = ['LOGO', 'VEHICLE', 'TEAM']

export interface FraudInput {
  pro: { lat: number | null; lng: number | null }
  checkin: { lat: number; lng: number; accuracy: number; clientAt: Date; receivedAt: Date } | null
  photos: { category: PhotoCategory; exifTakenAt: Date | null; exifLat: number | null; exifLng: number | null }[]
  // Missions VALIDATED d'AUTRES pros (proId différent) ayant le même téléphone ou la même adresse normalisée.
  // Le service exclut le pro lui-même : sinon une mission de retour se signalerait toujours.
  duplicateValidatedCount: number
  proRating: number | null
  proDenied: boolean
}

export interface FraudFinding { type: FraudType; detail: string }

/** Alertes, jamais des blocages : l'admin décide (spec §10). */
export function computeFraudFlags(i: FraudInput): FraudFinding[] {
  const out: FraudFinding[] = []
  const proPoint = i.pro.lat != null && i.pro.lng != null ? { lat: i.pro.lat, lng: i.pro.lng } : null

  if (i.checkin) {
    const d = proPoint ? Math.round(distanceMeters(i.checkin, proPoint)) : null
    if (d != null && d > CHECKIN_MAX_METERS) out.push({ type: 'CHECKIN_FAR', detail: `Check-in à ${d} m de l'adresse du pro` })
    else if (i.checkin.accuracy > CHECKIN_MAX_ACCURACY_METERS) out.push({ type: 'CHECKIN_FAR', detail: `Précision GPS de ${Math.round(i.checkin.accuracy)} m` })
    const lagH = (i.checkin.receivedAt.getTime() - i.checkin.clientAt.getTime()) / H
    if (lagH > LATE_SYNC_HOURS) out.push({ type: 'LATE_SYNC', detail: `Check-in reçu ${Math.round(lagH)} h après avoir été fait` })

    const suspicious = i.photos.filter((p) => {
      if (!ON_SITE.includes(p.category)) return false
      const tooOld = p.exifTakenAt != null && i.checkin!.clientAt.getTime() - p.exifTakenAt.getTime() > EXIF_MAX_HOURS_BEFORE * H
      const tooFar = p.exifLat != null && p.exifLng != null && proPoint != null && distanceMeters({ lat: p.exifLat, lng: p.exifLng }, proPoint) > EXIF_MAX_METERS
      return tooOld || tooFar
    })
    if (suspicious.length > 0) out.push({ type: 'PHOTO_EXIF_MISMATCH', detail: `${suspicious.length} photo(s) prise(s) avant la visite ou ailleurs` })
  }

  if (i.duplicateValidatedCount > 0) out.push({ type: 'DUPLICATE_PRO', detail: `${i.duplicateValidatedCount} autre(s) visite(s) validée(s) pour ce téléphone ou cette adresse` })
  if (i.proDenied) out.push({ type: 'PRO_DENIED', detail: 'Le pro répond que personne n’est venu' })
  if (i.proRating != null && i.proRating <= LOW_RATING_MAX) out.push({ type: 'LOW_PRO_RATING', detail: `Note du pro : ${i.proRating}/5` })
  return out
}

const ABBREVIATIONS: Record<string, string> = {
  street: 'st', avenue: 'ave', road: 'rd', drive: 'dr', boulevard: 'blvd', lane: 'ln', court: 'ct',
  place: 'pl', parkway: 'pkwy', highway: 'hwy', suite: 'ste', apartment: 'apt', unit: 'unit',
  north: 'n', south: 's', east: 'e', west: 'w',
}

/** Adresse comparable : minuscules, sans ponctuation, abréviations USPS courantes, suivie du ZIP. */
export function normalizeAddress(address: string, zip: string): string {
  const words = address
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (Object.hasOwn(ABBREVIATIONS, w) ? ABBREVIATIONS[w] : w))
  return `${words.join(' ')}|${zip.trim()}`
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/review/fraud-rule.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/review/fraud-rule.ts modules/review/fraud-rule.test.ts
git commit -m "feat(review): fraud flag rules"
```

### Task 22: Import CSV des pros (`modules/missions/csv-rule.ts`)

**Files:**
- Create: `modules/missions/csv-rule.ts`
- Test: `modules/missions/csv-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { parseCsv, parseProsCsv } from './csv-rule'

describe('parseCsv', () => {
  it('gère guillemets, virgules et guillemets échappés, CRLF', () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\r\n')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']])
  })
  it('ignore les lignes vides', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('parseProsCsv', () => {
  const header = 'Business_Name,contact_name,phone,address,city,state,zip,trade'

  it('lit les lignes valides, colonnes dans n’importe quelle casse', () => {
    const r = parseProsCsv(`${header}\n"Delgado Concrete, LLC",Frank,(617) 555-0142,120 Tremont St,Boston,ma,2108,Concrete contractor\n`)
    expect(r.errors).toEqual([])
    expect(r.rows).toEqual([{
      businessName: 'Delgado Concrete, LLC', contactName: 'Frank', phone: '+16175550142',
      address: '120 Tremont St', city: 'Boston', state: 'MA', zip: '02108', trade: 'Concrete contractor',
    }])
  })

  it('signale les lignes invalides avec leur numéro', () => {
    const r = parseProsCsv(`${header}\nA,,123,1 Main St,Boston,MA,02108,Fence\nB,,6175550199,,Boston,MA,02108,Fence\n`)
    expect(r.rows).toHaveLength(0)
    expect(r.errors).toEqual([
      { line: 2, message: 'Téléphone US invalide' },
      { line: 3, message: 'Adresse manquante' },
    ])
  })

  it('donne le vrai numéro de ligne malgré une ligne vide, accepte ZIP+4 et en-têtes avec espaces', () => {
    const r = parseProsCsv('Business Name,Phone,Address,City,State,ZIP,Trade\n\nA,123,1 Main St,Boston,MA,02108,Fence\nB,6175550199,2 Main St,Boston,MA,02108-1234,Fence\n')
    expect(r.errors).toEqual([{ line: 3, message: 'Téléphone US invalide' }])
    expect(r.rows[0].zip).toBe('02108')
  })

  it('refuse un fichier sans les colonnes obligatoires', () => {
    const r = parseProsCsv('name,phone\nA,6175550199\n')
    expect(r.rows).toEqual([])
    expect(r.errors[0].message).toContain('Colonnes manquantes')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/csv-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/csv-rule.ts`**

```ts
import { normalizeUsPhone } from '@/modules/sms/sms-rule'

export const PRO_CSV_COLUMNS = ['business_name', 'contact_name', 'phone', 'address', 'city', 'state', 'zip', 'trade'] as const
const REQUIRED = ['business_name', 'phone', 'address', 'city', 'state', 'zip', 'trade'] as const

export interface ProCsvRow {
  businessName: string
  contactName: string | null
  phone: string
  address: string
  city: string
  state: string
  zip: string
  trade: string
}

/** CSV minimal (RFC 4180) : guillemets, guillemets doublés, virgules et retours à la ligne entre guillemets.
 *  Chaque ligne garde son numéro dans le fichier (1 = première ligne), lignes vides comprises. */
export function parseCsvRows(text: string): { line: number; cells: string[] }[] {
  const rows: { line: number; cells: string[] }[] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  let lineNo = 1
  let rowStart = 1
  const endRow = () => {
    row.push(field)
    field = ''
    if (row.some((f) => f.trim() !== '')) rows.push({ line: rowStart, cells: row })
    row = []
  }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '\n') lineNo++
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') { i++; lineNo++ }
      else if (c === '\r') lineNo++
      endRow()
      rowStart = lineNo
    } else field += c
  }
  endRow()
  return rows
}

export function parseCsv(text: string): string[][] {
  return parseCsvRows(text).map((r) => r.cells)
}

const MESSAGES: Record<(typeof REQUIRED)[number], string> = {
  business_name: 'Nom de l’entreprise manquant',
  phone: 'Téléphone manquant',
  address: 'Adresse manquante',
  city: 'Ville manquante',
  state: 'État manquant',
  zip: 'Code postal manquant',
  trade: 'Métier manquant',
}

export function parseProsCsv(text: string): { rows: ProCsvRow[]; errors: { line: number; message: string }[] } {
  const [header, ...lines] = parseCsvRows(text)
  // « Business Name » (export Sheets/Excel) est lu comme « business_name ».
  const cols = (header?.cells ?? []).map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const missing = REQUIRED.filter((c) => !cols.includes(c))
  if (missing.length > 0) return { rows: [], errors: [{ line: 1, message: `Colonnes manquantes : ${missing.join(', ')}` }] }

  const rows: ProCsvRow[] = []
  const errors: { line: number; message: string }[] = []
  lines.forEach(({ line, cells }) => {
    const get = (name: string) => (cells[cols.indexOf(name)] ?? '').trim()
    const empty = REQUIRED.find((c) => !get(c))
    if (empty) return void errors.push({ line, message: MESSAGES[empty] })
    const phone = normalizeUsPhone(get('phone'))
    if (!phone) return void errors.push({ line, message: 'Téléphone US invalide' })
    const state = get('state').toUpperCase()
    if (!/^[A-Z]{2}$/.test(state)) return void errors.push({ line, message: 'État invalide (2 lettres)' })
    // ZIP+4 accepté (on garde les 5 premiers chiffres) ; Excel supprime le 0 initial des ZIP de Nouvelle-Angleterre.
    const zip = get('zip').replace(/^(\d{5})-\d{4}$/, '$1').padStart(5, '0')
    if (!/^\d{5}$/.test(zip)) return void errors.push({ line, message: 'Code postal invalide' })
    rows.push({
      businessName: get('business_name'),
      contactName: get('contact_name') || null,
      phone,
      address: get('address'),
      city: get('city'),
      state,
      zip,
      trade: get('trade'),
    })
  })
  return { rows, errors }
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/csv-rule.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Lancer toute la suite et commit**

Run: `npm test`
Expected: toute la suite au vert.

```bash
git add modules/missions/csv-rule.ts modules/missions/csv-rule.test.ts
git commit -m "feat(missions): pros CSV import parsing"
```


## Chunk 6: Services — candidature, connexion, formation, contrat

À partir d'ici, les tests `*.int.test.ts` utilisent la base de test (`resetDb` avant chaque test) et la boîte d'envoi SMS mémoire (`memorySmsDriver.sent`).

### Task 23: Codes SMS et candidature (`modules/recruitment`)

**Files:**
- Modify: `prisma/schema.prisma` (modèle `OtpCode` : colonne `ip`)
- Create: `modules/sms/index.ts`, `modules/recruitment/otp.ts`, `modules/recruitment/index.ts`
- Test: `modules/recruitment/recruitment.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms/driver'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent } from '@/tests/helpers/factories'
import { apply, authorizeAgentOtp, requestLoginCode } from './index'
import { OTP_MAX_PER_IP_HOUR, verifyOtp } from './otp'

// Géocodage simulé (aucun appel réseau) ; le reste du module geo reste réel.
vi.mock('@/modules/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/geo')>()),
  geocodeZip: vi.fn(async (zip: string) => (zip === '99999' ? null : { lat: 42.3496, lng: -71.0746, state: 'MA' })),
}))

const now = new Date('2026-10-16T12:00:00Z')
const form = {
  firstName: 'Maya', lastName: 'Thompson-Okafor', email: 'maya@example.com', phone: '(617) 555-1234',
  birthDate: '2005-03-14', zip: '02116', radiusMiles: '25', hasCar: 'yes', availability: ['mon-am'], confirm18: 'on',
}
const lastCode = () => /(\d{6})/.exec(memorySmsDriver.sent.at(-1)!.body)![1]

describe('candidature', () => {
  beforeEach(resetDb)

  it('crée un candidat APPLICANT géolocalisé et lui envoie un code', async () => {
    const r = await apply(form, now)
    expect(r).toEqual({ ok: true, phone: '+16175551234' })
    const agent = await prisma.agent.findUniqueOrThrow({ where: { phone: '+16175551234' } })
    expect(agent).toMatchObject({ status: 'APPLICANT', lat: 42.3496, radiusMiles: 25, hasCar: true })
    expect(memorySmsDriver.sent).toHaveLength(1)
    expect(memorySmsDriver.sent[0].to).toBe('+16175551234')
  })

  it('renvoie les erreurs par champ', async () => {
    const r = await apply({ ...form, birthDate: '2010-01-01', zip: 'abc' }, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors).toMatchObject({ birthDate: 'You must be 18 or older', zip: 'Enter a 5-digit ZIP code' })
  })

  it('refuse un ZIP introuvable', async () => {
    const r = await apply({ ...form, zip: '99999' }, now)
    expect(r).toEqual({ ok: false, fieldErrors: { zip: 'We could not find this ZIP code' } })
  })

  it('refuse un email ou un téléphone déjà inscrit', async () => {
    await makeAgent({ email: 'maya@example.com' })
    const r = await apply(form, now)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.fieldErrors.email).toContain('already exists')
  })
})

describe('connexion par code', () => {
  beforeEach(resetDb)

  it('le bon code connecte le candidat et le fait passer en TRAINING', async () => {
    await apply(form, now)
    const user = await authorizeAgentOtp('617-555-1234', lastCode(), now)
    expect(user?.name).toBe('Maya')
    const agent = await prisma.agent.findUniqueOrThrow({ where: { phone: '+16175551234' } })
    expect(agent.status).toBe('TRAINING')
    expect(agent.phoneVerifiedAt).not.toBeNull()
  })

  it('un mauvais code échoue et compte un essai ; un code ne sert qu’une fois', async () => {
    await apply(form, now)
    const code = lastCode()
    const wrong = code === '000000' ? '111111' : '000000'
    expect(await authorizeAgentOtp('+16175551234', wrong, now)).toBeNull()
    expect((await prisma.otpCode.findFirstOrThrow()).attempts).toBe(1)
    expect(await authorizeAgentOtp('+16175551234', code, now)).not.toBeNull()
    expect(await authorizeAgentOtp('+16175551234', code, now)).toBeNull()
  })

  it('n’envoie aucun SMS à un numéro inconnu, sans le révéler', async () => {
    expect(await requestLoginCode('617-555-9999')).toEqual({ ok: true, phone: '+16175559999' })
    expect(memorySmsDriver.sent).toHaveLength(0)
  })

  it('limite à 3 codes par quart d’heure, numéro inscrit ou non (pas d’indice sur l’inscription)', async () => {
    await makeAgent({ phone: '+16175551111' })
    for (let i = 0; i < 3; i++) expect((await requestLoginCode('6175551111')).ok).toBe(true)
    expect(await requestLoginCode('6175551111')).toEqual({ ok: false, error: 'Too many codes requested. Try again in 15 minutes.' })
    for (let i = 0; i < 3; i++) await requestLoginCode('6175552222')
    expect(await requestLoginCode('6175552222')).toEqual({ ok: false, error: 'Too many codes requested. Try again in 15 minutes.' })
  })

  it('limite les demandes par adresse IP (pompage SMS)', async () => {
    for (let i = 0; i < OTP_MAX_PER_IP_HOUR; i++) await requestLoginCode(`617555${String(3000 + i)}`, now, '198.51.100.9')
    expect(await requestLoginCode('6175554999', now, '198.51.100.9')).toEqual({ ok: false, error: 'Too many codes requested. Try again later.' })
  })

  it('une rafale de mauvais codes ne dépasse pas 5 essais', async () => {
    await apply(form, now)
    const code = lastCode()
    const guesses = Array.from({ length: 20 }, (_, i) => String((Number(code) + 1 + i) % 1_000_000).padStart(6, '0'))
    await Promise.all(guesses.map((g) => verifyOtp('+16175551234', g, now)))
    expect((await prisma.otpCode.findFirstOrThrow({ where: { phone: '+16175551234' } })).attempts).toBe(5)
    expect(await verifyOtp('+16175551234', code, now)).toBe(false) // code brûlé
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/recruitment/recruitment.int.test.ts`
Expected: FAIL (module `./index` introuvable).

- [ ] **Step 3: Ajouter l'adresse IP aux codes, et l'index du module SMS**

Dans `prisma/schema.prisma`, modèle `OtpCode`, ajouter le champ et l'index :

```prisma
  ip        String? // adresse IP de la demande (limite anti-pompage SMS)

  @@index([ip, createdAt])
```

Run: `npx prisma migrate dev --name otp_ip && npx prisma generate`
Expected: une migration `<horodatage>_otp_ip` créée et appliquée.

Créer `modules/sms/index.ts` (interface publique du module SMS ; le traitement des SMS entrants s'y ajoutera au chunk 9) :

```ts
export { getSmsDriver, memorySmsDriver, sendSms, setSmsDriver, type SmsDriver } from './driver'
export { normalizeUsPhone, parseInbound, type InboundReply } from './sms-rule'
export { plain, smsTemplates } from './templates'
export { computeTwilioSignature, isValidTwilioSignature } from './twilio-signature'
```

- [ ] **Step 3 bis: Écrire `modules/recruitment/otp.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { sendSms, smsTemplates } from '@/modules/sms'
import { OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES, OTP_WINDOW_MINUTES, canIssueOtp, generateOtpCode, hashOtp, otpMatches } from './otp-rule'

// Garde-fous contre le pompage SMS (fraude qui fait envoyer des SMS facturés) : par IP et au total par jour.
// En complément, les « Geo Permissions » Twilio sont limitées aux États-Unis (runbook).
export const OTP_MAX_PER_IP_HOUR = 10
export const OTP_MAX_GLOBAL_DAY = 1000

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET manquant ou trop court (32 caractères minimum)')
  return s
}

export type OtpRequest = { ok: true } | { ok: false; error: string }

/**
 * Enregistre un code pour ce numéro et l'envoie si `send` est vrai. Un numéro inconnu passe par le même
 * chemin (code enregistré, rien envoyé) : les limites ne trahissent pas qui est inscrit. Les demandes d'un
 * même numéro sont sérialisées (verrou Postgres) pour qu'une rafale ne dépasse pas la limite.
 */
export async function requestOtp(phone: string, opts: { now?: Date; ip?: string | null; send: boolean }): Promise<OtpRequest> {
  const now = opts.now ?? new Date()
  const ip = opts.ip ?? null
  const issued = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${phone}))) AS l`
    const sinceWindow = new Date(now.getTime() - OTP_WINDOW_MINUTES * 60_000)
    if (!canIssueOtp(await tx.otpCode.count({ where: { phone, createdAt: { gte: sinceWindow } } }))) {
      return { ok: false as const, error: 'Too many codes requested. Try again in 15 minutes.' }
    }
    if (ip) {
      const sinceHour = new Date(now.getTime() - 3_600_000)
      if ((await tx.otpCode.count({ where: { ip, createdAt: { gte: sinceHour } } })) >= OTP_MAX_PER_IP_HOUR) {
        return { ok: false as const, error: 'Too many codes requested. Try again later.' }
      }
    }
    const sinceDay = new Date(now.getTime() - 86_400_000)
    if ((await tx.otpCode.count({ where: { createdAt: { gte: sinceDay } } })) >= OTP_MAX_GLOBAL_DAY) {
      return { ok: false as const, error: 'Too many codes requested. Try again later.' }
    }
    const code = generateOtpCode()
    await tx.otpCode.create({
      data: { phone, ip, codeHash: hashOtp(code, phone, secret()), expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60_000), createdAt: now },
    })
    return { ok: true as const, code }
  })
  if (!issued.ok) return issued
  if (!opts.send) return { ok: true }
  try {
    await sendSms(phone, smsTemplates.otp(issued.code))
    return { ok: true }
  } catch (e) {
    console.error('[otp] envoi SMS échoué', e)
    return { ok: false, error: 'We could not text this number. Check that it is a US mobile number.' }
  }
}

/**
 * Vérifie le dernier code non utilisé du numéro et le consomme. L'essai est réservé AVANT la comparaison
 * (mise à jour conditionnelle) : des requêtes simultanées ne dépassent jamais OTP_MAX_ATTEMPTS essais.
 */
export async function verifyOtp(phone: string, code: string, now: Date = new Date()): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({ where: { phone, usedAt: null }, orderBy: { createdAt: 'desc' } })
  if (!otp) return false
  const reserved = await prisma.otpCode.updateMany({
    where: { id: otp.id, usedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS }, expiresAt: { gt: now } },
    data: { attempts: { increment: 1 } },
  })
  if (reserved.count !== 1) return false
  if (!otpMatches(code, phone, secret(), otp.codeHash)) return false
  const used = await prisma.otpCode.updateMany({ where: { id: otp.id, usedAt: null }, data: { usedAt: now } })
  return used.count === 1
}
```

- [ ] **Step 4: Écrire `modules/recruitment/index.ts`**

```ts
import type { ZodError } from 'zod'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { Prisma } from '@prisma/client'
import { geocodeZip } from '@/modules/geo'
import { normalizeUsPhone } from '@/modules/sms'
import { parseApplication } from './apply-rule'
import { requestOtp, verifyOtp } from './otp'

export type ApplyResult = { ok: true; phone: string } | { ok: false; fieldErrors: Record<string, string> }

function fieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    out[key] ??= issue.message
  }
  return out
}

export async function apply(input: Record<string, unknown>, now: Date = new Date(), ip: string | null = null): Promise<ApplyResult> {
  const parsed = parseApplication(input, now)
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrors(parsed.error) }
  const a = parsed.data

  const existing = await prisma.agent.findFirst({ where: { OR: [{ email: a.email }, { phone: a.phone }] } })
  if (existing) {
    // Candidat qui n'a jamais validé son numéro : on lui renvoie simplement un code.
    if (existing.phone === a.phone && existing.status === 'APPLICANT') {
      const r = await requestOtp(a.phone, { now, ip, send: true })
      return r.ok ? { ok: true, phone: a.phone } : { ok: false, fieldErrors: { phone: r.error } }
    }
    return { ok: false, fieldErrors: { email: 'An account already exists with this email or phone. Log in instead.' } }
  }

  const geo = await geocodeZip(a.zip)
  if (!geo) return { ok: false, fieldErrors: { zip: 'We could not find this ZIP code' } }

  let agentId: string
  try {
    const agent = await prisma.agent.create({
      data: {
        firstName: a.firstName, lastName: a.lastName, email: a.email, phone: a.phone, birthDate: a.birthDate,
        zip: a.zip, lat: geo.lat, lng: geo.lng, radiusMiles: a.radiusMiles, hasCar: a.hasCar, availability: a.availability,
      },
    })
    agentId = agent.id
  } catch (e) {
    // Deux envois simultanés du même formulaire : le second tombe sur la contrainte d'unicité.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { ok: false, fieldErrors: { email: 'An account already exists with this email or phone. Log in instead.' } }
    }
    throw e
  }
  await logAudit(prisma, { actor: `agent:${agentId}`, action: 'agent.apply', entity: 'Agent', entityId: agentId })
  const r = await requestOtp(a.phone, { now, ip, send: true })
  return r.ok ? { ok: true, phone: a.phone } : { ok: false, fieldErrors: { phone: r.error } }
}

/** Demande de code pour se connecter. Un numéro inconnu reçoit la même réponse, sans SMS envoyé. */
export async function requestLoginCode(rawPhone: string, now: Date = new Date(), ip: string | null = null): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const phone = normalizeUsPhone(rawPhone)
  if (!phone) return { ok: false, error: 'Enter a valid US mobile number' }
  const agent = await prisma.agent.findUnique({ where: { phone } })
  // Même chemin pour un numéro inconnu (code enregistré, aucun SMS) : les limites ne révèlent pas l'inscription.
  const r = await requestOtp(phone, { now, ip, send: agent !== null })
  return r.ok ? { ok: true, phone } : { ok: false, error: r.error }
}

/** Fournisseur Auth.js « agent-otp » : vérifie le code et valide le numéro d'un candidat. */
export async function authorizeAgentOtp(rawPhone: string, code: string, now: Date = new Date()): Promise<{ id: string; name: string } | null> {
  const phone = normalizeUsPhone(rawPhone)
  if (!phone || !/^\d{6}$/.test(code)) return null
  if (!(await verifyOtp(phone, code, now))) return null
  const agent = await prisma.agent.findUnique({ where: { phone } })
  if (!agent) return null
  if (agent.status === 'APPLICANT') {
    await prisma.$transaction(async (tx) => {
      await tx.agent.update({ where: { id: agent.id }, data: { status: 'TRAINING', phoneVerifiedAt: now } })
      await logAudit(tx, { actor: `agent:${agent.id}`, action: 'agent.phone_verified', entity: 'Agent', entityId: agent.id })
    })
  }
  return { id: agent.id, name: agent.firstName }
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run modules/recruitment/recruitment.int.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add modules/recruitment/otp.ts modules/recruitment/index.ts modules/recruitment/recruitment.int.test.ts
git commit -m "feat(recruitment): application and SMS code login"
```

### Task 24: Authentification (Auth.js, proxy, sessions, comptes admin)

**Files:**
- Create: `lib/admin-access.ts`, `lib/auth.ts`, `lib/session.ts`, `types/next-auth.d.ts`, `app/api/auth/[...nextauth]/route.ts`, `proxy.ts`, `scripts/add-admin.ts`
- Test: `proxy.test.ts`, `lib/admin-access.int.test.ts`

Avant de commencer : créer (ou réutiliser) un client OAuth Google dans la console GCP du projet Allo-Chantiers, avec l'URI de redirection `http://localhost:3000/api/auth/callback/google`, et renseigner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` dans `.env.local`. Les tests n'en ont pas besoin.

- [ ] **Step 1: Écrire le test qui échoue (`proxy.test.ts`)**

```ts
import { encode } from 'next-auth/jwt'
import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { proxy } from './proxy'

const COOKIE = 'authjs.session-token' // nom du cookie hors HTTPS (dev, tests)

async function request(path: string, token?: Record<string, unknown>) {
  const headers = new Headers()
  if (token) {
    const jwt = await encode({ token, secret: process.env.AUTH_SECRET!, salt: COOKIE })
    headers.set('cookie', `${COOKIE}=${jwt}`)
  }
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers })
}

describe('proxy', () => {
  it('redirige un visiteur de /agent vers /login', async () => {
    const res = await proxy(await request('/agent/missions'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/login')
  })
  it('laisse passer un agent connecté', async () => {
    const res = await proxy(await request('/agent/missions', { kind: 'agent', agentId: 'a1' }))
    expect(res.headers.get('x-middleware-next')).toBe('1')
  })
  it('renvoie un agent qui tente /admin vers la connexion admin', async () => {
    const res = await proxy(await request('/admin/review', { kind: 'agent', agentId: 'a1' }))
    expect(res.headers.get('location')).toBe('http://localhost:3000/admin/login')
  })
  it('laisse passer un admin sur /admin, mais pas sur /agent', async () => {
    const admin = { kind: 'admin', email: 'marvin@allo-chantiers.fr' }
    expect((await proxy(await request('/admin', admin))).headers.get('x-middleware-next')).toBe('1')
    expect((await proxy(await request('/agent', admin))).status).toBe(307)
  })
  it('répond 401 en JSON sur l’API agent sans session', async () => {
    const res = await proxy(await request('/api/agent/missions/m1/steps'))
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })
  it('la page de connexion admin reste publique', async () => {
    expect((await proxy(await request('/admin/login'))).headers.get('x-middleware-next')).toBe('1')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run proxy.test.ts`
Expected: FAIL (module `./proxy` introuvable).

- [ ] **Step 3: Écrire `proxy.ts`**

```ts
import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

// Première barrière seulement : chaque page, route et server action revérifie avec lib/session.ts
// (requireAdmin / requireAgent), car une server action peut être appelée depuis n'importe quel chemin.
//
// /admin réservé à l'équipe, /agent et /api/agent réservés aux agents. Aucun accès base ici.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const adminArea = pathname.startsWith('/admin') && pathname !== '/admin/login'
  const agentArea = pathname === '/agent' || pathname.startsWith('/agent/') || pathname.startsWith('/api/agent/')
  if (!adminArea && !agentArea) return NextResponse.next()

  let kind: unknown = null
  try {
    // Cookie « __Secure- » seulement quand l'app est servie en HTTPS (AUTH_URL), pas selon NODE_ENV :
    // un `next start` local en HTTP doit rester utilisable.
    const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie: (process.env.AUTH_URL ?? '').startsWith('https://') })
    kind = token?.kind
  } catch {
    kind = null // jeton illisible → non connecté
  }
  if ((adminArea && kind === 'admin') || (agentArea && kind === 'agent')) return NextResponse.next()

  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const url = request.nextUrl.clone()
  url.pathname = adminArea ? '/admin/login' : '/login'
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = { matcher: ['/admin/:path*', '/agent', '/agent/:path*', '/api/agent/:path*'] }
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run proxy.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Tester puis écrire le contrôle d'accès admin (`lib/admin-access.ts`)**

`lib/admin-access.int.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { isAllowedAdmin } from './admin-access'

const ok = { email: 'Marvin@Allo-Chantiers.fr', email_verified: true, hd: 'allo-chantiers.fr' }

describe('isAllowedAdmin', () => {
  beforeEach(async () => {
    await resetDb()
    await prisma.adminUser.create({ data: { email: 'marvin@allo-chantiers.fr', role: 'ADMIN' } })
  })
  it('accepte un compte du domaine, vérifié, présent dans AdminUser (casse ignorée)', async () => {
    expect(await isAllowedAdmin(ok)).toBe(true)
  })
  it.each([
    ['email non vérifié', { ...ok, email_verified: false }],
    ['hd absent', { ...ok, hd: undefined }],
    ['autre domaine', { ...ok, email: 'marvin@gmail.com', hd: 'gmail.com' }],
    ['absent de AdminUser', { ...ok, email: 'other@allo-chantiers.fr' }],
  ])('refuse : %s', async (_label, profile) => {
    expect(await isAllowedAdmin(profile)).toBe(false)
  })
})
```

Run: `npx vitest run lib/admin-access.int.test.ts`
Expected: FAIL (module introuvable).

`lib/admin-access.ts` :

```ts
import { prisma } from '@/lib/prisma'

export const ADMIN_DOMAIN = 'allo-chantiers.fr'

/** Seule porte du back-office : compte Google Workspace du domaine, email vérifié, inscrit dans AdminUser. */
export async function isAllowedAdmin(profile: { email?: string | null; email_verified?: boolean | null; hd?: string | null } | undefined): Promise<boolean> {
  const email = String(profile?.email ?? '').toLowerCase()
  if (!profile?.email_verified || profile.hd !== ADMIN_DOMAIN || !email.endsWith('@' + ADMIN_DOMAIN)) return false
  return (await prisma.adminUser.findUnique({ where: { email } })) !== null
}
```

Run: `npx vitest run lib/admin-access.int.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Écrire `types/next-auth.d.ts`, `lib/auth.ts`, la route Auth.js et `lib/session.ts`**

`types/next-auth.d.ts` :

```ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    kind?: 'admin' | 'agent'
    agentId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    kind?: 'admin' | 'agent'
    agentId?: string
  }
}
```

`lib/auth.ts` :

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { ADMIN_DOMAIN, isAllowedAdmin } from '@/lib/admin-access'
import { authorizeAgentOtp } from '@/modules/recruitment'

// Deux populations, deux portes : l'équipe par Google Workspace (domaine + liste AdminUser),
// les agents par code SMS. Le rôle d'un admin est relu en base à chaque page (lib/session.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 3600 },
  // Un refus Google (AccessDenied) revient sur la page de connexion admin, pas sur la page d'erreur Auth.js.
  pages: { signIn: '/login', error: '/admin/login' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { hd: ADMIN_DOMAIN, prompt: 'select_account' } },
    }),
    Credentials({
      id: 'agent-otp',
      credentials: { phone: {}, code: {} },
      authorize: async (raw) => authorizeAgentOtp(String(raw?.phone ?? ''), String(raw?.code ?? '')),
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true
      return isAllowedAdmin(profile as { email?: string; email_verified?: boolean; hd?: string } | undefined)
    },
    async jwt({ token, account, user, profile }) {
      if (account?.provider === 'google') {
        token.kind = 'admin'
        token.email = String(profile?.email ?? '').toLowerCase()
      } else if (account?.provider === 'agent-otp' && user?.id) {
        token.kind = 'agent'
        token.agentId = user.id
      }
      return token
    },
    async session({ session, token }) {
      session.kind = token.kind
      session.agentId = token.agentId
      if (session.user && token.email) session.user.email = token.email
      return session
    },
  },
})
```

`app/api/auth/[...nextauth]/route.ts` :

```ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
```

`lib/session.ts` :

```ts
import type { AdminRole, Agent, AdminUser } from '@prisma/client'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Agent connecté, relu en base (statut à jour), ou null. */
export async function currentAgent(): Promise<Agent | null> {
  const session = await auth()
  if (session?.kind !== 'agent' || !session.agentId) return null
  return prisma.agent.findUnique({ where: { id: session.agentId } })
}

export async function requireAgent(): Promise<Agent> {
  const agent = await currentAgent()
  if (!agent) redirect('/login')
  return agent
}

/** Admin connecté avec un rôle autorisé, relu en base à chaque appel (un retrait d'accès est immédiat). */
export async function currentAdmin(roles: AdminRole[] = ['ADMIN', 'SETTER']): Promise<AdminUser | null> {
  const session = await auth()
  const email = session?.kind === 'admin' ? session.user?.email : null
  if (!email) return null
  const admin = await prisma.adminUser.findUnique({ where: { email } })
  return admin && roles.includes(admin.role) ? admin : null
}

export async function requireAdmin(roles: AdminRole[] = ['ADMIN', 'SETTER']): Promise<AdminUser> {
  const admin = await currentAdmin(roles)
  if (!admin) redirect('/admin/login?error=forbidden')
  return admin
}
```

- [ ] **Step 7: Écrire `scripts/add-admin.ts`**

```ts
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
```

- [ ] **Step 8: Vérifier**

Run: `npx tsc --noEmit && npm run admin:add -- marvin@allo-chantiers.fr ADMIN`
Expected: aucune erreur de typage, puis « OK : marvin@allo-chantiers.fr → ADMIN ».

- [ ] **Step 9: Commit**

```bash
git add proxy.ts proxy.test.ts lib/admin-access.ts lib/admin-access.int.test.ts lib/auth.ts lib/session.ts types app/api/auth scripts/add-admin.ts
git commit -m "feat(auth): Google Workspace for staff, SMS code for agents"
```

### Task 25: Quiz et certification (`modules/academy/index.ts`)

**Files:**
- Create: `modules/academy/index.ts`
- Test: `modules/academy/academy.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent } from '@/tests/helpers/factories'
import { allQuestions } from './content'
import { refuseAgent, submitQuiz, unlockAgent } from './index'

const right = Object.fromEntries(allQuestions().map((q) => [q.id, q.correctIndex]))
const wrong = Object.fromEntries(allQuestions().map((q) => [q.id, (q.correctIndex + 1) % q.options.length]))
const H = 3_600_000
const t0 = new Date('2026-10-16T12:00:00Z')

describe('quiz', () => {
  beforeEach(resetDb)

  it('réussite → CERTIFIED, tentative enregistrée', async () => {
    const agent = await makeAgent({ status: 'TRAINING' })
    expect(await submitQuiz(agent.id, right, t0)).toEqual({ ok: true, passed: true, score: 100, locked: false })
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } })).status).toBe('CERTIFIED')
    expect(await prisma.trainingAttempt.count()).toBe(1)
  })

  it('échec → attente de 24 h, puis verrouillage au 3e échec', async () => {
    const agent = await makeAgent({ status: 'TRAINING' })
    expect(await submitQuiz(agent.id, wrong, t0)).toMatchObject({ ok: true, passed: false, locked: false })
    expect((await submitQuiz(agent.id, wrong, new Date(t0.getTime() + H))).ok).toBe(false)
    await submitQuiz(agent.id, wrong, new Date(t0.getTime() + 25 * H))
    expect(await submitQuiz(agent.id, wrong, new Date(t0.getTime() + 50 * H))).toMatchObject({ ok: true, locked: true })
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } })).status).toBe('LOCKED')
  })

  it('un admin débloque (essais remis à zéro) ou refuse', async () => {
    const a = await makeAgent({ status: 'LOCKED', failedAttempts: 3, lastAttemptAt: t0 })
    await unlockAgent(a.id, 'marvin@allo-chantiers.fr')
    expect(await prisma.agent.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({ status: 'TRAINING', failedAttempts: 0, lastAttemptAt: null })

    const b = await makeAgent({ status: 'LOCKED' })
    await refuseAgent(b.id, 'marvin@allo-chantiers.fr', 'Quiz échoué 3 fois')
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('REFUSED')
    expect(await prisma.auditLog.count({ where: { action: { in: ['agent.unlock', 'agent.refuse'] } } })).toBe(2)
  })

  it('refuse de débloquer un agent qui n’est pas LOCKED', async () => {
    const a = await makeAgent({ status: 'ACTIVE' })
    await expect(unlockAgent(a.id, 'x')).rejects.toThrow('ACTIVE → TRAINING')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/academy/academy.int.test.ts`
Expected: FAIL (module `./index` introuvable).

- [ ] **Step 3: Écrire `modules/academy/index.ts`**

```ts
import type { AgentStatus } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { canTransitionAgent } from '@/modules/agents/agent-rule'
import { allQuestions } from './content'
import { attemptOutcome, canAttempt, scoreQuiz } from './quiz-rule'

export { ACADEMY_MODULES, quizForClient } from './content'

export type QuizResult = { ok: true; passed: boolean; score: number; locked: boolean } | { ok: false; error: string; retryAt?: Date }

export async function submitQuiz(agentId: string, answers: Record<string, number>, now: Date = new Date()): Promise<QuizResult> {
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    const can = canAttempt(agent, now)
    if (!can.ok) return { ok: false, error: can.reason, retryAt: can.retryAt }
    const score = scoreQuiz(allQuestions(), answers)
    const out = attemptOutcome(score, agent.failedAttempts)
    const status: AgentStatus = out.passed ? 'CERTIFIED' : out.lock ? 'LOCKED' : 'TRAINING'
    // Mise à jour conditionnelle : deux envois simultanés ne contournent ni l'attente de 24 h ni le verrouillage.
    const moved = await tx.agent.updateMany({
      where: { id: agentId, status: 'TRAINING', failedAttempts: agent.failedAttempts, lastAttemptAt: agent.lastAttemptAt },
      data: { status, failedAttempts: out.failedAttempts, lastAttemptAt: now },
    })
    if (moved.count !== 1) return { ok: false, error: 'Your answers were already submitted. Refresh the page.' }
    await tx.trainingAttempt.create({ data: { agentId, score, passed: out.passed, answers } })
    const action = out.passed ? 'agent.certified' : out.lock ? 'agent.locked' : 'agent.quiz_failed'
    await logAudit(tx, { actor: `agent:${agentId}`, action, entity: 'Agent', entityId: agentId, data: { score } })
    return { ok: true, passed: out.passed, score, locked: out.lock }
  })
}

async function moveAgent(db: Db, agentId: string, to: AgentStatus): Promise<void> {
  const agent = await db.agent.findUniqueOrThrow({ where: { id: agentId } })
  if (!canTransitionAgent(agent.status, to)) throw new Error(`Transition refusée : ${agent.status} → ${to}`)
}

export async function unlockAgent(agentId: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await moveAgent(tx, agentId, 'TRAINING')
    await tx.agent.update({ where: { id: agentId }, data: { status: 'TRAINING', failedAttempts: 0, lastAttemptAt: null } })
    await logAudit(tx, { actor, action: 'agent.unlock', entity: 'Agent', entityId: agentId })
  })
}

export async function refuseAgent(agentId: string, actor: string, reason: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await moveAgent(tx, agentId, 'REFUSED')
    await tx.agent.update({ where: { id: agentId }, data: { status: 'REFUSED' } })
    await logAudit(tx, { actor, action: 'agent.refuse', entity: 'Agent', entityId: agentId, reason })
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/academy/academy.int.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/academy/index.ts modules/academy/academy.int.test.ts
git commit -m "feat(academy): quiz submission, lock and admin unlock"
```

### Task 26: Contrat d'agent (`modules/contract`)

**Files:**
- Create: `modules/contract/contract-text.ts`, `modules/contract/index.ts`
- Test: `modules/contract/contract.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent } from '@/tests/helpers/factories'
import { CONTRACT_SECTIONS, CONTRACT_VERSION } from './contract-text'
import { signContract } from './index'

describe('contrat', () => {
  beforeEach(resetDb)

  it('un agent CERTIFIED signe et devient ACTIVE (phase 1 : sans condition Stripe)', async () => {
    const a = await makeAgent({ status: 'CERTIFIED' })
    const at = new Date('2026-10-16T12:00:00Z')
    expect(await signContract(a.id, { ip: '203.0.113.7', signedName: '  Maya R. Thompson ' }, at)).toEqual({ ok: true })
    expect(await prisma.agent.findUniqueOrThrow({ where: { id: a.id } })).toMatchObject({
      status: 'ACTIVE', contractVersion: CONTRACT_VERSION, contractSignedAt: at, contractIp: '203.0.113.7', contractSignedName: 'Maya R. Thompson',
    })
    expect(await prisma.auditLog.count({ where: { action: 'agent.contract_signed' } })).toBe(1)
  })

  it('refuse un agent qui n’est pas CERTIFIED', async () => {
    const a = await makeAgent({ status: 'TRAINING' })
    expect(await signContract(a.id, { ip: '203.0.113.7', signedName: 'Maya Thompson' })).toEqual({ ok: false, error: 'Finish your training before signing the agreement.' })
  })

  it('exige le nom légal tapé (signature)', async () => {
    const a = await makeAgent({ status: 'CERTIFIED' })
    expect(await signContract(a.id, { ip: '203.0.113.7', signedName: 'M' })).toEqual({ ok: false, error: 'Type your full legal name to sign.' })
  })

  it('le contrat contient les règles non négociables (spec §2, §8.3)', () => {
    const text = CONTRACT_SECTIONS.map((s) => s.body).join(' ')
    expect(text).toMatch(/not affiliated with Google/i)
    expect(text).toMatch(/password/i)
    expect(text).toMatch(/reviews?/i)
    expect(text).toMatch(/no quotas/i)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/contract`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `modules/contract/contract-text.ts`**

Texte provisoire : il doit être relu par un avocat US avant le lancement (spec §8.3, §14). La page l'affiche avec un bandeau « Draft » tant que `CONTRACT_IS_DRAFT` vaut `true`.

```ts
import { BRAND_NAME } from '@/lib/brand'

export const CONTRACT_VERSION = '2026-10-draft-1'
export const CONTRACT_IS_DRAFT = true

export const CONTRACT_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Independent contractor',
    body: `You work as an independent contractor, not as an employee of ${BRAND_NAME}. You choose which missions you accept, when, and where. There are no quotas and no required hours.`,
  },
  {
    title: 'What you are paid for',
    body: 'You are paid per mission, according to the payout steps shown in the app at the time you accept the mission. Payouts are sent weekly. You are responsible for your own taxes; we provide the tax forms required by law.',
  },
  {
    title: 'How you represent us',
    body: `You introduce yourself as a field agent with ${BRAND_NAME}. ${BRAND_NAME} is an independent company, not affiliated with Google. You never say or suggest that you work for, or on behalf of, Google.`,
  },
  {
    title: 'Owners’ accounts and passwords',
    body: 'The business owner creates and controls their own profile and Google account. You never ask for, type, store or write down an owner’s password or verification code.',
  },
  {
    title: 'No reviews',
    body: 'You never write, ask for, offer or discuss reviews or ratings of any business, and you are never paid for reviews.',
  },
  {
    title: 'Accurate information',
    body: 'Everything you submit (check-in, photos, answers) must be true and collected during the visit. Submitting false information ends this agreement and voids unpaid earnings for the missions concerned.',
  },
  {
    title: 'Ending the agreement',
    body: 'Either party can end this agreement at any time. Earnings already validated remain payable.',
  },
]
```

- [ ] **Step 4: Écrire `modules/contract/index.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { canTransitionAgent } from '@/modules/agents/agent-rule'
import { CONTRACT_VERSION } from './contract-text'

export { CONTRACT_IS_DRAFT, CONTRACT_SECTIONS, CONTRACT_VERSION } from './contract-text'

/**
 * Signature en click-wrap avec le nom légal tapé (maquette « Get paid setup »).
 * Phase 1 : CERTIFIED → ACTIVE ; la phase 2 exigera aussi Stripe payouts_enabled.
 */
export async function signContract(
  agentId: string,
  sig: { ip: string; signedName: string },
  now: Date = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const signedName = sig.signedName.trim().replace(/\s+/g, ' ')
  if (signedName.length < 3 || signedName.length > 120) return { ok: false, error: 'Type your full legal name to sign.' }
  return prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    if (agent.status !== 'CERTIFIED' || !canTransitionAgent(agent.status, 'ACTIVE')) {
      return { ok: false, error: 'Finish your training before signing the agreement.' }
    }
    await tx.agent.update({
      where: { id: agentId },
      data: { status: 'ACTIVE', contractVersion: CONTRACT_VERSION, contractSignedAt: now, contractIp: sig.ip, contractSignedName: signedName },
    })
    await logAudit(tx, { actor: `agent:${agentId}`, action: 'agent.contract_signed', entity: 'Agent', entityId: agentId, data: { version: CONTRACT_VERSION } })
    return { ok: true }
  })
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run modules/contract`
Expected: PASS (4 tests).

- [ ] **Step 6: Lancer toute la suite et commit**

Run: `npm test`
Expected: toute la suite au vert.

```bash
git add modules/contract
git commit -m "feat(contract): draft agent agreement and click-wrap signature"
```


## Chunk 7: Services — gains, changements de statut, pros

Deux fichiers internes sont partagés entre modules, par exception à la règle « on passe par `index.ts` » : `modules/missions/transition.ts` (changement de statut d'une mission) et `modules/review/flags.ts` (recalcul des alertes, chunk 9). Ils n'importent aucun `index.ts` de module métier, ce qui évite les imports circulaires.

### Task 27: Service des gains (`modules/ledger/index.ts`)

**Files:**
- Create: `modules/ledger/index.ts`
- Test: `modules/ledger/ledger.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { award, balanceOf, voidEarning } from './index'

async function validated(agentId: string, data: Record<string, unknown> = {}) {
  return makeMission({ agentId, status: 'VALIDATED', validatedAt: new Date(), ...data })
}

describe('ledger', () => {
  beforeEach(resetDb)

  it('crée le gain VISIT d’une mission validée, une seule fois', async () => {
    const agent = await makeAgent()
    const m = await validated(agent.id)
    const first = await award(m.id, 'VISIT')
    expect(first).toMatchObject({ ok: true, created: true })
    if (first.ok) expect(first.earning).toMatchObject({ amountCents: 4000, levelBonusPct: 0, status: 'PAYABLE' })
    expect(await award(m.id, 'VISIT')).toMatchObject({ ok: true, created: false })
    expect(await prisma.earning.count()).toBe(1)
  })

  it('applique le niveau Silver à la 5e mission validée', async () => {
    const agent = await makeAgent()
    for (let i = 0; i < 4; i++) await validated(agent.id)
    const fifth = await validated(agent.id)
    const r = await award(fifth.id, 'VISIT')
    expect(r.ok && r.earning.amountCents).toBe(4400)
  })

  it('URGENCY reprend le bonus de la mission', async () => {
    const agent = await makeAgent()
    const m = await validated(agent.id, { urgencyBonusCents: 1500 })
    const r = await award(m.id, 'URGENCY')
    expect(r.ok && r.earning.amountCents).toBe(1500)
  })

  it('refuse une mission non validée ou sans agent', async () => {
    const agent = await makeAgent()
    const submitted = await makeMission({ agentId: agent.id, status: 'SUBMITTED' })
    expect(await award(submitted.id, 'VISIT')).toEqual({ ok: false, reason: 'mission non validée' })
    expect(await prisma.earning.count()).toBe(0)
  })

  it('le solde ne compte que les gains PAYABLE ; une annulation est tracée', async () => {
    const agent = await makeAgent()
    const a = await award((await validated(agent.id)).id, 'VISIT')
    await award((await validated(agent.id)).id, 'VISIT')
    expect(await balanceOf(agent.id)).toBe(8000)
    if (!a.ok) throw new Error('award')
    await voidEarning(a.earning.id, 'Photos réutilisées', 'marvin@allo-chantiers.fr')
    expect(await balanceOf(agent.id)).toBe(4000)
    expect((await prisma.earning.findUniqueOrThrow({ where: { id: a.earning.id } })).voidReason).toBe('Photos réutilisées')
    await expect(voidEarning(a.earning.id, 'x', 'x')).rejects.toThrow('déjà VOID')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/ledger/ledger.int.test.ts`
Expected: FAIL (module `./index` introuvable).

- [ ] **Step 3: Écrire `modules/ledger/index.ts`**

```ts
import type { Earning, EarningTier } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { getSettings } from '@/modules/settings'
import { checkEligibility, computeAmount } from './ledger-rule'

export { computeAmount, levelFor, CLIENT_WINDOW_DAYS, LIVE_WINDOW_DAYS } from './ledger-rule'

export type AwardResult = { ok: true; earning: Earning; created: boolean } | { ok: false; reason: string }

/**
 * Seul point d'entrée qui crée un gain (spec §9.2). Idempotent : rejouer un déclencheur renvoie le gain
 * existant. À appeler dans la transaction qui vient de valider la mission (le niveau compte cette mission).
 */
export async function award(missionId: string, tier: EarningTier, db: Db = prisma, now: Date = new Date()): Promise<AwardResult> {
  const existing = await db.earning.findUnique({ where: { missionId_tier: { missionId, tier } } })
  if (existing) return { ok: true, earning: existing, created: false }

  const mission = await db.mission.findUniqueOrThrow({ where: { id: missionId } })
  const eligible = checkEligibility({ tier, mission, now })
  if (!eligible.ok) return eligible
  if (!mission.agentId) return { ok: false, reason: 'mission sans agent' }

  // Verrou par agent : deux validations simultanées comptent les missions validées l'une après l'autre
  // (sinon la 5e pourrait être payée au niveau Bronze).
  await db.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${'ledger:' + mission.agentId}))) AS l`
  const settings = await getSettings(db)
  const validatedCount = await db.mission.count({ where: { agentId: mission.agentId, status: 'VALIDATED' } })
  const amount = computeAmount({ tier, validatedCount, urgencyBonusCents: mission.urgencyBonusCents, settings })
  // skipDuplicates : un déclencheur concurrent ne fait pas échouer la transaction appelante (pas de P2002).
  const inserted = await db.earning.createMany({ data: [{ agentId: mission.agentId, missionId, tier, ...amount }], skipDuplicates: true })
  const earning = await db.earning.findUniqueOrThrow({ where: { missionId_tier: { missionId, tier } } })
  if (inserted.count === 0) return { ok: true, earning, created: false }
  await logAudit(db, {
    actor: 'system', action: 'earning.award', entity: 'Earning', entityId: earning.id,
    data: { missionId, tier, amountCents: amount.amountCents },
  })
  return { ok: true, earning, created: true }
}

/** Annule un gain pas encore payé (fraude avérée), avec un motif obligatoire. */
export async function voidEarning(earningId: string, reason: string, actor: string): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  await prisma.$transaction(async (tx) => {
    const e = await tx.earning.findUniqueOrThrow({ where: { id: earningId } })
    // Conditionnel : un gain pris dans un virement entre-temps (phase 2) n'est pas annulé.
    const res = await tx.earning.updateMany({ where: { id: earningId, status: 'PAYABLE' }, data: { status: 'VOID', voidReason: reason, voidedBy: actor } })
    if (res.count !== 1) throw new Error(`Gain déjà ${e.status === 'PAYABLE' ? 'modifié' : e.status}`)
    await logAudit(tx, { actor, action: 'earning.void', entity: 'Earning', entityId: earningId, reason })
  })
}

/** Solde payable d'un agent, en cents. */
export async function balanceOf(agentId: string, db: Db = prisma): Promise<number> {
  const r = await db.earning.aggregate({ where: { agentId, status: 'PAYABLE' }, _sum: { amountCents: true } })
  return r._sum.amountCents ?? 0
}

export async function listEarnings(agentId: string) {
  return prisma.earning.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    include: { mission: { select: { id: true, pro: { select: { city: true, state: true, trade: true } } } } },
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/ledger/ledger.int.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/ledger/index.ts modules/ledger/ledger.int.test.ts
git commit -m "feat(ledger): award, void and balance services"
```

### Task 28: Changement de statut d'une mission (`modules/missions/transition.ts`)

**Files:**
- Create: `modules/missions/transition.ts`
- Test: `modules/missions/transition.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { RELEASE_RESET, moveMission } from './transition'

describe('moveMission', () => {
  beforeEach(resetDb)

  it('valide une visite : mission VALIDATED, pro VISITED, action tracée', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED' })
    const at = new Date()
    const out = await moveMission(prisma, m.id, 'VALIDATED', 'marvin@allo-chantiers.fr', { data: { validatedAt: at } })
    expect(out).toMatchObject({ status: 'VALIDATED', validatedAt: at })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('VISITED')
    expect(await prisma.auditLog.count({ where: { action: 'mission.validated', entityId: m.id } })).toBe(1)
  })

  it('rejet d’une visite : pro AGREED, ou LOST avec le motif', async () => {
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, status: 'SUBMITTED' })
    await moveMission(prisma, m.id, 'REJECTED', 'x', { reason: 'Pas venu', markProLost: true })
    expect(await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).toMatchObject({ status: 'LOST', lostReason: 'Pas venu' })
  })

  it('refuse une transition interdite, ou un statut qui a changé depuis la lecture', async () => {
    const m = await makeMission({ status: 'OPEN' })
    await expect(moveMission(prisma, m.id, 'VALIDATED', 'x')).rejects.toThrow('OPEN → VALIDATED')
    const s = await makeMission({ status: 'SUBMITTED' })
    await expect(moveMission(prisma, s.id, 'REJECTED', 'x', { expectFrom: 'NEEDS_FIX' })).rejects.toThrow('a changé entre-temps')
  })

  it('remet à zéro les champs de l’agent quand la mission repasse OPEN', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', acceptedAt: new Date(), reminderSentAt: new Date(), noShowSmsAt: new Date() })
    const out = await moveMission(prisma, m.id, 'OPEN', 'system', { data: RELEASE_RESET })
    expect(out).toMatchObject({ status: 'OPEN', agentId: null, acceptedAt: null, reminderSentAt: null, noShowSmsAt: null })
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/transition.int.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/transition.ts`**

```ts
import type { Mission, MissionStatus, Prisma } from '@prisma/client'
import type { Db } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { canTransitionMission } from './mission-rule'
import { proStatusAfter } from './pro-rule'

/** Champs remis à zéro quand une mission repasse OPEN, pour que le prochain agent reçoive rappel et relance. */
export const RELEASE_RESET = {
  agentId: null,
  acceptedAt: null,
  reminderSentAt: null,
  noShowSmsAt: null,
} satisfies Prisma.MissionUncheckedUpdateManyInput

/**
 * Change le statut d'une mission selon la machine d'état (spec §7.2), met à jour le pro (spec §7.3)
 * et trace l'action. TOUJOURS appeler dans une transaction (`db` = tx) : le verrou du pro et la mise à
 * jour conditionnelle de la mission ne protègent que dans une transaction.
 */
export async function moveMission(
  db: Db,
  missionId: string,
  to: MissionStatus,
  actor: string,
  opts: {
    data?: Prisma.MissionUncheckedUpdateManyInput
    reason?: string
    markProLost?: boolean
    expectFrom?: MissionStatus // statut que l'appelant a lu : refus s'il a changé entre-temps (tâches planifiées)
    expectAgentId?: string
  } = {},
): Promise<Mission> {
  if (opts.markProLost && !opts.reason?.trim()) throw new Error('Motif obligatoire pour passer le pro LOST')
  const found = await db.mission.findUniqueOrThrow({ where: { id: missionId } })
  // Verrou sur la ligne du pro, toujours pris EN PREMIER (setProStatus fait de même) : deux actions
  // simultanées sur un même pro se suivent au lieu de s'écraser, sans risque d'interblocage.
  await db.$queryRaw`SELECT id FROM "Pro" WHERE id = ${found.proId} FOR UPDATE`
  const m = await db.mission.findUniqueOrThrow({ where: { id: missionId }, include: { pro: true } })
  if (opts.expectFrom && m.status !== opts.expectFrom) throw new Error(`La mission a changé entre-temps (${m.status}, attendu ${opts.expectFrom})`)
  if (opts.expectAgentId && m.agentId !== opts.expectAgentId) throw new Error('La mission a changé entre-temps (autre agent)')
  if (!canTransitionMission(m.status, to)) throw new Error(`Transition refusée : ${m.status} → ${to}`)
  const res = await db.mission.updateMany({ where: { id: missionId, status: m.status }, data: { ...opts.data, status: to } })
  if (res.count !== 1) throw new Error('La mission a changé entre-temps : rechargez la page')

  const kind = to === 'VALIDATED' ? 'VALIDATED' : to === 'REJECTED' ? 'REJECTED' : to === 'CANCELLED' ? 'CANCELLED' : null
  if (kind) {
    const next = proStatusAfter(m.pro.status, { kind, missionType: m.type, markLost: opts.markProLost })
    if (next !== m.pro.status) {
      await db.pro.update({ where: { id: m.proId }, data: { status: next, ...(next === 'LOST' ? { lostReason: opts.reason ?? null } : {}) } })
    }
  }
  await logAudit(db, { actor, action: `mission.${to.toLowerCase()}`, entity: 'Mission', entityId: missionId, reason: opts.reason })
  return db.mission.findUniqueOrThrow({ where: { id: missionId } })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/transition.int.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/missions/transition.ts modules/missions/transition.int.test.ts
git commit -m "feat(missions): guarded mission transitions with pro status and audit"
```

### Task 29: Gestion des pros (`modules/missions/pros.ts`)

**Files:**
- Create: `modules/missions/pros.ts`
- Modify: `modules/missions/csv-rule.ts`, `modules/missions/csv-rule.test.ts` (numéro de ligne sur chaque pro lu)
- Test: `modules/missions/pros.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeMission, makePro } from '@/tests/helpers/factories'
import { createPro, importPros, setProStatus } from './pros'

vi.mock('@/modules/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/geo')>()),
  geocodeAddress: vi.fn(async (q: string) => (q.includes('Nowhere') ? null : { lat: 42.3564, lng: -71.0621 })),
}))

const input = {
  businessName: 'Delgado Concrete & Masonry Restoration Services LLC',
  contactName: 'Frank Delgado',
  phone: '(617) 555-0142',
  address: '120 Tremont Street',
  city: 'Boston',
  state: 'ma',
  zip: '02108',
  trade: 'Concrete contractor',
}

describe('pros', () => {
  beforeEach(resetDb)

  it('crée un pro géocodé, au fuseau de son État, statut TO_CALL', async () => {
    const r = await createPro(input, 'setter@allo-chantiers.fr')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.pro).toMatchObject({ phone: '+16175550142', state: 'MA', timeZone: 'America/New_York', lat: 42.3564, status: 'TO_CALL' })
    expect(await prisma.auditLog.count({ where: { action: 'pro.create' } })).toBe(1)
  })

  it('garde le pro sans coordonnées si l’adresse est introuvable, et le signale', async () => {
    const r = await createPro({ ...input, address: '1 Nowhere Road' }, 'x')
    expect(r.ok && r.pro.lat).toBeNull()
    expect(r.ok && r.warning).toBe('Adresse introuvable : saisissez la latitude et la longitude à la main avant de créer une mission.')
  })

  it('accepte des coordonnées saisies à la main', async () => {
    const r = await createPro({ ...input, address: '1 Nowhere Road', lat: '42.30', lng: '-71.10' }, 'x')
    expect(r.ok && r.pro).toMatchObject({ lat: 42.3, lng: -71.1 })
  })

  it('renvoie les erreurs par champ', async () => {
    const r = await createPro({ ...input, phone: '123', zip: 'abc' }, 'x')
    expect(r).toMatchObject({ ok: false, fieldErrors: { phone: 'Téléphone US invalide', zip: 'Code postal à 5 chiffres' } })
  })

  it('importe un CSV, ignore les doublons de téléphone', async () => {
    await makePro({ phone: '+16175550199' })
    const csv = 'business_name,phone,address,city,state,zip,trade\nAcme Fence,6175550142,1 Main St,Boston,MA,02108,Fence\nBay Fence,6175550199,2 Main St,Boston,MA,02108,Fence\nCape Fence,123,3 Main St,Boston,MA,02108,Fence\n'
    const r = await importPros(csv, 'x')
    expect(r.created).toBe(1)
    expect(r.errors).toEqual([
      { line: 3, message: 'Déjà présent (même téléphone)' },
      { line: 4, message: 'Téléphone US invalide' },
    ])
  })

  it('passer un pro LOST annule ses missions en cours (spec §7.3)', async () => {
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, status: 'OPEN' })
    await setProStatus(pro.id, 'LOST', 'x', 'Ne répond plus')
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).status).toBe('CANCELLED')
    expect(await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).toMatchObject({ status: 'LOST', lostReason: 'Ne répond plus' })
  })

  it('refuse un statut posé à la main hors des cas permis, et LOST sans motif', async () => {
    const pro = await makePro({ status: 'AGREED' })
    await expect(setProStatus(pro.id, 'VISITED', 'x')).rejects.toThrow('AGREED → VISITED')
    await expect(setProStatus(pro.id, 'LOST', 'x', ' ')).rejects.toThrow('Motif obligatoire')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/pros.int.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Transmettre le numéro de ligne du CSV**

`importPros` signale les doublons avec la ligne du fichier : `ProCsvRow` doit la porter. Dans `modules/missions/csv-rule.ts`, ajouter le champ à l'interface :

```ts
export interface ProCsvRow {
  line: number // numéro de la ligne dans le fichier
  businessName: string
  contactName: string | null
  phone: string
  address: string
  city: string
  state: string
  zip: string
  trade: string
}
```

et dans `parseProsCsv` (pas dans `parseCsvRows`), remplacer exactement :

```ts
    rows.push({
      businessName: get('business_name'),
```

par :

```ts
    rows.push({
      line,
      businessName: get('business_name'),
```

 Dans `modules/missions/csv-rule.test.ts`, test « lit les lignes valides… », ajouter `line: 2,` en tête de l'objet attendu.

Run: `npx vitest run modules/missions/csv-rule.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 4: Écrire `modules/missions/pros.ts`**

```ts
import type { Pro, ProStatus } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { US_TIME_ZONES, defaultTimeZoneForState } from '@/lib/time'
import { logAudit } from '@/modules/audit'
import { geocodeAddress } from '@/modules/geo'
import { normalizeUsPhone } from '@/modules/sms'
import { parseProsCsv } from './csv-rule'
import { STATUSES_CANCELLED_ON_LOST, canSetProStatusManually } from './pro-rule'
import { moveMission } from './transition'

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null)
const optionalCoord = z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined || v === '' ? null : Number(v)))

// Messages en français : ce formulaire n'est utilisé que dans le back-office.
export const ProInputSchema = z.object({
  businessName: z.string().trim().min(2, 'Nom trop court').max(150),
  contactName: optionalText(100),
  phone: z.string().transform((v, ctx) => normalizeUsPhone(v) ?? (ctx.addIssue({ code: 'custom', message: 'Téléphone US invalide' }), z.NEVER)),
  address: z.string().trim().min(3, 'Adresse manquante').max(200),
  city: z.string().trim().min(2, 'Ville manquante').max(80),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/, 'État à 2 lettres').transform((s) => s.toUpperCase()),
  zip: z.string().trim().regex(/^\d{5}$/, 'Code postal à 5 chiffres'),
  trade: z.string().trim().min(2, 'Métier manquant').max(80),
  timeZone: optionalText(60),
  existingPlaceId: optionalText(200),
  notes: optionalText(2000),
  lat: optionalCoord,
  lng: optionalCoord,
})

export type ProFormResult = { ok: true; pro: Pro; warning: string | null } | { ok: false; fieldErrors: Record<string, string> }
const NO_COORDS = 'Adresse introuvable : saisissez la latitude et la longitude à la main avant de créer une mission.'

async function prepare(input: Record<string, unknown>) {
  const parsed = ProInputSchema.safeParse(input)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0] ?? 'form')] ??= i.message
    return { ok: false as const, fieldErrors }
  }
  const p = parsed.data
  const timeZone = p.timeZone ?? defaultTimeZoneForState(p.state)
  if (!timeZone || !US_TIME_ZONES.includes(timeZone)) return { ok: false as const, fieldErrors: { timeZone: 'Fuseau horaire inconnu' } }
  const manual = p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)
  const coords = manual ? { lat: p.lat!, lng: p.lng! } : await geocodeAddress(`${p.address}, ${p.city}, ${p.state} ${p.zip}`)
  const { lat: _lat, lng: _lng, ...rest } = p
  return { ok: true as const, data: { ...rest, timeZone, lat: coords?.lat ?? null, lng: coords?.lng ?? null } }
}

export async function createPro(input: Record<string, unknown>, actor: string): Promise<ProFormResult> {
  const prep = await prepare(input)
  if (!prep.ok) return prep
  const pro = await prisma.$transaction(async (tx) => {
    const created = await tx.pro.create({ data: prep.data })
    await logAudit(tx, { actor, action: 'pro.create', entity: 'Pro', entityId: created.id })
    return created
  })
  return { ok: true, pro, warning: pro.lat == null ? NO_COORDS : null }
}

export async function updatePro(proId: string, input: Record<string, unknown>, actor: string): Promise<ProFormResult> {
  const prep = await prepare(input)
  if (!prep.ok) return prep
  const pro = await prisma.$transaction(async (tx) => {
    const updated = await tx.pro.update({ where: { id: proId }, data: prep.data })
    await logAudit(tx, { actor, action: 'pro.update', entity: 'Pro', entityId: proId })
    return updated
  })
  return { ok: true, pro, warning: pro.lat == null ? NO_COORDS : null }
}

export const MAX_IMPORT_ROWS = 300

/** Import CSV : chaque ligne valide devient un pro TO_CALL ; les doublons de téléphone sont ignorés. */
export async function importPros(csv: string, actor: string): Promise<{ created: number; withoutCoords: number; errors: { line: number; message: string }[] }> {
  const { rows, errors } = parseProsCsv(csv)
  // Le géocodage se fait ligne par ligne (jusqu'à 10 s chacune) : on plafonne la taille d'un import.
  if (rows.length > MAX_IMPORT_ROWS) return { created: 0, withoutCoords: 0, errors: [{ line: 1, message: `Fichier trop long : ${MAX_IMPORT_ROWS} lignes au plus par import` }] }
  let created = 0
  let withoutCoords = 0
  const out = [...errors]
  for (const row of rows) {
    const line = row.line
    if (await prisma.pro.findFirst({ where: { phone: row.phone } })) {
      out.push({ line, message: 'Déjà présent (même téléphone)' })
      continue
    }
    const r = await createPro({ ...row, contactName: row.contactName ?? undefined }, actor)
    if (!r.ok) {
      out.push({ line, message: Object.values(r.fieldErrors).join(', ') })
      continue
    }
    created++
    if (r.warning) withoutCoords++
  }
  return { created, withoutCoords, errors: out.sort((a, b) => a.line - b.line) }
}

/** Statut posé à la main par un setter (TO_CALL ↔ AGREED, ou LOST avec motif). */
export async function setProStatus(proId: string, to: ProStatus, actor: string, reason?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Pro" WHERE id = ${proId} FOR UPDATE` // même ordre de verrou que moveMission
    const pro = await tx.pro.findUniqueOrThrow({ where: { id: proId } })
    if (!canSetProStatusManually(pro.status, to)) throw new Error(`Statut refusé : ${pro.status} → ${to}`)
    if (to === 'LOST') {
      if (!reason?.trim()) throw new Error('Motif obligatoire')
      const running = await tx.mission.findMany({ where: { proId, status: { in: [...STATUSES_CANCELLED_ON_LOST] } } })
      for (const m of running) await moveMission(tx, m.id, 'CANCELLED', actor, { data: { cancelReason: 'Pro perdu' }, reason, markProLost: true })
    }
    await tx.pro.update({ where: { id: proId }, data: { status: to, lostReason: to === 'LOST' ? reason! : null } })
    await logAudit(tx, { actor, action: 'pro.status', entity: 'Pro', entityId: proId, reason, data: { to } })
  })
}

export async function listPros(filter: { status?: ProStatus; q?: string } = {}) {
  const q = filter.q?.trim()
  return prisma.pro.findMany({
    where: {
      ...(filter.status ? { status: filter.status } : {}),
      ...(q ? { OR: [{ businessName: { contains: q, mode: 'insensitive' } }, { city: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  })
}

export async function getPro(proId: string) {
  return prisma.pro.findUnique({
    where: { id: proId },
    include: { missions: { orderBy: { createdAt: 'desc' }, include: { agent: { select: { id: true, firstName: true, lastName: true } } } } },
  })
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run modules/missions/pros.int.test.ts modules/missions/csv-rule.test.ts`
Expected: PASS (7 + 6 tests).

- [ ] **Step 6: Commit**

```bash
git add modules/missions/pros.ts modules/missions/pros.int.test.ts modules/missions/csv-rule.ts modules/missions/csv-rule.test.ts
git commit -m "feat(missions): pros create, update, CSV import and manual status"
```


## Chunk 8: Services — missions (création, dispatch, acceptation, back-office)

### Task 30: Missions côté équipe et côté agent (`modules/missions/missions.ts`)

**Files:**
- Modify: `modules/sms/templates.ts`, `modules/sms/templates.test.ts` (gabarit `proAgentChanged`)
- Create: `modules/missions/missions.ts`
- Test: `modules/missions/missions.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import {
  acceptMission, adminBoards, createMission, getMissionForAgent, listOpenMissionsFor,
  releaseMission, rescheduleMission, setUrgencyBonus, widenMission,
} from './missions'

const H = 3_600_000
const now = new Date('2026-10-16T12:00:00Z')
const later = (h: number) => new Date(now.getTime() + h * H)

describe('création de mission', () => {
  beforeEach(resetDb)

  it('crée une visite pour un pro AGREED, à l’heure locale du pro, et le passe MISSION_OPEN', async () => {
    const pro = await makePro({ status: 'AGREED' })
    const r = await createMission(pro.id, { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Concrete contractor', instructions: 'Owner has 3 trucks\nVideo verification likely' }, 'setter@allo-chantiers.fr', now)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.mission.slotAt.toISOString()).toBe('2026-10-20T14:00:00.000Z') // 10:00 à Boston (UTC−4)
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('MISSION_OPEN')
  })

  it('refuse un pro qui n’est pas AGREED, sans coordonnées, ou un créneau passé', async () => {
    const toCall = await makePro({ status: 'TO_CALL' })
    expect(await createMission(toCall.id, { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Fence' }, 'x', now)).toMatchObject({ ok: false })
    const noCoords = await makePro({ status: 'AGREED', lat: null, lng: null })
    expect(await createMission(noCoords.id, { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Fence' }, 'x', now))
      .toEqual({ ok: false, error: 'Coordonnées du pro manquantes : corrigez son adresse ou saisissez-les.' })
    const pro = await makePro({ status: 'AGREED' })
    expect(await createMission(pro.id, { slotLocal: '2026-10-01T10:00', suggestedCategory: 'Fence' }, 'x', now))
      .toEqual({ ok: false, error: 'Le créneau doit être dans le futur' })
  })

  it('deux créations simultanées pour le même pro : une seule passe', async () => {
    const pro = await makePro({ status: 'AGREED' })
    const input = { slotLocal: '2026-10-20T10:00', suggestedCategory: 'Fence' }
    const results = await Promise.all([createMission(pro.id, input, 'a', now), createMission(pro.id, input, 'b', now)])
    expect(results.filter((r) => r.ok)).toHaveLength(1)
    expect(await prisma.mission.count()).toBe(1)
  })
})

describe('missions vues par un agent', () => {
  beforeEach(resetDb)

  it('liste les missions visibles, triées par distance, sans nom ni adresse du pro', async () => {
    const agent = await makeAgent({ radiusMiles: 10 })
    const near = await makeMission({ slotAt: later(48) }) // centre de Boston
    await makeMission({ slotAt: later(48), proId: (await makePro({ lat: 42.2626, lng: -71.8023, city: 'Worcester' })).id }) // hors rayon
    await makeMission({ slotAt: later(-1) }) // créneau passé
    const list = await listOpenMissionsFor(agent, now)
    expect(list.map((m) => m.id)).toEqual([near.id])
    expect(list[0]).toMatchObject({ city: 'Boston', state: 'MA', trade: 'Concrete contractor', approx: { lat: 42.36, lng: -71.06 } })
    expect(JSON.stringify(list)).not.toContain('Tremont')
    expect(JSON.stringify(list)).not.toContain('Masonry')
  })

  it('un agent non ACTIVE ne voit rien', async () => {
    await makeMission({ slotAt: later(48) })
    expect(await listOpenMissionsFor(await makeAgent({ status: 'CERTIFIED' }), now)).toEqual([])
  })

  it('le détail révèle le pro seulement à l’agent qui a la mission ; la paie tient compte du niveau', async () => {
    const agent = await makeAgent()
    for (let i = 0; i < 4; i++) await makeMission({ agentId: agent.id, status: 'VALIDATED', validatedAt: now })
    const m = await makeMission({ slotAt: later(48), urgencyBonusCents: 1000 })
    const before = await getMissionForAgent(m.id, agent, now)
    expect(before?.pro).toBeNull()
    // 4 visites validées : celle-ci serait la 5e → Silver +10 % sur les 3 paliers (spec §6.2)
    expect(before?.pay).toEqual({ kind: 'VISIT', visitCents: 4000, liveCents: 2500, clientCents: 5000, returnVisitCents: 0, urgencyCents: 1000, levelName: 'SILVER', levelBonusPct: 10, levelBonusCents: 1150, upToCents: 13650 })
    await acceptMission(m.id, agent, now)
    expect((await getMissionForAgent(m.id, agent, now))?.pro?.businessName).toContain('Boston Concrete')
    expect(await getMissionForAgent(m.id, await makeAgent(), now)).toBeNull()
  })
})

describe('acceptation et désistement', () => {
  beforeEach(resetDb)

  it('accepte, prévient le pro par SMS, et refuse un second agent', async () => {
    const [maya, sam] = [await makeAgent(), await makeAgent({ firstName: 'Sam' })]
    const m = await makeMission({ slotAt: later(48) })
    expect(await acceptMission(m.id, maya, now)).toEqual({ ok: true })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ status: 'ACCEPTED', agentId: maya.id, acceptedAt: now })
    expect(memorySmsDriver.sent.at(-1)?.body).toContain('Maya will visit you on')
    expect(await acceptMission(m.id, sam, now)).toEqual({ ok: false, error: 'This mission is no longer available.' })
  })

  it('3 missions acceptées au maximum', async () => {
    const agent = await makeAgent()
    for (let i = 0; i < 3; i++) await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(48) })
    const m = await makeMission({ slotAt: later(48) })
    expect(await acceptMission(m.id, agent, now)).toEqual({ ok: false, error: 'You can hold 3 missions at a time. Finish or release one first.' })
  })

  it('désistement possible à 24 h ou plus, refusé en dessous', async () => {
    const agent = await makeAgent()
    const ok = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(30), acceptedAt: now, reminderSentAt: now })
    expect(await releaseMission(ok.id, agent, now)).toEqual({ ok: true })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: ok.id } })).toMatchObject({ status: 'OPEN', agentId: null, reminderSentAt: null, publishedAt: now })
    expect(memorySmsDriver.sent.at(-1)?.body).toContain('can no longer make your visit')
    const late = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(10) })
    expect(await releaseMission(late.id, agent, now)).toEqual({ ok: false, error: 'Less than 24 hours before the visit: contact support to cancel.' })
  })
})

describe('outils du back-office', () => {
  beforeEach(resetDb)

  it('replanifie une mission ouverte et la republie', async () => {
    const m = await makeMission({ slotAt: later(-5), publishedAt: later(-100) })
    expect(await rescheduleMission(m.id, '2026-10-22T09:30', 'x', now)).toEqual({ ok: true })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ slotAt: new Date('2026-10-22T13:30:00Z'), publishedAt: now })
  })

  it('élargit le rayon et ajoute un bonus urgence', async () => {
    const m = await makeMission({ slotAt: later(48) })
    await widenMission(m.id, 50, 'x')
    await setUrgencyBonus(m.id, 1500, 'x')
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ broadcastRadiusMiles: 50, urgencyBonusCents: 1500 })
  })

  it('encarts : non prises, à replanifier, visites sans nouvelles', async () => {
    const agent = await makeAgent()
    const untaken = await makeMission({ slotAt: later(48), publishedAt: later(-49) })
    const past = await makeMission({ slotAt: later(-3) })
    const silent = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: later(-3) })
    await makeMission({ slotAt: later(48), publishedAt: later(-1) }) // récente : dans aucun encart
    const b = await adminBoards(now)
    expect(b.untaken.map((m) => m.id)).toEqual([untaken.id])
    expect(b.toReschedule.map((m) => m.id)).toEqual([past.id])
    expect(b.silent.map((m) => m.id)).toEqual([silent.id])
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/missions.int.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Ajouter le gabarit `proAgentChanged`**

Dans `modules/sms/templates.ts`, ajouter à l'objet `smsTemplates` (après `proReminder`) :

```ts
  proAgentChanged: (p: { agentFirstName: string; slot: string }) =>
    `${BRAND_NAME}: ${plain(p.agentFirstName)} can no longer make your visit on ${p.slot}. We will text you when another agent confirms.`,
```

Dans `modules/sms/templates.test.ts`, ajouter `smsTemplates.proAgentChanged({ agentFirstName: 'Maya', slot: 'Wed, Jul 1, 10:00 AM' }),` au tableau `samples`.

Run: `npx vitest run modules/sms/templates.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3 bis: Écrire `modules/missions/missions.ts`**

```ts
import type { Agent, Mission, MissionStatus, MissionType, Pro } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { formatSlot, zonedLocalToUtc } from '@/lib/time'
import { logAudit } from '@/modules/audit'
import { approximate, distanceMiles } from '@/modules/geo'
import { computeAmount, levelFor } from '@/modules/ledger'
import { getSettings } from '@/modules/settings'
import { sendSms, smsTemplates } from '@/modules/sms'
import type { StepsData } from './checklist-rule'
import { isUntaken, isVisibleTo, needsReschedule } from './dispatch-rule'
import { MAX_ACCEPTED_PER_AGENT, NO_SHOW_SMS_HOURS, RELEASE_MIN_HOURS, canRelease } from './mission-rule'
import { proStatusAfter } from './pro-rule'
import { RELEASE_RESET, moveMission } from './transition'

const H = 3_600_000

export const MissionInputSchema = z.object({
  slotLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Créneau invalide'),
  suggestedCategory: z.string().trim().min(2, 'Catégorie manquante').max(100),
  instructions: z.string().trim().max(1000).optional().transform((v) => v || null),
})

type Fail = { ok: false; error: string }

/** Crée une visite pour un pro AGREED. Le passage AGREED → MISSION_OPEN est conditionnel : une seule création gagne. */
export async function createMission(proId: string, input: Record<string, unknown>, actor: string, now: Date = new Date()): Promise<{ ok: true; mission: Mission } | Fail> {
  const parsed = MissionInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message }
  return prisma.$transaction(async (tx) => {
    const pro = await tx.pro.findUniqueOrThrow({ where: { id: proId } })
    if (pro.status !== 'AGREED') return { ok: false as const, error: `Le pro doit être « d'accord » (statut actuel : ${pro.status})` }
    if (pro.lat == null || pro.lng == null) return { ok: false as const, error: 'Coordonnées du pro manquantes : corrigez son adresse ou saisissez-les.' }
    const slotAt = zonedLocalToUtc(parsed.data.slotLocal, pro.timeZone)
    if (slotAt <= now) return { ok: false as const, error: 'Le créneau doit être dans le futur' }
    const next = proStatusAfter(pro.status, { kind: 'CREATED', missionType: 'VISIT' })
    const claimed = await tx.pro.updateMany({ where: { id: proId, status: 'AGREED' }, data: { status: next } })
    if (claimed.count !== 1) return { ok: false as const, error: 'Une mission vient d’être créée pour ce pro.' }
    const mission = await tx.mission.create({
      data: { proId, slotAt, publishedAt: now, suggestedCategory: parsed.data.suggestedCategory, instructions: parsed.data.instructions },
    })
    await logAudit(tx, { actor, action: 'mission.create', entity: 'Mission', entityId: mission.id })
    return { ok: true as const, mission }
  })
}

export interface MissionSummary {
  id: string
  type: MissionType
  status: MissionStatus
  trade: string
  city: string
  state: string
  distanceMiles: number
  slotAt: string
  slotLabel: string
  approx: { lat: number; lng: number } // position arrondie (≈ 1 km) : jamais l'adresse avant acceptation
  urgencyBonusCents: number
}

function toSummary(m: Mission, pro: Pro, from: { lat: number; lng: number }): MissionSummary {
  const point = { lat: pro.lat ?? from.lat, lng: pro.lng ?? from.lng }
  return {
    id: m.id,
    type: m.type,
    status: m.status,
    trade: pro.trade,
    city: pro.city,
    state: pro.state,
    distanceMiles: Math.round(distanceMiles(from, point) * 10) / 10,
    slotAt: m.slotAt.toISOString(),
    slotLabel: formatSlot(m.slotAt, pro.timeZone),
    approx: approximate(point),
    urgencyBonusCents: m.urgencyBonusCents,
  }
}

/** Missions proposées à un agent ACTIVE (spec §4.5), triées par distance. */
export async function listOpenMissionsFor(agent: Agent, now: Date = new Date()): Promise<MissionSummary[]> {
  if (agent.status !== 'ACTIVE') return []
  const missions = await prisma.mission.findMany({ where: { status: 'OPEN', slotAt: { gt: now } }, include: { pro: true } })
  return missions
    .filter((m) => isVisibleTo({ agent, mission: m, pro: m.pro, now }))
    .map((m) => toSummary(m, m.pro, agent))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

export type PayBreakdown = {
  kind: MissionType
  visitCents: number
  liveCents: number
  clientCents: number
  returnVisitCents: number
  urgencyCents: number
  levelName: 'BRONZE' | 'SILVER' | 'GOLD'
  levelBonusPct: number
  levelBonusCents: number
  upToCents: number
}

/** Paie affichée avant d'accepter : montants de base, bonus de niveau (cette mission comprise) et bonus urgence. */
export async function payBreakdownFor(agent: Agent, mission: Pick<Mission, 'type' | 'urgencyBonusCents'>): Promise<PayBreakdown> {
  const settings = await getSettings()
  const validatedCount = (await prisma.mission.count({ where: { agentId: agent.id, status: 'VALIDATED' } })) + 1
  const level = levelFor(validatedCount, settings.levels)
  type PaidTier = keyof typeof settings.tierAmountsCents // VISIT | LIVE | CLIENT | RETURN_VISIT
  const tiers: PaidTier[] = mission.type === 'RETURN_VISIT' ? ['RETURN_VISIT'] : ['VISIT', 'LIVE', 'CLIENT']
  const parts = tiers.map((tier) => computeAmount({ tier, validatedCount, urgencyBonusCents: 0, settings }))
  const base = (t: PaidTier) => (tiers.includes(t) ? settings.tierAmountsCents[t] : 0)
  const levelBonusCents = parts.reduce((s, p) => s + p.amountCents - p.baseAmountCents, 0)
  const baseTotal = parts.reduce((s, p) => s + p.baseAmountCents, 0)
  return {
    kind: mission.type,
    visitCents: base('VISIT'),
    liveCents: base('LIVE'),
    clientCents: base('CLIENT'),
    returnVisitCents: base('RETURN_VISIT'),
    urgencyCents: mission.urgencyBonusCents,
    levelName: level.name,
    levelBonusPct: level.bonusPct,
    levelBonusCents,
    upToCents: baseTotal + levelBonusCents + mission.urgencyBonusCents,
  }
}

export interface MissionDetail {
  summary: MissionSummary
  mine: boolean
  suggestedCategory: string
  instructions: string[]
  bookedAt: string
  claimExisting: boolean
  canRelease: boolean
  releaseDeadlineLabel: string
  fixMessage: string | null
  pay: PayBreakdown
  pro: { businessName: string; contactName: string | null; phone: string; address: string; city: string; state: string; zip: string } | null
}

/** Détail pour un agent : le pro (nom, adresse, téléphone) n'est révélé qu'à l'agent qui a la mission. */
export async function getMissionForAgent(missionId: string, agent: Agent, now: Date = new Date()): Promise<MissionDetail | null> {
  const m = await prisma.mission.findUnique({ where: { id: missionId }, include: { pro: true } })
  if (!m) return null
  const mine = m.agentId === agent.id
  if (!mine && !(agent.status === 'ACTIVE' && isVisibleTo({ agent, mission: m, pro: m.pro, now }))) return null
  const p = m.pro
  return {
    summary: toSummary(m, p, agent),
    mine,
    suggestedCategory: m.suggestedCategory,
    instructions: (m.instructions ?? '').split('\n').map((l) => l.trim()).filter(Boolean),
    bookedAt: m.createdAt.toISOString(),
    claimExisting: p.existingPlaceId != null,
    canRelease: mine && m.status === 'ACCEPTED' && canRelease(m.slotAt, now),
    releaseDeadlineLabel: formatSlot(new Date(m.slotAt.getTime() - RELEASE_MIN_HOURS * H), p.timeZone),
    fixMessage: mine ? m.fixMessage : null,
    pay: await payBreakdownFor(agent, m),
    pro: mine ? { businessName: p.businessName, contactName: p.contactName, phone: p.phone, address: p.address, city: p.city, state: p.state, zip: p.zip } : null,
  }
}

/** Acceptation atomique : une mission n'a qu'un agent, un agent n'a pas plus de 3 missions acceptées. */
export async function acceptMission(missionId: string, agent: Agent, now: Date = new Date()): Promise<{ ok: true } | Fail> {
  if (agent.status !== 'ACTIVE') return { ok: false, error: 'Your account is not active yet.' }
  const res = await prisma.$transaction(async (tx) => {
    // Sérialise les acceptations d'un même agent, pour que la limite de 3 tienne en cas de double clic.
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${agent.id}))) AS l`
    // Statut relu sous le verrou (suspendAgent prend le même) : un agent suspendu à l'instant n'accepte rien.
    const fresh = await tx.agent.findUniqueOrThrow({ where: { id: agent.id }, select: { status: true } })
    if (fresh.status !== 'ACTIVE') return { ok: false as const, error: 'Your account is not active.' }
    const held = await tx.mission.count({ where: { agentId: agent.id, status: 'ACCEPTED' } })
    if (held >= MAX_ACCEPTED_PER_AGENT) {
      return { ok: false as const, error: `You can hold ${MAX_ACCEPTED_PER_AGENT} missions at a time. Finish or release one first.` }
    }
    const m = await tx.mission.findUnique({ where: { id: missionId }, include: { pro: true } })
    if (!m || !isVisibleTo({ agent, mission: m, pro: m.pro, now })) return { ok: false as const, error: 'This mission is no longer available.' }
    const taken = await tx.mission.updateMany({
      where: { id: missionId, status: 'OPEN', agentId: null },
      data: { status: 'ACCEPTED', agentId: agent.id, acceptedAt: now, reminderSentAt: null, noShowSmsAt: null },
    })
    if (taken.count !== 1) return { ok: false as const, error: 'This mission is no longer available.' }
    await logAudit(tx, { actor: `agent:${agent.id}`, action: 'mission.accepted', entity: 'Mission', entityId: missionId })
    return { ok: true as const, pro: m.pro, slotAt: m.slotAt }
  })
  if (!res.ok) return res
  try {
    await sendSms(res.pro.phone, smsTemplates.proVisitConfirmed({ agentFirstName: agent.firstName, slot: formatSlot(res.slotAt, res.pro.timeZone) }))
  } catch (e) {
    console.error('[missions] SMS de confirmation au pro échoué', e) // l'acceptation reste valable
  }
  return { ok: true }
}

/** Désistement de l'agent, jusqu'à 24 h avant le créneau (spec §4.5). */
export async function releaseMission(missionId: string, agent: Agent, now: Date = new Date()): Promise<{ ok: true } | Fail> {
  const m = await prisma.mission.findUnique({ where: { id: missionId } })
  if (!m || m.agentId !== agent.id || m.status !== 'ACCEPTED') return { ok: false, error: 'You can’t release this mission.' }
  if (!canRelease(m.slotAt, now)) return { ok: false, error: 'Less than 24 hours before the visit: contact support to cancel.' }
  // Republiée : le compteur « non prise depuis 48 h » repart de zéro.
  await prisma.$transaction((tx) => moveMission(tx, missionId, 'OPEN', `agent:${agent.id}`, { data: { ...RELEASE_RESET, publishedAt: now }, reason: 'Désistement de l’agent' }))
  await notifyProAgentChanged(missionId, agent.firstName)
  return { ok: true }
}

/** Prévient le pro que l'agent annoncé ne viendra pas (il avait reçu « Maya will visit you… »). */
export async function notifyProAgentChanged(missionId: string, agentFirstName: string): Promise<void> {
  const m = await prisma.mission.findUnique({ where: { id: missionId }, include: { pro: true } })
  if (!m) return
  try {
    await sendSms(m.pro.phone, smsTemplates.proAgentChanged({ agentFirstName, slot: formatSlot(m.slotAt, m.pro.timeZone) }))
  } catch (e) {
    console.error('[missions] SMS au pro (changement d’agent) échoué', e)
  }
}

export async function cancelMission(missionId: string, actor: string, reason: string, markProLost = false): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  await prisma.$transaction((tx) => moveMission(tx, missionId, 'CANCELLED', actor, { data: { cancelReason: reason }, reason, markProLost }))
}

/** Nouveau créneau pour une mission OPEN ; elle est republiée (le compteur « non prise » repart de zéro). */
export async function rescheduleMission(missionId: string, slotLocal: string, actor: string, now: Date = new Date()): Promise<{ ok: true } | Fail> {
  const m = await prisma.mission.findUniqueOrThrow({ where: { id: missionId }, include: { pro: true } })
  if (m.status !== 'OPEN') return { ok: false, error: 'Seule une mission ouverte se replanifie.' }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(slotLocal)) return { ok: false, error: 'Créneau invalide' }
  const slotAt = zonedLocalToUtc(slotLocal, m.pro.timeZone)
  if (slotAt <= now) return { ok: false, error: 'Le créneau doit être dans le futur' }
  return prisma.$transaction(async (tx) => {
    // Conditionnel : si un agent vient d'accepter, on ne déplace pas un créneau qu'il a déjà confirmé.
    const res = await tx.mission.updateMany({ where: { id: missionId, status: 'OPEN' }, data: { slotAt, publishedAt: now, reminderSentAt: null, noShowSmsAt: null } })
    if (res.count !== 1) return { ok: false as const, error: 'La mission vient d’être acceptée : rechargez la page.' }
    await logAudit(tx, { actor, action: 'mission.reschedule', entity: 'Mission', entityId: missionId, data: { slotAt: slotAt.toISOString() } })
    return { ok: true as const }
  })
}

export async function widenMission(missionId: string, miles: number, actor: string): Promise<void> {
  if (!Number.isInteger(miles) || miles < 1 || miles > 200) throw new Error('Rayon entre 1 et 200 miles')
  await prisma.$transaction(async (tx) => {
    const res = await tx.mission.updateMany({ where: { id: missionId, status: 'OPEN' }, data: { broadcastRadiusMiles: miles } })
    if (res.count !== 1) throw new Error('Seule une mission ouverte peut être élargie')
    await logAudit(tx, { actor, action: 'mission.widen', entity: 'Mission', entityId: missionId, data: { miles } })
  })
}

export async function setUrgencyBonus(missionId: string, cents: number, actor: string): Promise<void> {
  if (!Number.isInteger(cents) || cents < 0 || cents > 10_000) throw new Error('Bonus entre 0 et 100 $')
  await prisma.$transaction(async (tx) => {
    const res = await tx.mission.updateMany({ where: { id: missionId, status: { in: ['OPEN', 'ACCEPTED'] } }, data: { urgencyBonusCents: cents } })
    if (res.count !== 1) throw new Error('Bonus possible seulement sur une mission ouverte ou acceptée')
    await logAudit(tx, { actor, action: 'mission.urgency_bonus', entity: 'Mission', entityId: missionId, data: { cents } })
  })
}

/** Encarts du back-office (spec §5.2). */
export async function adminBoards(now: Date = new Date()) {
  const open = await prisma.mission.findMany({ where: { status: 'OPEN' }, include: { pro: true }, orderBy: { slotAt: 'asc' } })
  const late = await prisma.mission.findMany({
    where: { status: 'ACCEPTED', slotAt: { lte: new Date(now.getTime() - NO_SHOW_SMS_HOURS * H) } },
    include: { pro: true, agent: true, submission: true },
    orderBy: { slotAt: 'asc' },
  })
  return {
    untaken: open.filter((m) => isUntaken(m, now)),
    toReschedule: open.filter((m) => needsReschedule(m, now)),
    silent: late.filter((m) => !((m.submission?.steps ?? {}) as StepsData).checkin),
  }
}

export async function listMissions(filter: { status?: MissionStatus } = {}) {
  return prisma.mission.findMany({
    where: filter.status ? { status: filter.status } : {},
    include: { pro: true, agent: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { slotAt: 'desc' },
    take: 300,
  })
}

/** Missions d'un agent pour l'onglet « Visits ». */
export async function listAgentMissions(agent: Agent) {
  const missions = await prisma.mission.findMany({
    where: { agentId: agent.id },
    include: { pro: true, earnings: true },
    orderBy: { slotAt: 'desc' },
    take: 100,
  })
  return missions.map((m) => ({ ...toSummary(m, m.pro, agent), businessName: m.pro.businessName, earnedCents: m.earnings.filter((e) => e.status !== 'VOID').reduce((s, e) => s + e.amountCents, 0) }))
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/missions/missions.int.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/missions/missions.ts modules/missions/missions.int.test.ts
git commit -m "feat(missions): create, dispatch, accept, release and back-office tools"
```


## Chunk 9: Services — visite, alertes anti-fraude, agents

### Task 31: Recalcul des alertes (`modules/review/flags.ts`)

**Files:**
- Create: `modules/review/flags.ts`
- Test: `modules/review/flags.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { refreshFraudFlags } from './flags'

const at = '2026-10-16T14:00:00.000Z'
const checkin = (lat: number) => ({ checkin: { lat, lng: -71.0621, accuracy: 10, clientAt: at, receivedAt: at } })

describe('refreshFraudFlags', () => {
  beforeEach(resetDb)

  it('enregistre les alertes, puis marque résolues celles qui ne s’appliquent plus', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'SUBMITTED' })
    await prisma.submission.create({ data: { missionId: m.id, steps: checkin(42.36) } }) // ≈ 400 m du pro
    await refreshFraudFlags(m.id)
    expect((await prisma.fraudFlag.findMany()).map((f) => f.type)).toEqual(['CHECKIN_FAR'])
    await prisma.submission.update({ where: { missionId: m.id }, data: { steps: checkin(42.3564) } })
    await refreshFraudFlags(m.id)
    expect(await prisma.fraudFlag.count({ where: { resolved: false } })).toBe(0)
    expect(await prisma.fraudFlag.count({ where: { resolved: true } })).toBe(1)
  })

  it('DUPLICATE_PRO : même téléphone qu’un autre pro déjà visité, jamais le pro lui-même', async () => {
    const agent = await makeAgent()
    const other = await makePro({ phone: '+16175550142', status: 'VISITED' })
    await makeMission({ proId: other.id, agentId: agent.id, status: 'VALIDATED' })
    const pro = await makePro({ phone: '+16175550142' })
    await makeMission({ proId: pro.id, agentId: agent.id, status: 'VALIDATED' }) // visite d'origine du même pro
    const ret = await makeMission({ proId: pro.id, agentId: agent.id, type: 'RETURN_VISIT', status: 'SUBMITTED' })
    await refreshFraudFlags(ret.id)
    const flags = await prisma.fraudFlag.findMany()
    expect(flags.map((f) => f.type)).toEqual(['DUPLICATE_PRO'])
    expect(flags[0].detail).toContain('1 autre')
  })

  it('ne touche pas aux alertes NO_SHOW posées par la tâche d’absence', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'SUBMITTED' })
    await prisma.fraudFlag.create({ data: { missionId: m.id, agentId: agent.id, type: 'NO_SHOW', detail: 'x' } })
    await refreshFraudFlags(m.id)
    expect(await prisma.fraudFlag.count({ where: { type: 'NO_SHOW' } })).toBe(1)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/review/flags.int.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/review/flags.ts`**

```ts
import type { FraudType } from '@prisma/client'
import { prisma, type Db } from '@/lib/prisma'
import type { StepsData } from '@/modules/missions/checklist-rule'
import { computeFraudFlags, normalizeAddress } from './fraud-rule'

// Alertes posées ailleurs (tâche d'absence) : jamais recalculées ni retirées ici.
const EXTERNAL: FraudType[] = ['NO_SHOW']

/** Recalcule les alertes d'une mission à partir de sa checklist, de ses photos et de la réponse SMS du pro. */
export async function refreshFraudFlags(missionId: string, db: Db = prisma): Promise<void> {
  const m = await db.mission.findUniqueOrThrow({
    where: { id: missionId },
    include: { pro: true, submission: { include: { photos: true } } },
  })
  if (!m.agentId) return
  const steps = (m.submission?.steps ?? {}) as StepsData
  const checkin = steps.checkin
    ? { lat: steps.checkin.lat, lng: steps.checkin.lng, accuracy: steps.checkin.accuracy, clientAt: new Date(steps.checkin.clientAt), receivedAt: new Date(steps.checkin.receivedAt) }
    : null

  // Doublon = un AUTRE pro (même téléphone ou même adresse) qui a déjà une visite validée.
  const candidates = await db.pro.findMany({
    where: { id: { not: m.proId }, OR: [{ phone: m.pro.phone }, { zip: m.pro.zip }], missions: { some: { status: 'VALIDATED' } } },
    select: { phone: true, address: true, zip: true },
  })
  const key = normalizeAddress(m.pro.address, m.pro.zip)
  const duplicateValidatedCount = candidates.filter((c) => c.phone === m.pro.phone || normalizeAddress(c.address, c.zip) === key).length

  const findings = computeFraudFlags({
    pro: { lat: m.pro.lat, lng: m.pro.lng },
    checkin,
    photos: m.submission?.photos ?? [],
    duplicateValidatedCount,
    proRating: m.proRating,
    proDenied: m.proDenied,
  })

  for (const f of findings) {
    await db.fraudFlag.upsert({
      where: { missionId_agentId_type: { missionId, agentId: m.agentId, type: f.type } },
      create: { missionId, agentId: m.agentId, type: f.type, detail: f.detail },
      update: { detail: f.detail, resolved: false },
    })
  }
  // Une alerte qui ne s'applique plus est marquée résolue, jamais supprimée : l'historique reste visible.
  await db.fraudFlag.updateMany({
    where: { missionId, agentId: m.agentId, resolved: false, type: { notIn: [...findings.map((f) => f.type), ...EXTERNAL] } },
    data: { resolved: true },
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/review/flags.int.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add modules/review/flags.ts modules/review/flags.int.test.ts
git commit -m "feat(review): persist fraud flags from checklist data"
```

### Task 32: Checklist de visite côté serveur (`modules/missions/visit.ts`)

**Files:**
- Create: `modules/missions/consent-text.ts`, `modules/missions/visit.ts`
- Test: `modules/missions/visit.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { getStorage } from '@/modules/storage'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { CONSENT_VERSION } from './consent-text'
import { addPhoto, getVisitState, saveStep, submitVisit } from './visit'

const clientAt = '2026-10-16T14:00:00.000Z'
const now = new Date('2026-10-16T14:00:05Z')
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
const steps = {
  checkin: { lat: 42.3565, lng: -71.0622, accuracy: 12, clientAt },
  consent: { signerName: 'Frank Delgado', textVersion: CONSENT_VERSION, signaturePng: PNG, clientAt },
  profile: { listingName: 'Delgado Concrete & Masonry', category: 'Concrete contractor', city: 'Boston', zip: '02108', mode: 'CREATED', clientAt },
  invite: { result: 'INVITE_SENT', clientAt },
  verification: { result: 'VIDEO_NOT_OFFERED', clientAt },
  checkout: { clientAt },
} as const

async function accepted() {
  const agent = await makeAgent()
  const mission = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: new Date('2026-10-16T14:00:00Z') })
  return { agent, mission }
}

async function completeVisit(agentId: string, missionId: string) {
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } })
  for (const [name, data] of Object.entries(steps)) expect((await saveStep(agent, missionId, name, data, now)).ok).toBe(true)
  for (let i = 0; i < 10; i++) {
    expect((await addPhoto(agent, missionId, { bytes: JPEG, category: i < 2 ? 'LOGO' : 'JOB', clientAt }, now)).ok).toBe(true)
  }
  return agent
}

describe('checklist de visite', () => {
  beforeEach(resetDb)

  it('enregistre le check-in avec l’heure de réception serveur', async () => {
    const { agent, mission } = await accepted()
    const r = await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.state.steps.checkin).toMatchObject({ lat: 42.3565, receivedAt: now.toISOString() })
    expect(r.state.missing).not.toContain('checkin')
  })

  it('exige le check-in avant toute autre étape', async () => {
    const { agent, mission } = await accepted()
    expect(await saveStep(agent, mission.id, 'invite', steps.invite, now)).toEqual({ ok: false, status: 409, error: 'Check in first.' })
  })

  it('stocke la signature comme fichier et n’en garde que la clé', async () => {
    const { agent, mission } = await accepted()
    await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    const r = await saveStep(agent, mission.id, 'consent', steps.consent, now)
    if (!r.ok) throw new Error(r.error)
    const key = r.state.steps.consent!.signatureKey
    expect(key).toMatch(/^missions\/[a-z0-9]+\/signature-[a-f0-9]{32}\.png$/)
    expect(await getStorage().get(key)).not.toBeNull()
    expect(JSON.stringify(r.state.steps)).not.toContain('base64')
  })

  it('refuse un texte d’accord périmé et un fichier photo qui n’est pas un JPEG', async () => {
    const { agent, mission } = await accepted()
    await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    expect(await saveStep(agent, mission.id, 'consent', { ...steps.consent, textVersion: 'consent-v0' }, now))
      .toEqual({ ok: false, status: 409, error: 'The consent text changed. Reload the page.' })
    expect(await addPhoto(agent, mission.id, { bytes: Buffer.from('hello'), category: 'LOGO', clientAt }, now))
      .toEqual({ ok: false, status: 400, error: 'Photos must be JPEG images.' })
  })

  it('refuse la soumission tant qu’il manque des étapes', async () => {
    const { agent, mission } = await accepted()
    await saveStep(agent, mission.id, 'checkin', steps.checkin, now)
    const r = await submitVisit(agent, mission.id, now)
    expect(r).toMatchObject({ ok: false, status: 409 })
    if (!r.ok) expect(r.error).toContain('photos')
  })

  it('soumet une visite complète : SUBMITTED, SMS au pro, alertes calculées', async () => {
    const { agent, mission } = await accepted()
    await completeVisit(agent.id, mission.id)
    const r = await submitVisit(agent, mission.id, now)
    expect(r.ok).toBe(true)
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'SUBMITTED', submittedAt: now, postVisitSmsAt: now })
    expect(memorySmsDriver.sent.at(-1)?.body).toContain('Reply 1-5')
    expect(await prisma.fraudFlag.count()).toBe(0)
  })

  it('en NEEDS_FIX : check-in figé, photos modifiables, pas de second SMS au pro', async () => {
    const { agent, mission } = await accepted()
    await completeVisit(agent.id, mission.id)
    await submitVisit(agent, mission.id, now)
    await prisma.mission.update({ where: { id: mission.id }, data: { status: 'NEEDS_FIX', needsFixAt: now, fixMessage: 'Add a truck photo.' } })
    const sms = memorySmsDriver.sent.length
    expect(await saveStep(agent, mission.id, 'checkin', steps.checkin, now)).toEqual({ ok: false, status: 409, error: 'This step can no longer be changed.' })
    expect((await addPhoto(agent, mission.id, { bytes: JPEG, category: 'VEHICLE', clientAt }, now)).ok).toBe(true)
    expect((await submitVisit(agent, mission.id, now)).ok).toBe(true)
    expect(memorySmsDriver.sent.length).toBe(sms)
  })

  it('refuse un check-in plus de 24 h après le créneau, et un agent suspendu', async () => {
    const { agent, mission } = await accepted()
    const late = new Date(mission.slotAt.getTime() + 25 * 3_600_000)
    expect(await saveStep(agent, mission.id, 'checkin', steps.checkin, late)).toEqual({ ok: false, status: 409, error: 'Too late to check in for this visit. Contact support.' })
    const suspended = { ...agent, status: 'SUSPENDED' as const }
    expect(await saveStep(suspended, mission.id, 'checkin', steps.checkin, now)).toEqual({ ok: false, status: 409, error: 'Your account is not active. Contact support.' })
  })

  it('une mission reprise par l’équipe n’est plus modifiable par l’ancien agent', async () => {
    const { agent, mission } = await accepted()
    await prisma.mission.update({ where: { id: mission.id }, data: { status: 'OPEN', agentId: null } })
    expect(await saveStep(agent, mission.id, 'checkin', steps.checkin, now)).toEqual({ ok: false, status: 404, error: 'Mission not found.' })
    expect(await getVisitState(mission.id, agent)).toBeNull()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/visit.int.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `modules/missions/consent-text.ts`**

```ts
import { BRAND_NAME } from '@/lib/brand'

// Texte signé par le pro à l'étape 2 (spec §4.6). Toute modification change la version : le téléphone
// qui a chargé l'ancien texte est invité à recharger, la signature porte toujours sur le texte lu.
export const CONSENT_VERSION = 'consent-v1'

export function consentText(): string[] {
  return [
    'I own or manage this business. The Google Business Profile we set up today belongs to me.',
    `I authorize ${BRAND_NAME} to be added as a manager of my profile. I can remove this access at any time.`,
    `${BRAND_NAME} may contact me about an optional profile management offer.`,
    'I will get a short text message about today’s visit.',
  ]
}
```

- [ ] **Step 4: Écrire `modules/missions/visit.ts`**

```ts
import { randomUUID } from 'node:crypto'
import type { Agent, Mission, PhotoCategory, Pro } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { managerInviteEmail } from '@/lib/brand'
import { logAudit } from '@/modules/audit'
import { refreshFraudFlags } from '@/modules/review/flags'
import { sendSms, smsTemplates } from '@/modules/sms'
import { getStorage } from '@/modules/storage'
import { MIN_PHOTOS, editableSteps, missingSteps, parseStepInput, type StepName, type StepsData } from './checklist-rule'
import { CONSENT_VERSION, consentText } from './consent-text'
import { NO_SHOW_RELEASE_HOURS } from './mission-rule'
import { moveMission } from './transition'

export const MAX_PHOTOS = 20
const MAX_PHOTO_BYTES = 3_000_000
const CATEGORIES: PhotoCategory[] = ['LOGO', 'VEHICLE', 'TEAM', 'EQUIPMENT', 'JOB']

export interface VisitState {
  missionId: string
  type: Mission['type']
  status: Mission['status']
  businessName: string
  steps: StepsData
  photos: { id: string; category: PhotoCategory; url: string }[]
  missing: StepName[]
  editable: StepName[]
  minPhotos: number
  maxPhotos: number
  consent: { version: string; text: string[] }
  managerEmail: string
  claimExisting: boolean
  fixMessage: string | null
}

export type VisitResult = { ok: true; state: VisitState } | { ok: false; status: 400 | 404 | 409; error: string }

const fail = (status: 400 | 404 | 409, error: string) => ({ ok: false as const, status, error })
const isPng = (b: Buffer) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
const fileId = () => randomUUID().replaceAll('-', '')

type Loaded = Mission & { pro: Pro; submission: { steps: unknown; photos: { id: string; category: PhotoCategory; storageKey: string }[] } | null }

async function load(missionId: string, agentId: string): Promise<Loaded | null> {
  const m = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { pro: true, submission: { include: { photos: { orderBy: { receivedAt: 'asc' } } } } },
  })
  return m && m.agentId === agentId ? m : null
}

function toState(m: Loaded): VisitState {
  const steps = (m.submission?.steps ?? {}) as StepsData
  const photos = m.submission?.photos ?? []
  return {
    missionId: m.id,
    type: m.type,
    status: m.status,
    businessName: m.pro.businessName,
    steps,
    photos: photos.map((p) => ({ id: p.id, category: p.category, url: `/api/files/${p.storageKey}` })),
    missing: missingSteps(m.type, steps, photos.length),
    editable: editableSteps(m.type, m.status),
    minPhotos: MIN_PHOTOS,
    maxPhotos: MAX_PHOTOS,
    consent: { version: CONSENT_VERSION, text: consentText() },
    managerEmail: managerInviteEmail(),
    claimExisting: m.pro.existingPlaceId != null,
    fixMessage: m.fixMessage,
  }
}

export async function getVisitState(missionId: string, agent: Agent): Promise<VisitState | null> {
  const m = await load(missionId, agent.id)
  return m ? toState(m) : null
}

async function reload(missionId: string, agent: Agent): Promise<VisitResult> {
  const m = await load(missionId, agent.id)
  return m ? { ok: true, state: toState(m) } : fail(404, 'Mission not found.')
}

export const TOO_LATE = 'Too late to check in for this visit. Contact support.'

/** Seul un agent ACTIVE modifie une visite (un agent suspendu ne corrige plus ses missions). */
const inactive = (agent: Agent) => (agent.status !== 'ACTIVE' ? fail(409, 'Your account is not active. Contact support.') : null)

/** Enregistre une étape de la checklist (spec §4.6, §7.2). Les sauvegardes d'une même mission sont sérialisées. */
export async function saveStep(agent: Agent, missionId: string, step: string, data: unknown, now: Date = new Date()): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  const parsed = parseStepInput(step, data)

  // La signature est envoyée au stockage AVANT la transaction (pas d'appel réseau sous verrou).
  let signatureKey: string | null = null
  if (parsed.success && parsed.step === 'consent') {
    const c = parsed.data as { textVersion: string; signaturePng: string }
    if (c.textVersion !== CONSENT_VERSION) return fail(409, 'The consent text changed. Reload the page.')
    const png = Buffer.from(c.signaturePng.slice(c.signaturePng.indexOf(',') + 1), 'base64')
    if (!isPng(png)) return fail(400, 'Invalid signature image.')
    const owned = await prisma.mission.findUnique({ where: { id: missionId }, select: { agentId: true } })
    if (owned?.agentId !== agent.id) return fail(404, 'Mission not found.')
    signatureKey = `missions/${missionId}/signature-${fileId()}.png`
    await getStorage().put(signatureKey, png)
  }

  const out = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${missionId}))) AS l`
    const m = await tx.mission.findUnique({ where: { id: missionId }, include: { submission: true } })
    if (!m || m.agentId !== agent.id) {
      // Mission reprise pour absence (tâche planifiée) : on le dit à l'agent plutôt qu'un « introuvable ».
      const noShow = await tx.fraudFlag.findUnique({ where: { missionId_agentId_type: { missionId, agentId: agent.id, type: 'NO_SHOW' } } })
      return noShow ? fail(409, TOO_LATE) : fail(404, 'Mission not found.')
    }
    if (m.status !== 'ACCEPTED' && m.status !== 'NEEDS_FIX') return fail(409, 'This visit can no longer be edited.')
    if (!parsed.success) return fail(400, parsed.error)
    if (!editableSteps(m.type, m.status).includes(parsed.step)) return fail(409, 'This step can no longer be changed.')
    const current = (m.submission?.steps ?? {}) as StepsData
    if (parsed.step !== 'checkin' && !current.checkin) return fail(409, 'Check in first.')
    // Check-in tardif refusé (spec §4.5) : au-delà de 24 h après le créneau, la mission doit être reprise.
    if (parsed.step === 'checkin' && !current.checkin && now.getTime() - m.slotAt.getTime() >= NO_SHOW_RELEASE_HOURS * 3_600_000) {
      return fail(409, TOO_LATE)
    }
    let value: Record<string, unknown> = parsed.data
    if (parsed.step === 'consent') {
      const c = parsed.data as { signerName: string; textVersion: string; clientAt: string }
      value = { signerName: c.signerName, textVersion: c.textVersion, signatureKey, clientAt: c.clientAt }
    }
    const next = { ...current, [parsed.step]: { ...value, receivedAt: now.toISOString() } }
    await tx.submission.upsert({ where: { missionId }, create: { missionId, steps: next }, update: { steps: next } })
    return { ok: true as const }
  })
  return out.ok ? reload(missionId, agent) : out
}

export interface PhotoInput {
  bytes: Buffer
  category: string
  clientAt: string
  exifTakenAt?: string | null
  exifLat?: number | null
  exifLng?: number | null
}

export async function addPhoto(agent: Agent, missionId: string, input: PhotoInput, now: Date = new Date()): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  if (!CATEGORIES.includes(input.category as PhotoCategory)) return fail(400, 'Unknown photo category.')
  if (!isJpeg(input.bytes)) return fail(400, 'Photos must be JPEG images.')
  if (input.bytes.length > MAX_PHOTO_BYTES) return fail(400, 'Photo too large.')
  const clientAt = new Date(input.clientAt)
  if (Number.isNaN(clientAt.getTime())) return fail(400, 'Invalid photo time.')
  const m = await load(missionId, agent.id)
  if (!m) return fail(404, 'Mission not found.')
  const taken = input.exifTakenAt ? new Date(input.exifTakenAt) : null
  const geoOk = input.exifLat != null && input.exifLng != null && Math.abs(input.exifLat) <= 90 && Math.abs(input.exifLng) <= 180

  // Fichier envoyé avant la transaction ; contrôles et plafond refaits sous le verrou de la mission.
  const storageKey = `missions/${missionId}/photos/${fileId()}.jpg`
  await getStorage().put(storageKey, input.bytes)
  const out = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${missionId}))) AS l`
    const fresh = await tx.mission.findUnique({ where: { id: missionId }, include: { submission: { include: { _count: { select: { photos: true } } } } } })
    if (!fresh || fresh.agentId !== agent.id) return fail(404, 'Mission not found.')
    if (!editableSteps(fresh.type, fresh.status).includes('photos')) return fail(409, 'Photos can no longer be changed.')
    if (!((fresh.submission?.steps ?? {}) as StepsData).checkin) return fail(409, 'Check in first.')
    if ((fresh.submission?._count.photos ?? 0) >= MAX_PHOTOS) return fail(409, `You can add up to ${MAX_PHOTOS} photos.`)
    const submission = await tx.submission.upsert({ where: { missionId }, create: { missionId }, update: {} })
    await tx.photo.create({
      data: {
        submissionId: submission.id,
        storageKey,
        category: input.category as PhotoCategory,
        exifTakenAt: taken && !Number.isNaN(taken.getTime()) ? taken : null,
        exifLat: geoOk ? input.exifLat! : null,
        exifLng: geoOk ? input.exifLng! : null,
        clientAt,
        receivedAt: now,
      },
    })
    return { ok: true as const }
  })
  return out.ok ? reload(missionId, agent) : out
}

export async function deletePhoto(agent: Agent, missionId: string, photoId: string): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  const m = await load(missionId, agent.id)
  if (!m) return fail(404, 'Mission not found.')
  if (!editableSteps(m.type, m.status).includes('photos')) return fail(409, 'Photos can no longer be changed.')
  await prisma.photo.deleteMany({ where: { id: photoId, submission: { missionId } } })
  return reload(missionId, agent)
}

/** Soumission (spec §4.6) : toutes les étapes faites ; SMS au pro à la première soumission seulement. */
export async function submitVisit(agent: Agent, missionId: string, now: Date = new Date()): Promise<VisitResult> {
  const blocked = inactive(agent)
  if (blocked) return blocked
  const m = await load(missionId, agent.id)
  if (!m) return fail(404, 'Mission not found.')
  if (m.status !== 'ACCEPTED' && m.status !== 'NEEDS_FIX') return fail(409, 'This visit was already submitted.')
  const missing = missingSteps(m.type, (m.submission?.steps ?? {}) as StepsData, m.submission?.photos.length ?? 0)
  if (missing.length > 0) return fail(409, `Finish these steps first: ${missing.join(', ')}.`)

  const firstSubmission = m.status === 'ACCEPTED' && !m.postVisitSmsAt
  try {
    await prisma.$transaction(async (tx) => {
      await moveMission(tx, missionId, 'SUBMITTED', `agent:${agent.id}`, {
        data: { submittedAt: now, needsFixAt: null, ...(firstSubmission ? { postVisitSmsAt: now } : {}) },
      })
      await logAudit(tx, { actor: `agent:${agent.id}`, action: 'visit.submit', entity: 'Mission', entityId: missionId, data: { photos: m.submission?.photos.length ?? 0 } })
      // Dans la transaction : une visite n'arrive jamais dans la file de validation sans ses alertes.
      await refreshFraudFlags(missionId, tx)
    })
  } catch (e) {
    // Double envoi simultané : le second trouve la mission déjà SUBMITTED.
    if (e instanceof Error && /Transition refusée|a changé entre-temps/.test(e.message)) return fail(409, 'This visit was already submitted.')
    throw e
  }
  if (firstSubmission) {
    try {
      await sendSms(m.pro.phone, smsTemplates.proPostVisit({ agentFirstName: agent.firstName }))
    } catch (e) {
      console.error('[visit] SMS après visite échoué', e)
    }
  }
  return reload(missionId, agent)
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run modules/missions/visit.int.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add modules/missions/consent-text.ts modules/missions/visit.ts modules/missions/visit.int.test.ts
git commit -m "feat(missions): visit checklist, signature and photo storage, submission"
```

### Task 33: Interface publique du module missions (`modules/missions/index.ts`)

**Files:**
- Create: `modules/missions/index.ts`

- [ ] **Step 1: Écrire `modules/missions/index.ts`**

```ts
export * from './missions'
export * from './pros'
export * from './visit'
export { CONSENT_VERSION, consentText } from './consent-text'
export { MIN_PHOTOS, STEPS_BY_TYPE, type StepName, type StepsData } from './checklist-rule'
export { MAX_ACCEPTED_PER_AGENT } from './mission-rule'
```

- [ ] **Step 2: Vérifier et commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur (aucun nom exporté deux fois).

```bash
git add modules/missions/index.ts
git commit -m "chore(missions): public module interface"
```

### Task 34: Actions de l'équipe sur les agents (`modules/agents/index.ts`)

**Files:**
- Create: `modules/agents/index.ts`
- Test: `modules/agents/agents.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { agentStats, reactivateAgent, suspendAgent } from './index'

describe('agents (équipe)', () => {
  beforeEach(resetDb)

  it('suspendre libère ses missions acceptées (spec §7.1)', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', acceptedAt: new Date() })
    await suspendAgent(agent.id, 'marvin@allo-chantiers.fr', 'Photos réutilisées')
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: agent.id } })).status).toBe('SUSPENDED')
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ status: 'OPEN', agentId: null, acceptedAt: null })
    expect(await prisma.auditLog.count({ where: { action: 'agent.suspend' } })).toBe(1)
  })

  it('réactive un agent suspendu ; refuse de suspendre un agent qui n’est pas ACTIVE', async () => {
    const a = await makeAgent({ status: 'SUSPENDED' })
    await reactivateAgent(a.id, 'x')
    expect((await prisma.agent.findUniqueOrThrow({ where: { id: a.id } })).status).toBe('ACTIVE')
    const t = await makeAgent({ status: 'TRAINING' })
    await expect(suspendAgent(t.id, 'x', 'y')).rejects.toThrow('TRAINING → SUSPENDED')
  })

  it('statistiques : missions par statut, taux de validation, note moyenne, alertes ouvertes, solde', async () => {
    const agent = await makeAgent()
    const v1 = await makeMission({ agentId: agent.id, status: 'VALIDATED', proRating: 5 })
    await makeMission({ agentId: agent.id, status: 'VALIDATED', proRating: 3 })
    await makeMission({ agentId: agent.id, status: 'REJECTED' })
    await prisma.earning.create({ data: { agentId: agent.id, missionId: v1.id, tier: 'VISIT', baseAmountCents: 4000, levelBonusPct: 0, amountCents: 4000 } })
    await prisma.fraudFlag.create({ data: { missionId: v1.id, agentId: agent.id, type: 'LATE_SYNC', detail: 'x' } })
    expect(await agentStats(agent.id)).toEqual({
      byStatus: { VALIDATED: 2, REJECTED: 1 },
      level: 'BRONZE',
      validationRatePct: 67,
      avgProRating: 4,
      openFlags: 1,
      balanceCents: 4000,
    })
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/agents/agents.int.test.ts`
Expected: FAIL (module `./index` introuvable).

- [ ] **Step 3: Écrire `modules/agents/index.ts`**

```ts
import type { AgentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { balanceOf, levelFor } from '@/modules/ledger'
import { notifyProAgentChanged } from '@/modules/missions'
import { RELEASE_RESET, moveMission } from '@/modules/missions/transition'
import { getSettings } from '@/modules/settings'
import { canTransitionAgent, isAdult } from './agent-rule'

export { canTransitionAgent, isAdult }

/** Suspend un agent ACTIVE et remet ses missions acceptées en OPEN (spec §7.1). */
export async function suspendAgent(agentId: string, actor: string, reason: string): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  const released = await prisma.$transaction(async (tx) => {
    // Même verrou que acceptMission : une acceptation en cours se termine avant, ou voit l'agent suspendu.
    await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${agentId}))) AS l`
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    if (!canTransitionAgent(agent.status, 'SUSPENDED')) throw new Error(`Transition refusée : ${agent.status} → SUSPENDED`)
    await tx.agent.update({ where: { id: agentId }, data: { status: 'SUSPENDED' } })
    const held = await tx.mission.findMany({ where: { agentId, status: 'ACCEPTED' } })
    for (const m of held) await moveMission(tx, m.id, 'OPEN', actor, { data: { ...RELEASE_RESET, publishedAt: new Date() }, reason: 'Agent suspendu' })
    await logAudit(tx, { actor, action: 'agent.suspend', entity: 'Agent', entityId: agentId, reason })
    return { ids: held.map((m) => m.id), firstName: agent.firstName }
  })
  for (const id of released.ids) await notifyProAgentChanged(id, released.firstName)
}

export async function reactivateAgent(agentId: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: agentId } })
    if (!canTransitionAgent(agent.status, 'ACTIVE') || agent.status !== 'SUSPENDED') throw new Error(`Transition refusée : ${agent.status} → ACTIVE`)
    await tx.agent.update({ where: { id: agentId }, data: { status: 'ACTIVE' } })
    await logAudit(tx, { actor, action: 'agent.reactivate', entity: 'Agent', entityId: agentId })
  })
}

export async function listAgents(filter: { status?: AgentStatus } = {}) {
  return prisma.agent.findMany({ where: filter.status ? { status: filter.status } : {}, orderBy: { createdAt: 'desc' }, take: 300 })
}

export async function agentStats(agentId: string) {
  const grouped = await prisma.mission.groupBy({ by: ['status'], where: { agentId }, _count: { _all: true } })
  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Partial<Record<string, number>>
  const decided = (byStatus.VALIDATED ?? 0) + (byStatus.REJECTED ?? 0)
  const rating = await prisma.mission.aggregate({ where: { agentId, proRating: { not: null } }, _avg: { proRating: true } })
  const settings = await getSettings()
  return {
    byStatus,
    level: levelFor(byStatus.VALIDATED ?? 0, settings.levels).name,
    validationRatePct: decided ? Math.round(((byStatus.VALIDATED ?? 0) * 100) / decided) : null,
    avgProRating: rating._avg.proRating != null ? Math.round(rating._avg.proRating * 10) / 10 : null,
    openFlags: await prisma.fraudFlag.count({ where: { agentId, resolved: false } }),
    balanceCents: await balanceOf(agentId),
  }
}

export async function getAgent(agentId: string) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      missions: { orderBy: { slotAt: 'desc' }, take: 50, include: { pro: { select: { businessName: true, city: true, state: true } } } },
      flags: { where: { resolved: false }, orderBy: { createdAt: 'desc' } },
      attempts: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/agents/agents.int.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Lancer toute la suite et commit**

Run: `npm test && npx tsc --noEmit`
Expected: tout au vert, aucune erreur de typage.

```bash
git add modules/agents/index.ts modules/agents/agents.int.test.ts
git commit -m "feat(agents): suspend, reactivate and agent stats"
```


## Chunk 10: Services — validation, SMS entrants, tâches planifiées

### Task 35: SMS entrants (`modules/review/inbound.ts`)

Le traitement des réponses SMS vit dans le module `review` (la réponse du pro sert à valider la visite) plutôt que dans `sms` comme l'esquissait la spec §9.2 : `sms` reste un simple canal d'envoi.

**Files:**
- Modify: `prisma/schema.prisma` (modèle `InboundSms` : `messageSid`)
- Create: `modules/review/inbound.ts`
- Test: `modules/review/inbound.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { handleInboundSms, listInbound, markInboundHandled } from './inbound'

const now = new Date('2026-10-16T20:00:00Z')

async function visited(postVisitSmsAt = new Date('2026-10-16T15:00:00Z')) {
  const agent = await makeAgent()
  const pro = await makePro({ phone: '+16175550142' })
  const mission = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED', postVisitSmsAt })
  return { agent, pro, mission }
}

describe('SMS entrants', () => {
  beforeEach(resetDb)

  it('une note 1–5 du pro est rattachée à sa dernière visite', async () => {
    const { mission } = await visited()
    expect(await handleInboundSms('(617) 555-0142', '5', now)).toEqual({ matched: true, missionId: mission.id })
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).proRating).toBe(5)
    expect(await prisma.inboundSms.findFirstOrThrow()).toMatchObject({ handled: true, missionId: mission.id })
  })

  it('NO marque la visite comme contestée et lève l’alerte PRO_DENIED', async () => {
    const { mission } = await visited()
    await handleInboundSms('+16175550142', 'No', now)
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).proDenied).toBe(true)
    expect((await prisma.fraudFlag.findMany()).map((f) => f.type)).toEqual(['PRO_DENIED'])
  })

  it('tout autre message arrive dans « SMS reçus », relié à la dernière mission du pro', async () => {
    const { mission } = await visited()
    expect(await handleInboundSms('+16175550142', 'Can we move to Friday?', now)).toEqual({ matched: false, missionId: null })
    const [row] = await listInbound({ handled: false })
    expect(row).toMatchObject({ body: 'Can we move to Friday?', missionId: mission.id, handled: false })
    await markInboundHandled(row.id, 'x')
    expect(await listInbound({ handled: false })).toEqual([])
  })

  it('un renvoi Twilio du même message (même MessageSid) n’est traité qu’une fois', async () => {
    await visited()
    await handleInboundSms('+16175550142', 'Thanks!', now, 'SM123')
    expect(await handleInboundSms('+16175550142', 'Thanks!', now, 'SM123')).toEqual({ matched: false, missionId: null, duplicate: true })
    expect(await prisma.inboundSms.count()).toBe(1)
  })

  it('une seconde note, ou une note après 7 jours, n’est pas rattachée', async () => {
    const { mission } = await visited()
    await handleInboundSms('+16175550142', '4', now)
    expect((await handleInboundSms('+16175550142', '1', now)).matched).toBe(false)
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).proRating).toBe(4)
    await resetDb()
    await visited(new Date('2026-10-08T15:00:00Z'))
    expect((await handleInboundSms('+16175550142', '5', now)).matched).toBe(false)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/review/inbound.int.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Dédoublonner les renvois de Twilio**

Twilio peut renvoyer le même message (délai de réponse) : on garde son identifiant. Dans `prisma/schema.prisma`, modèle `InboundSms`, ajouter :

```prisma
  messageSid String?  @unique // identifiant Twilio (MessageSid) : un renvoi n'est traité qu'une fois
```

Run: `npx prisma migrate dev --name inbound_message_sid && npx prisma generate`
Expected: migration créée et appliquée.

- [ ] **Step 3 bis: Écrire `modules/review/inbound.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { normalizeUsPhone, parseInbound } from '@/modules/sms'
import { refreshFraudFlags } from './flags'

export const REPLY_WINDOW_DAYS = 7

/**
 * Réponse d'un pro au SMS après visite (spec §4.6, §9.2). Une note 1–5 ou « NO » est rattachée à sa
 * dernière visite sans réponse (7 jours au plus) ; tout le reste va dans « SMS reçus ».
 */
export async function handleInboundSms(
  fromRaw: string,
  body: string,
  now: Date = new Date(),
  messageSid: string | null = null,
): Promise<{ matched: boolean; missionId: string | null; duplicate?: true }> {
  if (messageSid && (await prisma.inboundSms.findUnique({ where: { messageSid } }))) return { matched: false, missionId: null, duplicate: true }
  const from = normalizeUsPhone(fromRaw) ?? fromRaw
  const reply = parseInbound(body)
  const since = new Date(now.getTime() - REPLY_WINDOW_DAYS * 86_400_000)
  const awaiting =
    reply.kind === 'OTHER'
      ? null
      : await prisma.mission.findFirst({
          where: { pro: { phone: from }, postVisitSmsAt: { gte: since }, proRating: null, proDenied: false },
          orderBy: { postVisitSmsAt: 'desc' },
        })

  if (awaiting) {
    const data = reply.kind === 'RATING' ? { proRating: reply.value } : { proDenied: true }
    // Mise à jour conditionnelle : deux réponses rapprochées ne s'écrasent pas.
    const done = await prisma.$transaction(async (tx) => {
      const res = await tx.mission.updateMany({ where: { id: awaiting.id, proRating: null, proDenied: false }, data })
      if (res.count !== 1) return false
      await tx.inboundSms.create({ data: { fromPhone: from, body, missionId: awaiting.id, handled: true, messageSid } })
      await logAudit(tx, { actor: 'system', action: 'mission.pro_reply', entity: 'Mission', entityId: awaiting.id, data: { reply: body.trim().slice(0, 20) } })
      // Dans la transaction : une réponse « NO » ou une note basse a toujours son alerte avant toute validation.
      await refreshFraudFlags(awaiting.id, tx)
      return true
    })
    if (done) return { matched: true, missionId: awaiting.id }
  }

  const latest = await prisma.mission.findFirst({ where: { pro: { phone: from } }, orderBy: { createdAt: 'desc' }, select: { id: true } })
  await prisma.inboundSms.create({ data: { fromPhone: from, body, missionId: latest?.id ?? null, handled: false, messageSid } })
  return { matched: false, missionId: null }
}

export async function listInbound(filter: { handled?: boolean } = {}) {
  return prisma.inboundSms.findMany({
    where: filter.handled === undefined ? {} : { handled: filter.handled },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

export async function markInboundHandled(id: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.inboundSms.update({ where: { id }, data: { handled: true } })
    await logAudit(tx, { actor, action: 'sms.handled', entity: 'InboundSms', entityId: id })
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/review/inbound.int.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add prisma modules/review/inbound.ts modules/review/inbound.int.test.ts
git commit -m "feat(review): pro SMS replies (rating, NO) with Twilio de-duplication"
```

### Task 36: File de validation (`modules/review/index.ts`)

**Files:**
- Create: `modules/review/index.ts`
- Test: `modules/review/review.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { getReviewDetail, listQueue, reject, requestFix, validate } from './index'

const now = new Date('2026-10-16T18:00:00Z')

async function submitted(data: Record<string, unknown> = {}) {
  const agent = await makeAgent()
  const pro = await makePro({ status: 'MISSION_OPEN' })
  const mission = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED', submittedAt: now, ...data })
  return { agent, pro, mission }
}

describe('validation', () => {
  beforeEach(resetDb)

  it('file : la plus ancienne soumission en premier', async () => {
    const a = await submitted({ submittedAt: new Date('2026-10-16T10:00:00Z') })
    const b = await submitted({ submittedAt: new Date('2026-10-16T09:00:00Z') })
    expect((await listQueue()).map((m) => m.id)).toEqual([b.mission.id, a.mission.id])
  })

  it('valider : VALIDATED, pro VISITED, gains VISIT + URGENCY, SMS à l’agent', async () => {
    const { agent, pro, mission } = await submitted({ urgencyBonusCents: 1000 })
    expect(await validate(mission.id, 'marvin@allo-chantiers.fr', {}, now)).toEqual({ ok: true, earnedCents: 5000 })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'VALIDATED', validatedAt: now })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('VISITED')
    expect((await prisma.earning.findMany({ where: { agentId: agent.id } })).map((e) => e.tier).sort()).toEqual(['URGENCY', 'VISIT'])
    expect(memorySmsDriver.sent.at(-1)).toEqual({ to: agent.phone, body: expect.stringContaining('$50.00 was added') })
  })

  it('une mission de retour rapporte le palier RETURN_VISIT et ne touche pas au pro', async () => {
    const { pro, mission } = await submitted({ type: 'RETURN_VISIT' })
    await prisma.pro.update({ where: { id: pro.id }, data: { status: 'VISITED' } })
    expect(await validate(mission.id, 'x', {}, now)).toEqual({ ok: true, earnedCents: 2000 })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('VISITED')
  })

  it('exige une confirmation si le pro a répondu NO ou mis une note basse', async () => {
    const { mission, agent } = await submitted({ proDenied: true })
    await prisma.fraudFlag.create({ data: { missionId: mission.id, agentId: agent.id, type: 'PRO_DENIED', detail: 'x' } })
    expect(await validate(mission.id, 'x', {}, now)).toEqual({ ok: false, needsConfirmation: true, error: 'Le pro a signalé un problème : confirmez pour valider quand même.' })
    expect((await validate(mission.id, 'x', { confirmFlags: true }, now)).ok).toBe(true)
  })

  it('exige aussi la confirmation sur la réponse brute du pro, même sans alerte enregistrée', async () => {
    const { mission } = await submitted({ proRating: 2 })
    expect(await validate(mission.id, 'x', {}, now)).toMatchObject({ ok: false, needsConfirmation: true })
  })

  it('demander une correction : NEEDS_FIX, message enregistré et envoyé', async () => {
    const { mission, agent } = await submitted()
    await requestFix(mission.id, 'x', 'Add a photo of the truck.', now)
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'NEEDS_FIX', needsFixAt: now, fixMessage: 'Add a photo of the truck.' })
    expect(memorySmsDriver.sent.at(-1)).toEqual({ to: agent.phone, body: expect.stringContaining('Add a photo of the truck.') })
  })

  it('rejeter : REJECTED, pro de nouveau AGREED (ou LOST), motif obligatoire', async () => {
    const { mission, pro } = await submitted()
    await expect(reject(mission.id, 'x', ' ')).rejects.toThrow('Motif obligatoire')
    await reject(mission.id, 'x', 'Check-in 2 km away from the business.')
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: mission.id } })).toMatchObject({ status: 'REJECTED', rejectReason: 'Check-in 2 km away from the business.' })
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('AGREED')
  })

  it('le détail donne la distance du check-in à l’adresse du pro', async () => {
    const { mission } = await submitted()
    await prisma.submission.create({ data: { missionId: mission.id, steps: { checkin: { lat: 42.36, lng: -71.0621, accuracy: 10, clientAt: now.toISOString(), receivedAt: now.toISOString() } } } })
    const d = await getReviewDetail(mission.id)
    expect(d?.checkinDistanceMeters).toBeGreaterThan(380)
    expect(d?.checkinDistanceMeters).toBeLessThan(420)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/review/review.int.test.ts`
Expected: FAIL (module `./index` introuvable).

- [ ] **Step 3: Écrire `modules/review/index.ts`**

```ts
import type { FraudType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/modules/audit'
import { distanceMeters } from '@/modules/geo'
import { award } from '@/modules/ledger'
import type { StepsData } from '@/modules/missions/checklist-rule'
import { moveMission } from '@/modules/missions/transition'
import { sendSms, smsTemplates } from '@/modules/sms'
import { LOW_RATING_MAX } from './fraud-rule'

export { refreshFraudFlags } from './flags'
export { LOW_RATING_MAX, computeFraudFlags, normalizeAddress } from './fraud-rule'
export { handleInboundSms, listInbound, markInboundHandled } from './inbound'

// Réponses du pro qui imposent une confirmation explicite avant de valider (spec §10).
const NEEDS_CONFIRMATION: FraudType[] = ['PRO_DENIED', 'LOW_PRO_RATING']

const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`

async function notify(phone: string, body: string) {
  try {
    await sendSms(phone, body)
  } catch (e) {
    console.error('[review] SMS à l’agent échoué', e)
  }
}

export async function listQueue() {
  return prisma.mission.findMany({
    where: { status: 'SUBMITTED' },
    orderBy: { submittedAt: 'asc' },
    include: {
      pro: { select: { businessName: true, city: true, state: true, trade: true } },
      agent: { select: { id: true, firstName: true, lastName: true } },
      flags: { where: { resolved: false } },
      submission: { select: { _count: { select: { photos: true } } } },
    },
  })
}

export async function getReviewDetail(missionId: string) {
  const m = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      pro: true,
      agent: true,
      flags: { orderBy: { createdAt: 'desc' } },
      submission: { include: { photos: { orderBy: { receivedAt: 'asc' } } } },
    },
  })
  if (!m) return null
  const steps = (m.submission?.steps ?? {}) as StepsData
  const checkinDistanceMeters =
    steps.checkin && m.pro.lat != null && m.pro.lng != null
      ? Math.round(distanceMeters(steps.checkin, { lat: m.pro.lat, lng: m.pro.lng }))
      : null
  return { ...m, steps, checkinDistanceMeters }
}

export type ValidateResult = { ok: true; earnedCents: number } | { ok: false; error: string; needsConfirmation?: true }

/** Valide une visite soumise : statut, pro, gains (VISIT ou RETURN_VISIT, + URGENCY), puis SMS à l'agent. */
export async function validate(missionId: string, actor: string, opts: { confirmFlags?: boolean } = {}, now: Date = new Date()): Promise<ValidateResult> {
  const res = await prisma.$transaction(async (tx) => {
    // Double contrôle : les alertes ET la réponse brute du pro (au cas où une alerte manquerait).
    const pre = await tx.mission.findUniqueOrThrow({ where: { id: missionId }, select: { proDenied: true, proRating: true } })
    const flagged = await tx.fraudFlag.count({ where: { missionId, resolved: false, type: { in: NEEDS_CONFIRMATION } } })
    const blocking = flagged > 0 || pre.proDenied || (pre.proRating != null && pre.proRating <= LOW_RATING_MAX)
    if (blocking && !opts.confirmFlags) {
      return { ok: false as const, needsConfirmation: true as const, error: 'Le pro a signalé un problème : confirmez pour valider quand même.' }
    }
    const m = await moveMission(tx, missionId, 'VALIDATED', actor, { data: { validatedAt: now }, expectFrom: 'SUBMITTED' })
    const tiers = [m.type === 'RETURN_VISIT' ? 'RETURN_VISIT' : 'VISIT', ...(m.urgencyBonusCents > 0 ? ['URGENCY'] : [])] as const
    let earnedCents = 0
    for (const tier of tiers) {
      const r = await award(missionId, tier as 'VISIT' | 'RETURN_VISIT' | 'URGENCY', tx, now)
      if (!r.ok) throw new Error(`Gain ${tier} impossible : ${r.reason}`)
      earnedCents += r.earning.amountCents
    }
    const agent = await tx.agent.findUniqueOrThrow({ where: { id: m.agentId! } })
    return { ok: true as const, earnedCents, phone: agent.phone }
  })
  if (!res.ok) return res
  await notify(res.phone, smsTemplates.agentValidated({ amount: dollars(res.earnedCents) }))
  return { ok: true, earnedCents: res.earnedCents }
}

export async function requestFix(missionId: string, actor: string, message: string, now: Date = new Date()): Promise<void> {
  if (!message.trim()) throw new Error('Message obligatoire')
  const m = await prisma.$transaction((tx) => moveMission(tx, missionId, 'NEEDS_FIX', actor, { data: { needsFixAt: now, fixMessage: message.trim() }, reason: message }))
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: m.agentId! } })
  await notify(agent.phone, smsTemplates.agentNeedsFix({ message: message.trim() }))
}

export async function reject(missionId: string, actor: string, reason: string, markProLost = false): Promise<void> {
  if (!reason.trim()) throw new Error('Motif obligatoire')
  const m = await prisma.$transaction((tx) => moveMission(tx, missionId, 'REJECTED', actor, { data: { rejectReason: reason.trim() }, reason, markProLost }))
  if (m.agentId) {
    const agent = await prisma.agent.findUniqueOrThrow({ where: { id: m.agentId } })
    await notify(agent.phone, smsTemplates.agentRejected({ reason: reason.trim() }))
  }
}

export async function resolveFlag(flagId: string, actor: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const f = await tx.fraudFlag.update({ where: { id: flagId }, data: { resolved: true } })
    await logAudit(tx, { actor, action: 'flag.resolve', entity: 'Mission', entityId: f.missionId, data: { flag: f.type } })
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/review`
Expected: PASS (fraud-rule 10, flags 3, inbound 5, review 8).

- [ ] **Step 5: Commit**

```bash
git add modules/review/index.ts modules/review/review.int.test.ts
git commit -m "feat(review): validation queue, fix requests and rejections"
```

### Task 37: Tâches planifiées (`modules/missions/sweeps.ts`)

**Files:**
- Create: `modules/missions/sweeps.ts`
- Modify: `modules/missions/index.ts` (exporter les tâches)
- Test: `modules/missions/sweeps.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { memorySmsDriver } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { runNeedsFixSweep, runNoShowSweep, runReminderSweep } from './sweeps'
import { TOO_LATE, saveStep } from './visit'

const H = 3_600_000
const now = new Date('2026-10-16T18:00:00Z')
const at = (h: number) => new Date(now.getTime() + h * H)

describe('tâches planifiées', () => {
  beforeEach(resetDb)

  it('absence : SMS à l’agent à +2 h, une seule fois', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: at(-3) })
    expect(await runNoShowSweep(now)).toEqual({ sms: 1, released: 0 })
    expect(await runNoShowSweep(now)).toEqual({ sms: 0, released: 0 })
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).noShowSmsAt).toEqual(now)
    expect(memorySmsDriver.sent.map((s) => s.to)).toEqual([agent.phone])
  })

  it('absence : à +24 h, la mission repasse OPEN et l’agent reçoit une alerte NO_SHOW', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: at(-25), noShowSmsAt: at(-23) })
    expect(await runNoShowSweep(now)).toEqual({ sms: 0, released: 1 })
    expect(await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).toMatchObject({ status: 'OPEN', agentId: null })
    expect(await prisma.fraudFlag.findFirstOrThrow()).toMatchObject({ agentId: agent.id, type: 'NO_SHOW' })
    // Check-in synchronisé après coup : refusé avec un message clair (spec §4.5, §12).
    const late = await saveStep(agent, m.id, 'checkin', { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt: at(-24.5).toISOString() }, now)
    expect(late).toEqual({ ok: false, status: 409, error: TOO_LATE })
  })

  it('absence : rien si le check-in est arrivé', async () => {
    const agent = await makeAgent()
    const m = await makeMission({ agentId: agent.id, status: 'ACCEPTED', slotAt: at(-30) })
    await prisma.submission.create({ data: { missionId: m.id, steps: { checkin: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt: at(-30).toISOString(), receivedAt: at(-30).toISOString() } } } })
    expect(await runNoShowSweep(now)).toEqual({ sms: 0, released: 0 })
  })

  it('correction non faite sous 7 jours → REJECTED, pro de nouveau AGREED', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ status: 'MISSION_OPEN' })
    const m = await makeMission({ proId: pro.id, agentId: agent.id, status: 'NEEDS_FIX', needsFixAt: at(-7 * 24) })
    await makeMission({ agentId: agent.id, status: 'NEEDS_FIX', needsFixAt: at(-24) }) // trop récent
    expect(await runNeedsFixSweep(now)).toBe(1)
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).status).toBe('REJECTED')
    expect((await prisma.pro.findUniqueOrThrow({ where: { id: pro.id } })).status).toBe('AGREED')
  })

  it('rappel la veille au pro et à l’agent, une seule fois', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ phone: '+16175550142' })
    await makeMission({ proId: pro.id, agentId: agent.id, status: 'ACCEPTED', slotAt: at(20), acceptedAt: at(-72) })
    expect(await runReminderSweep(now)).toBe(1)
    expect(await runReminderSweep(now)).toBe(0)
    expect(memorySmsDriver.sent.map((s) => s.to).sort()).toEqual([agent.phone, '+16175550142'].sort())
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/missions/sweeps.int.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/missions/sweeps.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { formatSlot } from '@/lib/time'
import { sendSms, smsTemplates } from '@/modules/sms'
import type { StepsData } from './checklist-rule'
import { NEEDS_FIX_DAYS, NO_SHOW_SMS_HOURS, needsFixExpired, noShowAction, reminderDue } from './mission-rule'
import { RELEASE_RESET, moveMission } from './transition'

const H = 3_600_000

async function trySms(to: string, body: string) {
  try {
    await sendSms(to, body)
  } catch (e) {
    console.error('[sweeps] SMS échoué', e)
  }
}

/** Absences (spec §4.5) : SMS à l'agent à +2 h, remise en OPEN et alerte NO_SHOW à +24 h. */
export async function runNoShowSweep(now: Date = new Date()): Promise<{ sms: number; released: number }> {
  const late = await prisma.mission.findMany({
    where: { status: 'ACCEPTED', slotAt: { lte: new Date(now.getTime() - NO_SHOW_SMS_HOURS * H) } },
    include: { agent: true, pro: true, submission: true },
  })
  let sms = 0
  let released = 0
  for (const m of late) {
    if (!m.agent) continue
    const hasCheckin = !!((m.submission?.steps ?? {}) as StepsData).checkin
    const action = noShowAction({ slotAt: m.slotAt, hasCheckin, noShowSmsAt: m.noShowSmsAt }, now)
    if (action === 'SMS') {
      const claimed = await prisma.mission.updateMany({ where: { id: m.id, noShowSmsAt: null }, data: { noShowSmsAt: now } })
      if (claimed.count === 1) {
        await trySms(m.agent.phone, smsTemplates.agentNoShowCheck({ businessName: m.pro.businessName }))
        sms++
      }
    } else if (action === 'RELEASE') {
      const agent = m.agent
      // Une mission en erreur (déjà reprise, changée entre-temps) ne bloque pas les suivantes.
      const done = await prisma.$transaction(async (tx) => {
        // Même verrou que l'enregistrement d'une étape : un check-in qui arrive en même temps gagne.
        await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${m.id}))) AS l`
        const fresh = await tx.submission.findUnique({ where: { missionId: m.id } })
        if (((fresh?.steps ?? {}) as StepsData).checkin) return false
        await moveMission(tx, m.id, 'OPEN', 'system', { data: RELEASE_RESET, reason: 'Aucun check-in 24 h après le créneau', expectFrom: 'ACCEPTED', expectAgentId: agent.id })
        await tx.fraudFlag.upsert({
          where: { missionId_agentId_type: { missionId: m.id, agentId: agent.id, type: 'NO_SHOW' } },
          create: { missionId: m.id, agentId: agent.id, type: 'NO_SHOW', detail: 'Aucun check-in 24 h après le créneau' },
          update: { resolved: false },
        })
        return true
      }).catch((e) => {
        console.error(`[sweeps] absence : mission ${m.id} ignorée`, e)
        return false
      })
      if (done) {
        await trySms(agent.phone, smsTemplates.agentMissionReleased({ businessName: m.pro.businessName }))
        released++
      }
    }
  }
  return { sms, released }
}

/** Corrections non faites sous 7 jours → REJECTED (spec §7.2). */
export async function runNeedsFixSweep(now: Date = new Date()): Promise<number> {
  const stale = await prisma.mission.findMany({
    where: { status: 'NEEDS_FIX', needsFixAt: { lte: new Date(now.getTime() - NEEDS_FIX_DAYS * 24 * H) } },
    include: { agent: true },
  })
  let n = 0
  for (const m of stale) {
    if (!m.needsFixAt || !needsFixExpired(m.needsFixAt, now)) continue
    const reason = `Fix not completed within ${NEEDS_FIX_DAYS} days.`
    try {
      // expectFrom : une correction resoumise entre la lecture et le verrou n'est pas rejetée.
      await prisma.$transaction((tx) => moveMission(tx, m.id, 'REJECTED', 'system', { data: { rejectReason: reason }, reason, expectFrom: 'NEEDS_FIX' }))
    } catch (e) {
      console.error(`[sweeps] correction expirée : mission ${m.id} ignorée`, e)
      continue
    }
    if (m.agent) await trySms(m.agent.phone, smsTemplates.agentRejected({ reason }))
    n++
  }
  return n
}

/** Rappels la veille, au pro et à l'agent. */
export async function runReminderSweep(now: Date = new Date()): Promise<number> {
  const soon = await prisma.mission.findMany({
    where: { status: 'ACCEPTED', reminderSentAt: null, slotAt: { gt: now, lte: new Date(now.getTime() + 24 * H) } },
    include: { agent: true, pro: true },
  })
  let n = 0
  for (const m of soon) {
    if (!m.agent || !reminderDue(m, now)) continue
    const claimed = await prisma.mission.updateMany({ where: { id: m.id, reminderSentAt: null }, data: { reminderSentAt: now } })
    if (claimed.count !== 1) continue
    const slot = formatSlot(m.slotAt, m.pro.timeZone)
    await trySms(m.pro.phone, smsTemplates.proReminder({ agentFirstName: m.agent.firstName, slot }))
    await trySms(m.agent.phone, smsTemplates.agentReminder({ businessName: m.pro.businessName, slot }))
    n++
  }
  return n
}
```

- [ ] **Step 4: Exporter les tâches depuis `modules/missions/index.ts`**

Ajouter à la fin de `modules/missions/index.ts` :

```ts
export { runNeedsFixSweep, runNoShowSweep, runReminderSweep } from './sweeps'
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run modules/missions/sweeps.int.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add modules/missions/sweeps.ts modules/missions/sweeps.int.test.ts modules/missions/index.ts
git commit -m "feat(missions): no-show, needs-fix and reminder sweeps"
```


## Chunk 11: Routes API (visite, fichiers, SMS entrants, tâches planifiées)

Les routes sont fines : elles authentifient, lisent la requête, appellent un service et traduisent son résultat en HTTP. Leurs tests simulent `@/lib/session` (aucun cookie Auth.js nécessaire).

### Task 38: Routes de la checklist (`app/api/agent/missions/[id]/…`)

**Files:**
- Create: `app/api/agent/missions/[id]/steps/route.ts`, `app/api/agent/missions/[id]/photos/route.ts`, `app/api/agent/missions/[id]/photos/[photoId]/route.ts`, `app/api/agent/missions/[id]/submit/route.ts`, `lib/http.ts`
- Test: `tests/api/visit-routes.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Agent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { POST as postSteps } from '@/app/api/agent/missions/[id]/steps/route'
import { POST as postPhoto } from '@/app/api/agent/missions/[id]/photos/route'
import { POST as postSubmit } from '@/app/api/agent/missions/[id]/submit/route'
import { DELETE as deletePhotoRoute } from '@/app/api/agent/missions/[id]/photos/[photoId]/route'

const session = vi.hoisted(() => ({ agent: null as Agent | null }))
vi.mock('@/lib/session', () => ({ currentAgent: async () => session.agent, currentAdmin: async () => null }))

const ctx = (id: string) => ({ params: Promise.resolve({ id }) })
const json = (body: unknown) => new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })
const clientAt = new Date().toISOString()

describe('routes de visite', () => {
  beforeEach(async () => {
    await resetDb()
    session.agent = null
  })

  it('401 sans agent connecté', async () => {
    const res = await postSteps(json({ step: 'checkin', data: {} }), ctx('m1'))
    expect(res.status).toBe(401)
  })

  it('enregistre une étape et renvoie l’état de la visite', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    const res = await postSteps(json({ step: 'checkin', data: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt } }), ctx(m.id))
    expect(res.status).toBe(200)
    expect((await res.json()).state.steps.checkin.lat).toBe(42.3564)
  })

  it('400 sur un JSON illisible, statut du service sinon', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    const bad = new Request('http://localhost/api', { method: 'POST', body: '{', headers: { 'content-type': 'application/json' } })
    expect((await postSteps(bad, ctx(m.id))).status).toBe(400)
    const early = await postSteps(json({ step: 'invite', data: { result: 'INVITE_SENT', clientAt } }), ctx(m.id))
    expect(early.status).toBe(409)
    expect(await early.json()).toEqual({ error: 'Check in first.' })
  })

  it('reçoit une photo en multipart', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    await postSteps(json({ step: 'checkin', data: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt } }), ctx(m.id))
    const form = new FormData()
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], 'p.jpg', { type: 'image/jpeg' }))
    form.set('category', 'LOGO')
    form.set('clientAt', clientAt)
    form.set('exifLat', '42.3564')
    form.set('exifLng', '-71.0621')
    const res = await postPhoto(new Request('http://localhost/api', { method: 'POST', body: form }), ctx(m.id))
    expect(res.status).toBe(200)
    expect(await prisma.photo.count()).toBe(1)
  })

  it('400 sur un corps JSON null ; suppression d’une photo', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    expect((await postSteps(json(null), ctx(m.id))).status).toBe(400)
    await postSteps(json({ step: 'checkin', data: { lat: 42.3564, lng: -71.0621, accuracy: 10, clientAt } }), ctx(m.id))
    const form = new FormData()
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'p.jpg', { type: 'image/jpeg' }))
    form.set('category', 'TEAM')
    form.set('clientAt', clientAt)
    await postPhoto(new Request('http://localhost/api', { method: 'POST', body: form }), ctx(m.id))
    const photo = await prisma.photo.findFirstOrThrow()
    const res = await deletePhotoRoute(new Request('http://localhost/api', { method: 'DELETE' }), { params: Promise.resolve({ id: m.id, photoId: photo.id }) })
    expect(res.status).toBe(200)
    expect(await prisma.photo.count()).toBe(0)
  })

  it('la soumission incomplète renvoie 409 avec les étapes manquantes', async () => {
    session.agent = await makeAgent()
    const m = await makeMission({ agentId: session.agent.id, status: 'ACCEPTED' })
    const res = await postSubmit(new Request('http://localhost/api', { method: 'POST' }), ctx(m.id))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toContain('checkin')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run tests/api/visit-routes.int.test.ts`
Expected: FAIL (routes introuvables).

- [ ] **Step 3: Écrire `lib/http.ts`**

```ts
import { NextResponse } from 'next/server'

export const jsonError = (status: number, error: string) => NextResponse.json({ error }, { status })

/** Traduit le résultat d'un service de visite en réponse HTTP. */
export function visitResponse(r: { ok: true; state: unknown } | { ok: false; status: number; error: string }) {
  return r.ok ? NextResponse.json({ state: r.state }) : jsonError(r.status, r.error)
}

export type IdContext = { params: Promise<{ id: string }> }
```

- [ ] **Step 4: Écrire les quatre routes**

`app/api/agent/missions/[id]/steps/route.ts` :

```ts
import { jsonError, visitResponse, type IdContext } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { saveStep } from '@/modules/missions'

export async function POST(req: Request, { params }: IdContext) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON')
  }
  if (!body || typeof body !== 'object' || typeof (body as { step?: unknown }).step !== 'string') return jsonError(400, 'Missing step')
  const { step, data } = body as { step: string; data?: unknown }
  const { id } = await params
  return visitResponse(await saveStep(agent, id, step, data))
}
```

`app/api/agent/missions/[id]/photos/route.ts` :

```ts
import { jsonError, visitResponse, type IdContext } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { addPhoto } from '@/modules/missions'

const num = (v: FormDataEntryValue | null) => (typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

export async function POST(req: Request, { params }: IdContext) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return jsonError(400, 'Invalid form data')
  }
  const file = form.get('file')
  if (!(file instanceof File)) return jsonError(400, 'Missing file')
  const { id } = await params
  return visitResponse(
    await addPhoto(agent, id, {
      bytes: Buffer.from(await file.arrayBuffer()),
      category: String(form.get('category') ?? ''),
      clientAt: String(form.get('clientAt') ?? ''),
      exifTakenAt: typeof form.get('exifTakenAt') === 'string' ? String(form.get('exifTakenAt')) || null : null,
      exifLat: num(form.get('exifLat')),
      exifLng: num(form.get('exifLng')),
    }),
  )
}
```

`app/api/agent/missions/[id]/photos/[photoId]/route.ts` :

```ts
import { jsonError, visitResponse } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { deletePhoto } from '@/modules/missions'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  const { id, photoId } = await params
  return visitResponse(await deletePhoto(agent, id, photoId))
}
```

`app/api/agent/missions/[id]/submit/route.ts` :

```ts
import { jsonError, visitResponse, type IdContext } from '@/lib/http'
import { currentAgent } from '@/lib/session'
import { submitVisit } from '@/modules/missions'

export async function POST(_req: Request, { params }: IdContext) {
  const agent = await currentAgent()
  if (!agent) return jsonError(401, 'Unauthorized')
  const { id } = await params
  return visitResponse(await submitVisit(agent, id))
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run tests/api/visit-routes.int.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/http.ts app/api/agent tests/api/visit-routes.int.test.ts
git commit -m "feat(api): visit checklist routes (steps, photos, submit)"
```

### Task 39: Fichiers protégés (`app/api/files/[...key]/route.ts`)

**Files:**
- Create: `app/api/files/[...key]/route.ts`
- Test: `tests/api/files-route.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUser, Agent } from '@prisma/client'
import { getStorage } from '@/modules/storage'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission } from '@/tests/helpers/factories'
import { GET } from '@/app/api/files/[...key]/route'

const session = vi.hoisted(() => ({ agent: null as Agent | null, admin: null as AdminUser | null }))
vi.mock('@/lib/session', () => ({
  currentAgent: async () => session.agent,
  currentAdmin: async (roles: string[] = ['ADMIN', 'SETTER']) => (session.admin && roles.includes(session.admin.role) ? session.admin : null),
}))

const get = (key: string) => GET(new Request(`http://localhost/api/files/${key}`), { params: Promise.resolve({ key: key.split('/') }) })

describe('fichiers protégés', () => {
  beforeEach(async () => {
    await resetDb()
    session.agent = null
    session.admin = null
  })

  it('l’agent de la mission et l’équipe y accèdent ; personne d’autre', async () => {
    const owner = await makeAgent()
    const m = await makeMission({ agentId: owner.id, status: 'SUBMITTED' })
    const key = `missions/${m.id}/photos/abc123.jpg`
    await getStorage().put(key, Buffer.from([0xff, 0xd8, 0xff]))

    expect((await get(key)).status).toBe(404) // anonyme
    session.agent = await makeAgent()
    expect((await get(key)).status).toBe(404) // autre agent
    session.agent = owner
    const ok = await get(key)
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-type')).toBe('image/jpeg')
    expect(ok.headers.get('cache-control')).toBe('private, max-age=3600')
    session.agent = null
    session.admin = { email: 'marvin@allo-chantiers.fr', role: 'ADMIN', createdAt: new Date() }
    expect((await get(key)).status).toBe(200)
    session.admin = { email: 'setter@allo-chantiers.fr', role: 'SETTER', createdAt: new Date() }
    expect((await get(key)).status).toBe(404)
  })

  it('refuse une clé hors du dossier des missions ou mal formée', async () => {
    session.admin = { email: 'marvin@allo-chantiers.fr', role: 'ADMIN', createdAt: new Date() }
    expect((await get('other/x.jpg')).status).toBe(404)
    expect((await get('missions/../secrets.png')).status).toBe(404)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run tests/api/files-route.int.test.ts`
Expected: FAIL (route introuvable).

- [ ] **Step 3: Écrire `app/api/files/[...key]/route.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { currentAdmin, currentAgent } from '@/lib/session'
import { assertSafeKey, getStorage } from '@/modules/storage'

const notFound = () => new Response('Not found', { status: 404 })

// Photos et signatures : l'équipe voit tout, un agent ne voit que les fichiers de SES missions.
// 404 (et non 403) dans tous les cas de refus : on ne confirme pas l'existence d'un fichier.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params
  const key = parts.join('/')
  try {
    assertSafeKey(key)
  } catch {
    return notFound()
  }
  const [root, missionId] = parts
  if (root !== 'missions' || !missionId) return notFound()

  // Côté équipe, seuls les ADMIN voient les photos et signatures (les SETTER gèrent pros et missions, spec §5).
  if (!(await currentAdmin(['ADMIN']))) {
    const agent = await currentAgent()
    const mission = agent ? await prisma.mission.findUnique({ where: { id: missionId }, select: { agentId: true } }) : null
    if (!agent || mission?.agentId !== agent.id) return notFound()
  }

  const file = await getStorage().get(key)
  if (!file) return notFound()
  return new Response(new Uint8Array(file.body), {
    headers: {
      'content-type': file.contentType,
      'cache-control': 'private, max-age=3600',
      'x-content-type-options': 'nosniff',
    },
  })
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run tests/api/files-route.int.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/files tests/api/files-route.int.test.ts
git commit -m "feat(api): access-controlled file route for photos and signatures"
```

### Task 40: Webhook Twilio et tâches planifiées

**Files:**
- Create: `app/api/sms/inbound/route.ts`, `app/api/cron/[job]/route.ts`
- Test: `tests/api/sms-cron-routes.int.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { computeTwilioSignature } from '@/modules/sms'
import { resetDb } from '@/tests/helpers/db'
import { makeAgent, makeMission, makePro } from '@/tests/helpers/factories'
import { POST as inbound } from '@/app/api/sms/inbound/route'
import { POST as cron } from '@/app/api/cron/[job]/route'

const URL_INBOUND = 'https://agents.example.test/api/sms/inbound' // PUBLIC_BASE_URL (vitest.config.ts) + chemin

function twilioRequest(params: Record<string, string>, signature?: string) {
  const sig = signature ?? computeTwilioSignature(process.env.TWILIO_AUTH_TOKEN!, URL_INBOUND, params)
  return new Request('http://internal/api/sms/inbound', {
    method: 'POST',
    body: new URLSearchParams(params),
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-twilio-signature': sig },
  })
}

const cronRequest = (job: string, secret?: string) =>
  cron(new Request(`http://localhost/api/cron/${job}`, { method: 'POST', headers: secret ? { 'x-cron-secret': secret } : {} }), { params: Promise.resolve({ job }) })

describe('webhook SMS', () => {
  beforeEach(resetDb)

  it('refuse une signature invalide', async () => {
    const res = await inbound(twilioRequest({ From: '+16175550142', Body: '5' }, 'bad'))
    expect(res.status).toBe(403)
  })

  it('enregistre la note du pro et répond en TwiML vide', async () => {
    const agent = await makeAgent()
    const pro = await makePro({ phone: '+16175550142' })
    const m = await makeMission({ proId: pro.id, agentId: agent.id, status: 'SUBMITTED', postVisitSmsAt: new Date() })
    const res = await inbound(twilioRequest({ From: '+16175550142', Body: '5', MessageSid: 'SM1' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/xml')
    expect(await res.text()).toBe('<?xml version="1.0" encoding="UTF-8"?><Response></Response>')
    expect((await prisma.mission.findUniqueOrThrow({ where: { id: m.id } })).proRating).toBe(5)
  })
})

describe('tâches planifiées', () => {
  beforeEach(resetDb)

  it('401 sans le bon secret, 404 pour une tâche inconnue', async () => {
    expect((await cronRequest('no-show')).status).toBe(401)
    expect((await cronRequest('no-show', 'wrong-secret')).status).toBe(401)
    expect((await cronRequest('nope', process.env.CRON_SECRET)).status).toBe(404)
  })

  it('lance la tâche demandée et renvoie son résultat', async () => {
    const res = await cronRequest('no-show', process.env.CRON_SECRET)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ job: 'no-show', result: { sms: 0, released: 0 } })
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run tests/api/sms-cron-routes.int.test.ts`
Expected: FAIL (routes introuvables).

- [ ] **Step 3: Écrire `app/api/sms/inbound/route.ts`**

```ts
import { handleInboundSms } from '@/modules/review'
import { isValidTwilioSignature } from '@/modules/sms'

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

// Webhook « A message comes in » du numéro Twilio. L'URL signée par Twilio est l'URL PUBLIQUE
// (PUBLIC_BASE_URL), pas celle vue derrière le proxy : on la reconstruit.
export async function POST(req: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN
  const base = process.env.PUBLIC_BASE_URL
  if (!token || !base) return new Response('Not configured', { status: 404 })
  const params = Object.fromEntries(new URLSearchParams(await req.text())) as Record<string, string>
  const url = new URL('/api/sms/inbound', base).toString()
  if (!isValidTwilioSignature(token, url, params, req.headers.get('x-twilio-signature'))) {
    return new Response('Invalid signature', { status: 403 })
  }
  if (params.From && typeof params.Body === 'string') await handleInboundSms(params.From, params.Body, new Date(), params.MessageSid ?? null)
  return new Response(EMPTY_TWIML, { headers: { 'content-type': 'text/xml; charset=utf-8' } })
}
```

- [ ] **Step 4: Écrire `app/api/cron/[job]/route.ts`**

```ts
import { createHash, timingSafeEqual } from 'node:crypto'
import { runNeedsFixSweep, runNoShowSweep, runReminderSweep } from '@/modules/missions'

// Appelées par le cron du VPS (voir docs/runbook.md), toutes les 15 minutes :
//   curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://<domaine>/api/cron/no-show
const JOBS: Record<string, () => Promise<unknown>> = {
  'no-show': () => runNoShowSweep(),
  'needs-fix': () => runNeedsFixSweep(),
  reminders: () => runReminderSweep(),
}

function secretOk(received: string | null): boolean {
  const expected = process.env.CRON_SECRET ?? ''
  if (expected.length < 32 || !received) return false // fermé tant que le secret n'est pas configuré
  const a = createHash('sha256').update(received).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  if (!secretOk(req.headers.get('x-cron-secret'))) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { job } = await params
  const run = Object.hasOwn(JOBS, job) ? JOBS[job] : undefined
  if (!run) return Response.json({ error: 'Unknown job' }, { status: 404 })
  return Response.json({ job, result: await run() })
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run tests/api/sms-cron-routes.int.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Lancer toute la suite et commit**

Run: `npm test && npx tsc --noEmit`
Expected: tout au vert.

```bash
git add app/api/sms app/api/cron tests/api/sms-cron-routes.int.test.ts
git commit -m "feat(api): signed Twilio inbound webhook and cron job endpoints"
```


## Chunk 12: Design system en React (composants mc)

Ce chunk porte en composants React **serveur** les aides de `design/mapcrew/components/bundle.js` : la marque (`MapCrew.brand`), les montants (`usd`, `estimate`), les icônes, le pin, le logo, la photo de remplacement, le motif de carte et la carte de mission. `bundle.js` n'est jamais chargé dans l'app (seuls `tokens.css` et `bundle.css` le sont, Task 1). Aucun de ces composants n'a de gestionnaire d'événement. Tous les montants arrivent en props, en cents, depuis les réglages (Task 7).

**Tests de rendu.** Les fichiers `*.test.tsx` rendent les composants avec `renderToStaticMarkup` (`react-dom/server`). La config Vitest du Task 3 suffit, `vitest.config.ts` ne change pas. L'environnement `node` convient au rendu serveur. Vitest 4.1 (Vite 8) compile le TSX avec le runtime JSX automatique, aligné sur `"jsx": "react-jsx"` du tsconfig : aucun `import React` n'est nécessaire (vérifié avec vitest 4.1.9 et vite 8.1). Ces fichiers passent par le `globalSetup` du Task 3 comme les autres tests : Postgres doit tourner.

### Task 41: Marque et mentions légales (`lib/brand.ts`)

Port de `MapCrew.brand` : nom, raison sociale, adresse et support, avec des placeholders visibles, plus la ligne d'indépendance (règle de contenu n° 1).

**Files:**
- Modify: `lib/brand.ts`
- Test: `lib/brand.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { BRAND_ADDRESS, BRAND_LEGAL, BRAND_NAME, BRAND_SUPPORT, independenceLine } from './brand'

describe('brand', () => {
  it('ligne d’indépendance avec le nom de marque', () => {
    expect(independenceLine()).toBe(`${BRAND_NAME} is an independent company, not affiliated with Google.`)
  })
  it('mentions légales en placeholders visibles', () => {
    for (const value of [BRAND_LEGAL, BRAND_ADDRESS, BRAND_SUPPORT]) expect(value).toMatch(/^\[.+\]/)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run lib/brand.test.ts`
Expected: FAIL (« TypeError: independenceLine is not a function »).

- [ ] **Step 3: Remplacer tout le contenu de `lib/brand.ts`**

```ts
// Nom de marque provisoire (à remplacer par la marque définitive via la variable d'environnement)
// et email du compte gestionnaire Google dédié, affiché à l'agent à l'étape « invitation ».
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'MapCrew'

// Mentions légales : placeholders volontairement visibles (comme MapCrew.brand dans bundle.js)
// tant que la société, l'adresse et l'email de support ne sont pas fixés. À remplir avant le lancement public.
export const BRAND_LEGAL = '[Company legal name], Inc.'
export const BRAND_ADDRESS = '[Street address], [City], [State] [ZIP]'
export const BRAND_SUPPORT = '[support@yourdomain.com]'

/** Règle de contenu n° 1 du design system : présente sur toute page marketing (confiance ET pied de page). */
export function independenceLine(): string {
  return `${BRAND_NAME} is an independent company, not affiliated with Google.`
}

export function managerInviteEmail(): string {
  return process.env.MANAGER_INVITE_EMAIL || 'manager@example.com'
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run lib/brand.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/brand.ts lib/brand.test.ts
git commit -m "feat(brand): legal placeholders and independence line"
```

### Task 42: Montants et niveaux (`components/mc/money.ts`)

Fonctions pures : `usd` reproduit `MapCrew.usd` mais reçoit des cents, et `estimate` reproduit `MapCrew.estimate` avec les montants des réglages. Les types `PayAmounts` et `PayLevel` ont la même forme que `Settings['tierAmountsCents']` et `Settings['levels']` : les composants restent indépendants de Prisma.

**Files:**
- Create: `components/mc/money.ts`
- Test: `components/mc/money.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { estimate, maxPerBusiness, sortLevels, usd } from './money'

const AMOUNTS = { VISIT: 4000, LIVE: 2500, CLIENT: 5000 }

describe('usd', () => {
  it('sans cents : dollars entiers, sans « .00 »', () => {
    expect(usd(4000)).toBe('$40')
    expect(usd(0)).toBe('$0')
  })
  it('sépare les milliers', () => {
    expect(usd(123_456_700)).toBe('$1,234,567')
    expect(usd(100_000)).toBe('$1,000')
    expect(usd(99_900)).toBe('$999')
  })
  it('avec cents', () => {
    expect(usd(10_500, { cents: true })).toBe('$105.00')
    expect(usd(123_456_789, { cents: true })).toBe('$1,234,567.89')
  })
  it('arrondit au dollar sans cents, comme MapCrew.usd', () => {
    expect(usd(4049)).toBe('$40')
    expect(usd(4050)).toBe('$41')
  })
})

describe('estimate', () => {
  it('Bronze : bas = visite seule, haut = les trois paiements', () => {
    expect(estimate(8, 0, AMOUNTS)).toEqual({ low: 32_000, high: 92_000 })
    expect(`${usd(32_000)} – ${usd(92_000)}`).toBe('$320 – $920')
  })
  it('applique le bonus de niveau aux deux bornes', () => {
    expect(estimate(8, 10, AMOUNTS)).toEqual({ low: 35_200, high: 101_200 })
    expect(estimate(40, 20, AMOUNTS)).toEqual({ low: 192_000, high: 552_000 })
  })
  it('suit les montants des réglages', () => {
    expect(estimate(1, 0, { VISIT: 4500, LIVE: 3000, CLIENT: 6000 })).toEqual({ low: 4500, high: 13_500 })
  })
})

describe('maxPerBusiness et sortLevels', () => {
  it('additionne les trois paliers et le bonus', () => {
    expect(maxPerBusiness(AMOUNTS)).toBe(11_500)
    expect(maxPerBusiness(AMOUNTS, 1500)).toBe(13_000)
  })
  it('trie les niveaux par seuil', () => {
    const sorted = sortLevels([
      { name: 'GOLD', minValidated: 15, bonusPct: 20 },
      { name: 'BRONZE', minValidated: 0, bonusPct: 0 },
      { name: 'SILVER', minValidated: 5, bonusPct: 10 },
    ])
    expect(sorted.map((l) => l.name)).toEqual(['BRONZE', 'SILVER', 'GOLD'])
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/mc/money.test.ts`
Expected: FAIL (« Cannot find module './money' »).

- [ ] **Step 3: Écrire `components/mc/money.ts`**

```ts
// Montants affichés par le design system. Tout est en cents (entiers), lus dans les réglages :
// aucun montant n'est écrit en dur dans les composants. Port de MapCrew.usd et MapCrew.estimate (bundle.js).

/** Les trois paiements par entreprise (sous-ensemble de Settings['tierAmountsCents']). */
export interface PayAmounts {
  VISIT: number
  LIVE: number
  CLIENT: number
}

export type LevelName = 'BRONZE' | 'SILVER' | 'GOLD'

/** Même forme qu'un élément de Settings['levels']. */
export interface PayLevel {
  name: LevelName
  minValidated: number
  bonusPct: number
}

export const LEVEL_LABEL: Record<LevelName, string> = { BRONZE: 'Bronze', SILVER: 'Silver', GOLD: 'Gold' }

/**
 * « $1,234 » (marketing, arrondi au dollar) ou « $1,234.50 » avec `{ cents: true }` (app : soldes, historique).
 * Même règle que MapCrew.usd, mais l'entrée est en cents.
 */
export function usd(cents: number, opts: { cents?: boolean } = {}): string {
  const s = (Math.round(cents) / 100).toFixed(opts.cents ? 2 : 0)
  const parts = s.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return '$' + parts.join('.')
}

/** Maximum par entreprise : visite + fiche en ligne + client (+ bonus éventuel). Sert aux « up to ». */
export function maxPerBusiness(amounts: PayAmounts, bonusCents = 0): number {
  return amounts.VISIT + amounts.LIVE + amounts.CLIENT + bonusCents
}

/**
 * Fourchette d'exemple pour un mois (cents) : bas = paiement de visite seul, haut = les trois paiements.
 * Le bonus de niveau s'applique aux trois paiements. Port de MapCrew.estimate.
 */
export function estimate(missions: number, levelBonusPct: number, amounts: PayAmounts): { low: number; high: number } {
  const mult = 1 + levelBonusPct / 100
  return {
    low: Math.round(missions * amounts.VISIT * mult),
    high: Math.round(missions * maxPerBusiness(amounts) * mult),
  }
}

/** Niveaux du plus bas au plus haut (les réglages ne garantissent pas l'ordre). */
export function sortLevels(levels: PayLevel[]): PayLevel[] {
  return [...levels].sort((a, b) => a.minValidated - b.minValidated)
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/mc/money.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add components/mc/money.ts components/mc/money.test.ts
git commit -m "feat(ui): usd formatting and earnings estimate in cents"
```

### Task 43: Icônes (`components/mc/icons.tsx`)

La table des chemins SVG est recopiée à l'identique de `bundle.js`, à une exception près : `star4` n'est pas reprise, car la règle de contenu n° 2 interdit toute étoile dans le jeu d'icônes (elle n'est utilisée nulle part). Il reste 49 icônes. C'est le premier test `.tsx` : il confirme que la config Vitest compile le JSX.

**Files:**
- Create: `components/mc/icons.tsx`
- Test: `components/mc/icons.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ICON_NAMES, Icon, tradeIcon, type IconName } from './icons'

describe('Icon', () => {
  it('rend un svg décoratif 24 px avec le trait du design system', () => {
    const html = renderToStaticMarkup(<Icon name="check" className="mc-ico--sm" />)
    expect(html).toBe(
      '<span class="mc-ico mc-ico--sm" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>',
    )
  })

  it('un nom inconnu retombe sur « info »', () => {
    const unknown = renderToStaticMarkup(<Icon name={'does-not-exist' as IconName} />)
    expect(unknown).toBe(renderToStaticMarkup(<Icon name="info" />))
    expect(unknown).toContain('aria-hidden="true"')
  })

  it('aucune étoile dans le jeu d’icônes, ni symbole d’argent', () => {
    expect(ICON_NAMES.filter((n) => /star|dollar|money/.test(n))).toEqual([])
    expect(ICON_NAMES).toHaveLength(49)
  })
})

describe('tradeIcon', () => {
  it('associe le métier à son icône', () => {
    expect(tradeIcon('Fence contractor')).toBe('fence')
    expect(tradeIcon('Concrete contractor')).toBe('brick')
    expect(tradeIcon('roofing')).toBe('roof')
    expect(tradeIcon('Tree service')).toBe('tree')
    expect(tradeIcon('Retaining wall builder')).toBe('hammer')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/mc/icons.test.tsx`
Expected: FAIL (« Cannot find module './icons' »). Une erreur « React is not defined » signalerait que le JSX n'est pas compilé en runtime automatique. Dans ce cas, ajouter `oxc: { jsx: { runtime: 'automatic' } }` à la racine de `defineConfig` dans `vitest.config.ts`, ou `esbuild: { jsx: 'automatic' }` si l'installation a résolu Vite 7.

- [ ] **Step 3: Écrire `components/mc/icons.tsx`**

```tsx
// Jeu d'icônes original MapCrew (grille 24 px, trait 1,75, extrémités arrondies, currentColor),
// recopié de design/mapcrew/components/bundle.js. L'icône « star4 » du bundle n'est pas reprise :
// règle de contenu n° 2 du README (aucune étoile dans le jeu d'icônes).
// Les chemins sont des constantes du design system, jamais des données utilisateur : on peut les
// injecter tels quels dans le <svg>.

const PATHS = {
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  map: '<path d="M9 4L3.5 6.3v13.5L9 17.5l6 2.5 5.5-2.3V4.2L15 6.5 9 4z"/><path d="M9 4v13.5M15 6.5V20"/>',
  list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.8" cy="6.5" r=".9"/><circle cx="4.8" cy="12" r=".9"/><circle cx="4.8" cy="17.5" r=".9"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  car: '<path d="M4.5 16.5v-4l2.1-5.1A2 2 0 018.5 6h7a2 2 0 011.9 1.4l2.1 5.1v4"/><path d="M3.5 16.5h17M4.5 12.5h15M6.5 16.5v2.5M17.5 16.5v2.5"/><circle cx="8" cy="14.5" r=".6"/><circle cx="16" cy="14.5" r=".6"/>',
  camera: '<path d="M4 8.5A1.5 1.5 0 015.5 7h2.3l1.5-2h5.4l1.5 2h2.3A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6L12 3z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.2"/><path d="M8 10.5V8a4 4 0 018 0v2.5M12 14.5v2"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c1.2-3.6 4.2-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  id: '<rect x="3" y="5" width="18" height="14" rx="2.2"/><circle cx="9" cy="10.8" r="2.1"/><path d="M5.8 16c.6-1.5 1.8-2.3 3.2-2.3s2.6.8 3.2 2.3M14.5 10h4M14.5 13.5h3"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.4"/><path d="M11 18.5h2"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 10h17M15.5 14.5h1.5"/>',
  bank: '<path d="M3.5 9.5L12 4.5l8.5 5M5.5 10.5v7M10 10.5v7M14 10.5v7M18.5 10.5v7M3.5 20h17"/>',
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "arrow-left": '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  "chev-right": '<path d="M9.5 6l6 6-6 6"/>',
  "chev-down": '<path d="M6 9.5l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  "wifi-off": '<path d="M3.5 3.5l17 17M8.6 16.3a5 5 0 016.8 0M5.2 12.8a9.8 9.8 0 014-2.3M18.8 12.8a10 10 0 00-2.6-1.8M2.3 9.3a14.8 14.8 0 015.2-3M21.7 9.3A14.8 14.8 0 0012.8 5.5"/><circle cx="12" cy="19.5" r=".8"/>',
  "cloud-check": '<path d="M7 18.5a4.5 4.5 0 01-.6-8.96A6 6 0 0117.8 8.7a4 4 0 01-.3 9.8z"/><path d="M9.5 13.5l2 2 3.5-3.6"/>',
  refresh: '<path d="M19.5 10.5A7.8 7.8 0 005.8 7.2L4.5 8.8M4.5 4.5v4.3h4.3M4.5 13.5a7.8 7.8 0 0013.7 3.3l1.3-1.6M19.5 19.5v-4.3h-4.3"/>',
  play: '<path d="M8.5 5.8v12.4a.8.8 0 001.2.7l9.8-6.2a.8.8 0 000-1.4L9.7 5.1a.8.8 0 00-1.2.7z"/>',
  pen: '<path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17z"/><path d="M14 7.5l2.5 2.5"/>',
  users: '<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5c.9-3 3.2-4.7 6-4.7s5.1 1.7 6 4.7M16 5.4a3.2 3.2 0 010 6.2M17.5 14.9c1.8.6 3 2.2 3.5 4.6"/>',
  store: '<path d="M4.5 10.5v9h15v-9M3 7l1.6-3h14.8L21 7v.8a2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-5.4 0 2.7 2.7 0 01-1.8-.8z"/><path d="M10 19.5V15h4v4.5"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 014.8.9c0 1.7-2.4 2.2-2.4 3.7"/><circle cx="12" cy="17" r=".8"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".8"/>',
  truck: '<path d="M3 6.5h10.5v9.5H3zM13.5 10h3.8l3.2 3.2V16h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  hammer: '<path d="M13.5 4.5l6 6-2 2-2-2-8 8a1.8 1.8 0 01-2.5-2.5l8-8-1.5-1.5z"/>',
  tree: '<path d="M12 21v-4.5M12 3L6.5 10.5h3L5.5 16.5h13l-4-6h3z"/>',
  roof: '<path d="M3 12L12 4l9 8M5.5 10v10h13V10M10 20v-5h4v5"/>',
  fence: '<path d="M5.5 20V6.5l2-2.5 2 2.5V20M14.5 20V6.5l2-2.5 2 2.5V20M3 10h18M3 15h18"/>',
  brick: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M3.5 9.7h17M3.5 14.3h17M9 5v4.7M15 5v4.7M12 9.7v4.6M6.5 14.3V19M17.5 14.3V19"/>',
  sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M5.5 18.5l1.4-1.4M17.1 6.9l1.4-1.4"/>',
  chat: '<path d="M5 18.5V6.5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H8.5z"/><path d="M8.5 9h7M8.5 12.3h4.5"/>',
  cap: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c1.5 1.4 3.4 2.2 5.5 2.2s4-.8 5.5-2.2V11M21.5 9v5"/>',
  video: '<rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11.5l-2.3 4 2.3 4H5.5"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10"/>',
  alert: '<path d="M12 4.5l8.5 15h-17z"/><path d="M12 10.5v4"/><circle cx="12" cy="17" r=".8"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><circle cx="9" cy="9.8" r="1.7"/><path d="M20.5 15.5l-5-5-10.5 9"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="M3.8 7.2l8.2 6 8.2-6"/>',
  "check-out": '<path d="M13.5 4.5H6.5v15h7M10 12h10M17 9l3 3-3 3"/>',
  "check-in": '<path d="M10.5 4.5h7v15h-7M3.5 12h10M10.5 9l3 3-3 3"/>',
  invite: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 19.5c1-3.2 3.6-5 6.5-5 1.4 0 2.8.4 3.9 1.2M18 13v6M15 16h6"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7.5a3 3 0 000-6h-7a3 3 0 010-6H16"/>',
} as const

export type IconName = keyof typeof PATHS

export const ICON_NAMES = Object.keys(PATHS) as IconName[]

/** Icône décorative (aria-hidden) : le texte voisin porte le sens. Nom inconnu → « info », comme MapCrew.icon. */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const body: string = PATHS[name] ?? PATHS.info
  return (
    <span className={className ? `mc-ico ${className}` : 'mc-ico'} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: body }}
      />
    </span>
  )
}

/** Icône de métier à partir du libellé libre d'un pro (« Fence contractor », « fencing »…). Port de MapCrew.tradeIcon. */
export function tradeIcon(trade: string): IconName {
  const t = trade.toLowerCase()
  if (/concrete|masonry|brick/.test(t)) return 'brick'
  if (/fenc/.test(t)) return 'fence'
  if (/roof/.test(t)) return 'roof'
  if (/tree/.test(t)) return 'tree'
  return 'hammer'
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/mc/icons.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/mc/icons.tsx components/mc/icons.test.tsx
git commit -m "feat(ui): MapCrew icon set as a server component"
```

### Task 44: Pin, logo et photo de remplacement

`Pin` porte `MapCrew.pin`. Sans action, c'est un `<span role="img">` étiqueté. Avec `href`, c'est un lien `<a>` (l'élément correct pour naviguer). Avec `onClick`, c'est un `<button aria-pressed>`, mais seulement depuis un composant client : un composant serveur ne passe jamais de fonction. Le CSS ne soulève que les boutons `[aria-pressed="true"]`, donc l'état sélectionné d'un lien ou d'une image est appliqué en style en ligne. `Logo` porte `MapCrew.logo` et `PhotoPlaceholder` porte `MapCrew.photo`.

**Files:**
- Create: `components/mc/pin.tsx`, `components/mc/logo.tsx`, `components/mc/photo-placeholder.tsx`
- Test: `components/mc/primitives.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/lib/brand'
import { Logo } from './logo'
import { PhotoPlaceholder } from './photo-placeholder'
import { Pin } from './pin'

describe('Pin', () => {
  it('sans action : image étiquetée, positionnée en %', () => {
    const html = renderToStaticMarkup(<Pin x={66} y={44} label="Fence contractor, 3.2 miles" />)
    expect(html).toMatch(/^<span class="mc-pin" style="left:66%;top:44%;cursor:default" role="img" aria-label="Fence contractor, 3.2 miles">/)
    expect(html).not.toContain('<button')
  })

  it('états, étiquette et bonus', () => {
    expect(renderToStaticMarkup(<Pin x={1} y={1} state="done" />)).toContain('class="mc-pin mc-pin--done"')
    expect(renderToStaticMarkup(<Pin x={1} y={1} state="muted" />)).toContain('class="mc-pin mc-pin--muted"')
    expect(renderToStaticMarkup(<Pin x={1} y={1} tag="Bonus" bonus />)).toContain('<span class="mc-pin__tag mc-pin__tag--bonus">Bonus</span>')
  })

  it('avec href : lien ; avec onClick : bouton pressé', () => {
    expect(renderToStaticMarkup(<Pin x={1} y={1} href="/agent/missions/m1" />)).toMatch(/^<a class="mc-pin"[^>]* href="\/agent\/missions\/m1" aria-label="Mission">/)
    const button = renderToStaticMarkup(<Pin x={1} y={1} selected onClick={() => undefined} />)
    expect(button).toMatch(/^<button type="button" class="mc-pin"[^>]* aria-pressed="true" aria-label="Mission">/)
  })

  it('sans position : rendu en ligne', () => {
    expect(renderToStaticMarkup(<Pin />)).toContain('style="position:relative;transform:none;cursor:default"')
  })
})

describe('Logo et PhotoPlaceholder', () => {
  it('le logo porte le nom de marque et pointe vers l’accueil', () => {
    const html = renderToStaticMarkup(<Logo />)
    expect(html).toContain(`aria-label="${BRAND_NAME} home"`)
    expect(html).toContain('href="/"')
    expect(html).toContain(`<span>${BRAND_NAME}</span>`)
  })

  it('la photo est un placeholder « [Photo] » avec son brief', () => {
    const html = renderToStaticMarkup(<PhotoPlaceholder title="Students" brief="Agent with a backpack" className="lp-visitphoto" />)
    expect(html).toBe('<figure class="mc-photo lp-visitphoto"><figcaption><b>[Photo] Students</b>Agent with a backpack</figcaption></figure>')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/mc/primitives.test.tsx`
Expected: FAIL (« Cannot find module './logo' »).

- [ ] **Step 3: Écrire `components/mc/pin.tsx`, `components/mc/logo.tsx`, `components/mc/photo-placeholder.tsx`**

`components/mc/pin.tsx` :

```tsx
import type { CSSProperties } from 'react'

// Pin de marque (goutte + œil), port de MapCrew.pinSVG / MapCrew.pin (bundle.js).
export const PIN_BODY_PATH =
  'M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z'

export interface PinProps {
  /** Position en % de la boîte de la carte ; sans x/y, le pin est rendu en ligne. */
  x?: number
  y?: number
  state?: 'done' | 'muted'
  /** Étiquette au-dessus du pin : montant (« $115 ») ou « Bonus ». */
  tag?: string
  bonus?: boolean
  selected?: boolean
  label?: string
  /** Pin cliquable vers une page (lien). */
  href?: string
  /** Pin bouton : uniquement depuis un composant client (un composant serveur ne passe pas de fonction). */
  onClick?: () => void
}

function PinSvg({ selected }: { selected: boolean }) {
  return (
    <svg viewBox="0 0 34 44" aria-hidden="true">
      <path className="p-body" d={PIN_BODY_PATH} style={selected ? { strokeWidth: 2.5 } : undefined} />
      <circle className="p-eye" cx="17" cy="16.5" r="5.5" />
    </svg>
  )
}

export function Pin({ x, y, state, tag, bonus, selected = false, label = 'Mission', href, onClick }: PinProps) {
  const className = 'mc-pin' + (state === 'done' ? ' mc-pin--done' : state === 'muted' ? ' mc-pin--muted' : '')
  const position: CSSProperties = x != null && y != null ? { left: `${x}%`, top: `${y}%` } : { position: 'relative', transform: 'none' }
  const inner = (
    <>
      <PinSvg selected={selected} />
      {tag ? <span className={bonus ? 'mc-pin__tag mc-pin__tag--bonus' : 'mc-pin__tag'}>{tag}</span> : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={className} style={position} aria-pressed={selected} aria-label={label} onClick={onClick}>
        {inner}
      </button>
    )
  }
  // Le CSS ne lève que les boutons [aria-pressed="true"] : pour un lien ou une image, l'état sélectionné est en ligne.
  const lifted: CSSProperties = selected && x != null && y != null ? { transform: 'translate(-50%, -100%) translateY(-4px) scale(1.12)' } : {}
  if (href) {
    return (
      <a className={className} style={{ ...position, ...lifted }} href={href} aria-label={label} aria-current={selected ? 'true' : undefined}>
        {inner}
      </a>
    )
  }
  return (
    <span className={className} style={{ ...position, ...lifted, cursor: 'default' }} role="img" aria-label={label}>
      {inner}
    </span>
  )
}
```

`components/mc/logo.tsx` :

```tsx
import { BRAND_NAME } from '@/lib/brand'
import { PIN_BODY_PATH } from './pin'

// Marque provisoire : le pin de marque à côté du nom en Bricolage Grotesque 800. Port de MapCrew.logo.
export function Logo({ href = '/' }: { href?: string }) {
  return (
    <a className="lp-logo" href={href} aria-label={`${BRAND_NAME} home`}>
      <svg className="lp-logo__mark" viewBox="0 0 34 44" aria-hidden="true">
        <path className="p-body" d={PIN_BODY_PATH} />
        <circle className="p-eye" cx="17" cy="16.5" r="5.5" />
      </svg>
      <span>{BRAND_NAME}</span>
    </a>
  )
}
```

`components/mc/photo-placeholder.tsx` :

```tsx
import type { CSSProperties } from 'react'

// Cadre hachuré « [Photo] » en attendant de vraies photos d'agents : la légende est le brief de prise de vue.
// Port de MapCrew.photo. Jamais de photo de stock ou générée à la place.
export function PhotoPlaceholder({ title, brief, className, style }: { title: string; brief: string; className?: string; style?: CSSProperties }) {
  return (
    <figure className={className ? `mc-photo ${className}` : 'mc-photo'} style={style}>
      <figcaption>
        <b>{`[Photo] ${title}`}</b>
        {brief}
      </figcaption>
    </figure>
  )
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/mc/primitives.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add components/mc/pin.tsx components/mc/logo.tsx components/mc/photo-placeholder.tsx components/mc/primitives.test.tsx
git commit -m "feat(ui): map pin, logo and photo placeholder"
```

### Task 45: Motif de carte (`components/mc/map-motif.tsx`)

`mapMotif()` est la partie pure : même générateur de Park–Miller, mêmes options et mêmes arrondis (`toFixed(2)`) que `MapCrew.map`. `<MapMotif>` la rend en JSX, avec l'agent (« you »), le cercle de rayon, les pins et un `children` qui remplace l'option `extra`. L'option `cls` s'appelle `className`, et `style` est un objet React. Un test de parité exécute le vrai `bundle.js` dans un bac à sable `node:vm` (jamais dans l'app) et vérifie que le SVG produit est identique, octet pour octet, une fois les balises SVG auto-fermées comme dans le bundle.

**Files:**
- Create: `components/mc/map-motif.tsx`
- Test: `components/mc/map-motif.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MapMotif, mapMotif, type MapMotifOptions } from './map-motif'

// Référence : le vrai MapCrew.map de bundle.js, exécuté dans un bac à sable (jamais chargé dans l'app).
function bundleMap(o: MapMotifOptions): string {
  const sandbox: { window: { MapCrew?: { map(o: MapMotifOptions): string } } } = { window: {} }
  runInNewContext(readFileSync('design/mapcrew/components/bundle.js', 'utf8'), sandbox)
  return sandbox.window.MapCrew!.map(o)
}
// React ferme les éléments SVG par une balise (<rect …></rect>) là où bundle.js les auto-ferme (<rect …/>).
const svgOf = (html: string) => /<svg[\s\S]*?<\/svg>/.exec(html)![0].replace(/<(rect|path)([^>]*)><\/\1>/g, '<$1$2/>')

describe('mapMotif', () => {
  it('même graine → même dessin ; autre graine → autre dessin', () => {
    expect(mapMotif({ seed: 21, cols: 7, rows: 7 })).toEqual(mapMotif({ seed: 21, cols: 7, rows: 7 }))
    expect(mapMotif({ seed: 21 }).rects).not.toEqual(mapMotif({ seed: 22 }).rects)
  })

  it('petite grille : un parc et des îlots, dont certains coupés en deux', () => {
    const { rects } = mapMotif({ seed: 3, cols: 2, rows: 2 })
    expect(rects).toHaveLength(6)
    expect(rects.filter((b) => b.cls === 'm-park')).toHaveLength(1)
    expect(rects.filter((b) => b.rx === '1.1')).toHaveLength(4)
  })

  it('sans parc ni coupe : une forme par îlot', () => {
    const { rects } = mapMotif({ seed: 11, cols: 3, rows: 2, park: -1 })
    expect(rects).toHaveLength(6)
    expect(rects.every((b) => b.cls === 'm-block' && b.rx === '1.4')).toBe(true)
  })

  it('inclut le trajet, la rivière et l’avenue', () => {
    const shapes = mapMotif({ route: 'M30 70 L30 56 L66 56 L66 44', waterY: 92, diagA: 88, diagB: 30, avenue: 5 })
    expect(shapes.route).toBe('M30 70 L30 56 L66 56 L66 44')
    expect(shapes.water).toBe('M-2 92 C 14 86, 30 104, 48 102 L -2 102 Z')
    expect(shapes.street).toEqual({ d: 'M-2 88 L 102 30', width: 5 })
    expect(mapMotif({ water: false }).water).toBeNull()
  })
})

describe('MapMotif', () => {
  it('rend exactement le même SVG que MapCrew.map (cartes de la landing)', () => {
    const hero = { seed: 21, cols: 7, rows: 7 }
    const phone = { seed: 5, cols: 4, rows: 4, gap: 3.2, route: 'M30 70 L30 56 L66 56 L66 44', diagA: 88, diagB: 30, waterY: 92, avenue: 5 }
    for (const o of [hero, phone, {}]) {
      expect(svgOf(renderToStaticMarkup(<MapMotif {...o} />))).toBe(svgOf(bundleMap(o)))
    }
  })

  it('trajet rendu, agent, rayon, pins et label', () => {
    const html = renderToStaticMarkup(
      <MapMotif seed={5} route="M30 70 L66 44" you={[30, 70]} radius={260} height={150} label="Map of missions" pins={[{ x: 66, y: 44, label: 'Roofing' }]} />,
    )
    expect(html).toMatch(/^<div class="mc-map" style="height:150px" role="group" aria-label="Map of missions">/)
    expect(html).toContain('<path class="m-route" vector-effect="non-scaling-stroke" d="M30 70 L66 44"></path>')
    expect(html).toContain('<span class="mc-you" style="left:30%;top:70%" role="img" aria-label="You are here"></span>')
    expect(html).toContain('width:260px;height:260px')
    expect(html).toContain('aria-label="Roofing"')
  })

  it('sans label : pas de rôle, la carte reste décorative', () => {
    expect(renderToStaticMarkup(<MapMotif />)).toMatch(/^<div class="mc-map"><svg/)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/mc/map-motif.test.tsx`
Expected: FAIL (« Cannot find module './map-motif' »).

- [ ] **Step 3: Écrire `components/mc/map-motif.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react'
import { Pin, type PinProps } from './pin'

// Motif de quartier vu du dessus : îlots arrondis, un parc, une rivière, une avenue en diagonale,
// des pins et un trajet en pointillés. Port fidèle et déterministe de MapCrew.map (bundle.js) :
// même générateur à graine, mêmes options, même SVG. C'est une illustration, pas une carte.

export interface MapMotifOptions {
  seed?: number
  cols?: number
  rows?: number
  /** Largeur des rues, en unités de la boîte 0–100. */
  gap?: number
  /** Hauteur des rues = gap × aspect. */
  aspect?: number
  /** Index de l'îlot transformé en parc (par défaut : tiré au sort). */
  park?: number
  water?: boolean
  waterY?: number
  /** Épaisseur de l'avenue en px. */
  avenue?: number
  diagA?: number
  diagB?: number
  /** Trajet SVG dans l'espace 0–100. */
  route?: string
}

export interface MapRect {
  cls: 'm-block' | 'm-park'
  x: string
  y: string
  width: string
  height: string
  rx: string
}

export interface MapShapes {
  rects: MapRect[]
  water: string | null
  street: { d: string; width: number }
  route: string | null
}

/** Générateur pseudo-aléatoire de Park–Miller, identique à celui de bundle.js. */
function rng(seed: number): () => number {
  let s = seed || 7
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Formes du motif (fonction pure) : même graine, même dessin. */
export function mapMotif(o: MapMotifOptions = {}): MapShapes {
  const r = rng(o.seed || 11)
  const cols = o.cols || 6
  const rows = o.rows || 7
  const gx = o.gap || 2.2
  const gy = gx * (o.aspect || 1)
  const xs = [0]
  const ys = [0]
  for (let i = 0; i < cols; i++) xs.push(xs[i] + 0.7 + r() * 0.6)
  for (let j = 0; j < rows; j++) ys.push(ys[j] + 0.7 + r() * 0.6)
  const sx = 104 / xs[cols]
  const sy = 104 / ys[rows]
  const park = o.park != null ? o.park : Math.floor(r() * cols * rows)
  const rects: MapRect[] = []
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const x0 = xs[i] * sx - 2 + gx / 2
      const x1 = xs[i + 1] * sx - 2 - gx / 2
      const y0 = ys[j] * sy - 2 + gy / 2
      const y1 = ys[j + 1] * sy - 2 - gy / 2
      const split = r() > 0.55
      const cls = j * cols + i === park ? 'm-park' : 'm-block'
      if (split && cls === 'm-block') {
        // Îlot coupé en deux par une ruelle.
        const mid = y0 + (y1 - y0) * (0.4 + r() * 0.2)
        rects.push({ cls: 'm-block', x: x0.toFixed(2), y: y0.toFixed(2), width: (x1 - x0).toFixed(2), height: (mid - y0 - gy * 0.25).toFixed(2), rx: '1.1' })
        rects.push({ cls: 'm-block', x: x0.toFixed(2), y: (mid + gy * 0.25).toFixed(2), width: (x1 - x0).toFixed(2), height: (y1 - mid - gy * 0.25).toFixed(2), rx: '1.1' })
      } else {
        rects.push({ cls, x: x0.toFixed(2), y: y0.toFixed(2), width: (x1 - x0).toFixed(2), height: (y1 - y0).toFixed(2), rx: '1.4' })
      }
    }
  }
  const wy = o.waterY || 80
  return {
    rects,
    water: o.water !== false ? `M-2 ${wy} C 14 ${wy - 6}, 30 ${wy + 12}, 48 102 L -2 102 Z` : null,
    street: { d: `M-2 ${o.diagA || 72} L 102 ${o.diagB || 18}`, width: o.avenue || 7 },
    route: o.route || null,
  }
}

export interface MapMotifProps extends MapMotifOptions {
  /** Position de l'agent en % [x, y]. */
  you?: [number, number]
  /** Diamètre du cercle de rayon autour de l'agent, en px (exige `you`). */
  radius?: number
  pins?: PinProps[]
  height?: number
  style?: CSSProperties
  /** Avec un label, la carte est un groupe nommé ; sinon elle reste décorative. */
  label?: string
  className?: string
  /** Contenu ajouté par-dessus (équivalent de l'option `extra` de bundle.js). */
  children?: ReactNode
}

export function MapMotif({ you, radius, pins = [], height, style, label, className, children, ...options }: MapMotifProps) {
  const shapes = mapMotif(options)
  return (
    <div
      className={className ? `mc-map ${className}` : 'mc-map'}
      style={{ ...(height ? { height } : {}), ...style }}
      role={label ? 'group' : undefined}
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {shapes.rects.map((b, k) => (
          <rect key={k} className={b.cls} x={b.x} y={b.y} width={b.width} height={b.height} rx={b.rx} />
        ))}
        {shapes.water ? <path className="m-water" d={shapes.water} /> : null}
        <path className="m-street" vectorEffect="non-scaling-stroke" strokeWidth={shapes.street.width} d={shapes.street.d} />
        {shapes.route ? <path className="m-route" vectorEffect="non-scaling-stroke" d={shapes.route} /> : null}
      </svg>
      {radius && you ? (
        <span
          style={{
            position: 'absolute', zIndex: 1, left: `${you[0]}%`, top: `${you[1]}%`, width: radius, height: radius,
            transform: 'translate(-50%,-50%)', borderRadius: '50%',
            background: 'color-mix(in srgb, var(--signal) 8%, transparent)',
            boxShadow: 'inset 0 0 0 1.5px var(--signal-text)', opacity: 0.7,
          }}
        />
      ) : null}
      {you ? <span className="mc-you" style={{ left: `${you[0]}%`, top: `${you[1]}%` }} role="img" aria-label="You are here" /> : null}
      {pins.map((p, k) => (
        <Pin key={k} {...p} />
      ))}
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/mc/map-motif.test.tsx`
Expected: PASS (7 tests). Si le test de parité échoue, comparer les deux chaînes : tout écart vient du port (ordre des appels à `r()`, `||` remplacé par `??`, arrondi), pas du test.

- [ ] **Step 5: Commit**

```bash
git add components/mc/map-motif.tsx components/mc/map-motif.test.tsx
git commit -m "feat(ui): deterministic neighborhood map motif"
```

### Task 46: Carte de mission (`components/mc/mission-card.tsx`)

Port de `MapCrew.missionCard`. Le « up to » est toujours accompagné de la décomposition complète, et tous les montants viennent des props. Le composant n'a aucune prop pour le nom de l'entreprise ni pour l'adresse : avant l'acceptation, la carte n'affiche que la ville et la distance. Avec `href`, la carte entière est un lien. Sans `href`, c'est un `<div>` non interactif : c'est le cas du téléphone d'illustration de la landing, masqué aux lecteurs d'écran (`aria-hidden`), qui ne doit contenir aucun élément focusable.

**Files:**
- Create: `components/mc/mission-card.tsx`
- Test: `components/mc/mission-card.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MissionCard, type MissionCardProps } from './mission-card'

const PROPS: MissionCardProps = {
  trade: 'Fence contractor',
  title: 'Fence contractor',
  city: 'Naperville, IL',
  distance: '3.2 mi',
  slot: 'Tue, Oct 20 · 10–11 AM',
  amounts: { VISIT: 4500, LIVE: 3000, CLIENT: 6000 },
}

describe('MissionCard', () => {
  it('affiche « up to » avec la décomposition, montants issus des props', () => {
    const html = renderToStaticMarkup(<MissionCard {...PROPS} />)
    expect(html).toContain('<b>$45</b> visit + <b>$30</b> live + <b>$60</b> if customer')
    expect(html).toContain('<span class="mc-mission__total"><small>up to </small>$135</span>')
    expect(html).toContain('Naperville, IL · 3.2 mi')
    expect(html).not.toContain('Bonus')
  })

  it('bonus : badge, ligne dans la décomposition et total', () => {
    const html = renderToStaticMarkup(<MissionCard {...PROPS} bonusCents={1500} />)
    expect(html).toContain('mc-badge mc-badge--bonus')
    expect(html).toContain(' Bonus +$15')
    expect(html).toContain(' + <b>$15</b> bonus')
    expect(html).toContain('<small>up to </small>$150')
  })

  it('n’affiche ni l’adresse ni le nom de l’entreprise, même s’ils sont transmis', () => {
    const pro = { businessName: 'Delgado Fencing LLC', address: '120 Tremont Street' }
    const html = renderToStaticMarkup(<MissionCard {...PROPS} {...(pro as object)} />)
    expect(html).not.toContain('Tremont')
    expect(html).not.toContain('Delgado')
  })

  it('avec href : la carte entière est un lien ; sans href : un bloc non interactif', () => {
    expect(renderToStaticMarkup(<MissionCard {...PROPS} href="/agent/missions/m1" />)).toMatch(/^<a class="mc-mission" href="\/agent\/missions\/m1"/)
    expect(renderToStaticMarkup(<MissionCard {...PROPS} />)).toMatch(/^<div class="mc-mission">/)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/mc/mission-card.test.tsx`
Expected: FAIL (« Cannot find module './mission-card' »).

- [ ] **Step 3: Écrire `components/mc/mission-card.tsx`**

```tsx
import { Icon, tradeIcon } from './icons'
import { maxPerBusiness, usd, type PayAmounts } from './money'

// Carte de mission : tout ce qu'il faut pour décider (métier, ville, distance, créneau, décomposition
// complète de la paie) avant d'entrer. Port de MapCrew.missionCard. Jamais le nom de l'entreprise ni
// l'adresse avant l'acceptation : le composant n'a pas de prop pour ça.

export interface MissionCardProps {
  /** Métier libre du pro (« Fence contractor ») : choisit l'icône. */
  trade: string
  /** Titre affiché : la catégorie, jamais le nom de l'entreprise. */
  title: string
  /** Ville seulement, ex. « Naperville, IL ». */
  city: string
  /** Distance lisible, ex. « 3.2 mi ». */
  distance: string
  /** Créneau lisible, ex. « Tue, Oct 20 · 10–11 AM ». */
  slot: string
  /** Montants des réglages, en cents. */
  amounts: PayAmounts
  bonusCents?: number
  /** Page de la mission. Sans href (illustration de la landing), la carte n'est pas interactive. */
  href?: string
  className?: string
}

export function MissionCard({ trade, title, city, distance, slot, amounts, bonusCents = 0, href, className }: MissionCardProps) {
  const cls = className ? `mc-mission ${className}` : 'mc-mission'
  const body = (
    <>
      <div className="mc-mission__top">
        <span className="mc-trade">
          <Icon name={tradeIcon(trade)} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mc-between" style={{ alignItems: 'flex-start' }}>
            <div className="mc-mission__title">{title}</div>
            {bonusCents > 0 ? (
              <span className="mc-badge mc-badge--bonus">
                <Icon name="flag" />
                {` Bonus +${usd(bonusCents)}`}
              </span>
            ) : null}
          </div>
          <div className="mc-mission__meta">
            <span>
              <Icon name="pin" className="mc-ico--sm" />
              {`${city} · ${distance}`}
            </span>
            <span>
              <Icon name="calendar" className="mc-ico--sm" />
              {slot}
            </span>
          </div>
        </div>
      </div>
      <div className="mc-mission__pay">
        <span className="mc-mission__split">
          <b>{usd(amounts.VISIT)}</b> visit + <b>{usd(amounts.LIVE)}</b> live + <b>{usd(amounts.CLIENT)}</b> if customer
          {bonusCents > 0 ? (
            <>
              {' + '}
              <b>{usd(bonusCents)}</b> bonus
            </>
          ) : null}
        </span>
        <span className="mc-mission__total">
          <small>up to </small>
          {usd(maxPerBusiness(amounts, bonusCents))}
        </span>
      </div>
    </>
  )
  if (href) {
    return (
      <a className={cls} href={href} style={{ textDecoration: 'none' }}>
        {body}
      </a>
    )
  }
  return <div className={cls}>{body}</div>
}
```

- [ ] **Step 4: Lancer les tests du dossier et le typage**

Run: `npx vitest run components/mc lib/brand.test.ts && npx tsc --noEmit`
Expected: PASS (6 fichiers, 32 tests), puis aucune erreur de typage.

- [ ] **Step 5: Commit**

```bash
git add components/mc/mission-card.tsx components/mc/mission-card.test.tsx
git commit -m "feat(ui): mission card with full pay split"
```

## Chunk 13: Landing page

La landing reprend le balisage et les classes de `MapCrew.landing` (`L.nav` … `L.footer`), section par section, dans `components/landing/`. Les sections sont des composants serveur. L'estimateur est le seul composant client. Les montants et les pourcentages de niveaux viennent des réglages, jamais du code. Les liens « Apply » mènent à `/apply`, « Log in » à `/login`.

Pour respecter la règle de contenu n° 2, trois textes de la maquette changent. Ils étaient les seuls à mentionner les avis en dehors de la phrase autorisée de la section confiance :
- Étape 1 de la paie : « Reviewed by our team after check-out » devient « Checked by our team after check-out ».
- Brief photo « Parents » : « reviewing photos » devient « looking at photos ».
- FAQ « Is this legit? » : « you're paid for visits — never for reviews — » devient « you’re paid for the visit and the setup help you give, ».

### Task 47: Estimateur (`components/landing/estimator.tsx`)

Seul composant client de la landing. Il reprend le calcul et l'accessibilité du comportement `[data-est]` de `MapCrew.hydrate` : curseur étiqueté relié au résultat (`aria-describedby`), résultat annoncé (`aria-live`), groupe radio des niveaux avec `aria-checked`. Il ajoute la navigation au clavier du motif ARIA « radio group » : flèches, et un seul bouton dans l'ordre de tabulation.

**Files:**
- Create: `components/landing/estimator.tsx`
- Test: `components/landing/estimator.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Estimator } from './estimator'

const LEVELS = [
  { name: 'SILVER' as const, minValidated: 5, bonusPct: 10 },
  { name: 'BRONZE' as const, minValidated: 0, bonusPct: 0 },
  { name: 'GOLD' as const, minValidated: 15, bonusPct: 20 },
]
const html = renderToStaticMarkup(<Estimator amounts={{ VISIT: 4500, LIVE: 3000, CLIENT: 6000 }} levels={LEVELS} />)

describe('Estimator (rendu initial)', () => {
  it('8 missions, premier niveau : fourchette calculée depuis les props, étiquetée comme exemple', () => {
    expect(html).toContain('<div class="lp-est__range">$360 – $1,080</div>')
    expect(html).toContain('<span>6–8</span> hours on site')
    expect(html).toContain('Low end: only the $45 visit payment.')
    expect(html).toContain('Example, not a guarantee')
  })

  it('curseur étiqueté, relié au résultat annoncé', () => {
    expect(html).toContain('<label class="mc-label mc-between" for="est-n">')
    expect(html).toMatch(/<input class="mc-range" id="est-n" type="range" min="1" max="40" aria-describedby="est-out"[^>]* value="8"\/>/)
    expect(html).toContain('id="est-out" aria-live="polite"')
  })

  it('groupe radio des niveaux, du plus bas au plus haut, un seul coché et focusable', () => {
    expect(html).toContain('role="radiogroup" aria-labelledby="est-lvl"')
    const radios = [...html.matchAll(/role="radio" aria-checked="(true|false)" tabindex="(0|-1)">(\w+)</g)].map((m) => m.slice(1))
    expect(radios).toEqual([['true', '0', 'Bronze'], ['false', '-1', 'Silver'], ['false', '-1', 'Gold']])
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/landing/estimator.test.tsx`
Expected: FAIL (« Cannot find module './estimator' »).

- [ ] **Step 3: Écrire `components/landing/estimator.tsx`**

```tsx
'use client'

import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { Icon } from '@/components/mc/icons'
import { estimate, LEVEL_LABEL, sortLevels, usd, type LevelName, type PayAmounts, type PayLevel } from '@/components/mc/money'

// Estimateur « What could a month look like? » : seul composant client de la landing.
// Même calcul et même accessibilité que le comportement [data-est] de MapCrew.hydrate (bundle.js),
// plus la navigation au clavier du groupe radio (flèches, un seul bouton dans l'ordre de tabulation).
const MIN = 1
const MAX = 40

export function Estimator({ amounts, levels }: { amounts: PayAmounts; levels: PayLevel[] }) {
  const ordered = sortLevels(levels)
  const [missions, setMissions] = useState(8)
  const [level, setLevel] = useState<LevelName>(ordered[0]?.name ?? 'BRONZE')
  const radios = useRef<(HTMLButtonElement | null)[]>([])

  const range = estimate(missions, ordered.find((l) => l.name === level)?.bonusPct ?? 0, amounts)
  const fill = `${((missions - MIN) / (MAX - MIN)) * 100}%`

  function onRadioKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (index + step + ordered.length) % ordered.length
    setLevel(ordered[next].name)
    radios.current[next]?.focus()
  }

  return (
    <div className="lp-est">
      <span className="mc-badge mc-badge--pending lp-est__ex"><Icon name="info" /> Example, not a guarantee</span>
      <h3 className="h3" style={{ marginTop: 8 }}>What could a month look like?</h3>
      <div className="mc-field" style={{ marginTop: 20 }}>
        <label className="mc-label mc-between" htmlFor="est-n">
          <span>Missions per month</span>
          <span className="money mc-num">{missions}</span>
        </label>
        <input
          className="mc-range" id="est-n" type="range" min={MIN} max={MAX} value={missions} aria-describedby="est-out"
          onChange={(e) => setMissions(Number(e.target.value))}
          style={{ '--fill': fill } as CSSProperties}
        />
      </div>
      <div className="mc-field" style={{ marginTop: 16 }}>
        <span className="mc-label" id="est-lvl">Your level</span>
        <div className="mc-seg" role="radiogroup" aria-labelledby="est-lvl">
          {ordered.map((l, i) => (
            <button
              key={l.name}
              ref={(el) => { radios.current[i] = el }}
              type="button" role="radio" aria-checked={l.name === level} tabIndex={l.name === level ? 0 : -1}
              onClick={() => setLevel(l.name)}
              onKeyDown={(e) => onRadioKey(e, i)}
            >
              {LEVEL_LABEL[l.name]}
            </button>
          ))}
        </div>
      </div>
      <div className="lp-est__out" id="est-out" aria-live="polite">
        <div className="mc-muted body-s">Example range per month</div>
        <div className="lp-est__range">{`${usd(range.low)} – ${usd(range.high)}`}</div>
        <div className="mc-muted body-s" style={{ marginTop: 4 }}>
          About <span>{`${Math.round(missions * 0.75)}–${missions}`}</span> hours on site, plus your travel.
        </div>
      </div>
      <p className="lp-est__fine">
        {`Low end: only the ${usd(amounts.VISIT)} visit payment. High end: all three payments for every business. `}
        Real results depend on validated visits and what each owner decides. Level bonus applies to all three payments.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/landing/estimator.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/landing/estimator.tsx components/landing/estimator.test.tsx
git commit -m "feat(landing): earnings estimator"
```

### Task 48: Haut de page (nav, hero, how, pay)

**Files:**
- Create: `components/landing/nav.tsx`, `components/landing/hero.tsx`, `components/landing/how.tsx`, `components/landing/pay.tsx`
- Test: `components/landing/sections-top.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Hero } from './hero'
import { How } from './how'
import { Nav } from './nav'
import { Pay } from './pay'

const AMOUNTS = { VISIT: 4500, LIVE: 3000, CLIENT: 6000 }
const LEVELS = [
  { name: 'GOLD' as const, minValidated: 20, bonusPct: 25 },
  { name: 'BRONZE' as const, minValidated: 0, bonusPct: 0 },
  { name: 'SILVER' as const, minValidated: 8, bonusPct: 12 },
]

describe('haut de page', () => {
  it('Nav : « Log in » mène à /login, « Apply » à /apply', () => {
    const html = renderToStaticMarkup(<Nav />)
    expect(html).toContain('href="/login">Log in</a>')
    expect(html).toContain('href="/apply">Apply</a>')
  })

  it('Hero : « up to » calculé, panneau et pins issus des props, téléphone non interactif', () => {
    const html = renderToStaticMarkup(<Hero amounts={AMOUNTS} />)
    expect(html).toContain('<b>up to $135 per business</b>')
    expect(html).toContain('<span class="v">+$30</span>')
    expect(html).toContain('<span class="mc-pin__tag">$135</span>')
    const phone = /<div class="lp-hero__phone" aria-hidden="true">[\s\S]*?Accept mission/.exec(html)![0]
    expect(phone).not.toMatch(/<a |<button/)
  })

  it('How : trois étapes', () => {
    expect(renderToStaticMarkup(<How />).split('class="lp-stepcard"')).toHaveLength(4)
  })

  it('Pay : paiements des réglages, étape 3 en contour, niveaux triés', () => {
    const html = renderToStaticMarkup(<Pay amounts={AMOUNTS} levels={LEVELS} />)
    expect(html).toContain('<span class="mc-payout__amt">+$60</span>')
    expect(html).toContain('<div class="lp-pstep lp-pstep--maybe"><span class="mc-payout__n">Step 3 · if it happens</span>')
    const levels = [...html.matchAll(/mc-level--(\w+)">\w+<\/span><b>\+(\d+)%<\/b><span>([^<]+)</g)].map((m) => m.slice(1))
    expect(levels).toEqual([['bronze', '0', 'From your first visit'], ['silver', '12', 'After 8 validated visits'], ['gold', '25', 'After 20 validated visits']])
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/landing/sections-top.test.tsx`
Expected: FAIL (« Cannot find module './hero' »).

- [ ] **Step 3: Écrire les quatre sections**

`components/landing/nav.tsx` :

```tsx
import { Logo } from '@/components/mc/logo'

// En-tête : logo, ancres des sections (desktop), « Log in » et « Apply ». Port de MapCrew.landing.nav.
export function Nav() {
  return (
    <header className="lp-wrap lp-nav">
      <Logo />
      <nav className="lp-navlinks" aria-label="Sections">
        <a href="#how">How it works</a><a href="#pay">Pay</a><a href="#safety">Safety</a><a href="#faq">FAQ</a>
      </nav>
      <span className="mc-row">
        <a className="mc-btn mc-btn--ghost lp-nav__cta-d" href="/login">Log in</a>
        <a className="mc-btn mc-btn--primary mc-btn--sm lp-nav__cta-m" href="/apply">Apply</a>
        <a className="mc-btn mc-btn--primary lp-nav__cta-d" href="/apply">Apply in 5 minutes</a>
      </span>
    </header>
  )
}
```

`components/landing/hero.tsx` :

```tsx
import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import { MissionCard } from '@/components/mc/mission-card'
import { maxPerBusiness, usd, type PayAmounts } from '@/components/mc/money'

// Premier écran : ce qu'on fait, combien, quand. Port de MapCrew.landing.hero ; le « up to » est calculé.
export function Hero({ amounts }: { amounts: PayAmounts }) {
  const upTo = usd(maxPerBusiness(amounts))
  const split = [
    ['Visit validated', usd(amounts.VISIT)],
    ['Profile live', `+${usd(amounts.LIVE)}`],
    ['Becomes a customer', `+${usd(amounts.CLIENT)}`],
  ]
  return (
    <section className="lp-wrap lp-hero" aria-labelledby="hero-h">
      <div className="lp-hero__grid">
        <div>
          <p className="lp-eyebrow">
            <Icon name="pin" className="mc-ico--sm" /> Field agents · US · 18+
          </p>
          <h1 id="hero-h">Get paid to put local businesses <em>on the map.</em></h1>
          <p className="lp-hero__sub">
            Visit contractors near you, help them set up their free Google Business Profile, and earn{' '}
            <b>{`up to ${upTo} per business`}</b> — paid every Friday.
          </p>
          <div className="lp-hero__ctas">
            <a className="mc-btn mc-btn--primary mc-btn--lg" href="/apply">Apply in 5 minutes <Icon name="arrow-right" /></a>
            <a className="mc-btn mc-btn--secondary mc-btn--lg" href="#pay">See how pay works</a>
          </div>
          <ul className="lp-facts">
            {['Paid every Friday', 'No quotas', 'Daytime visits', 'You choose where'].map((fact) => (
              <li key={fact}><Icon name="check" />{fact}</li>
            ))}
          </ul>
        </div>
        <div className="lp-hero__visual">
          <MapMotif
            seed={21} cols={7} rows={7} label="Map of missions in a neighborhood" you={[24, 78]} radius={260}
            pins={[
              { x: 74, y: 22, tag: upTo, label: `Mission, up to ${upTo}` },
              { x: 86, y: 54, tag: 'Bonus', bonus: true, label: 'Mission with a bonus' },
              { x: 58, y: 40, state: 'done', label: 'Completed visit' },
              { x: 40, y: 18, tag: upTo, label: `Mission, up to ${upTo}` },
              { x: 92, y: 84, state: 'muted', label: 'Booked by another agent' },
            ]}
          />
          {/* Téléphone d'illustration : masqué aux lecteurs d'écran, donc rien d'interactif dedans. */}
          <div className="lp-hero__phone" aria-hidden="true">
            <MapMotif
              seed={5} cols={4} rows={4} gap={3.2} you={[30, 70]} route="M30 70 L30 56 L66 56 L66 44" diagA={88} diagB={30} waterY={92} avenue={5}
              pins={[{ x: 66, y: 44, selected: true, label: 'Fence contractor, 3.2 miles' }, { x: 22, y: 30, label: 'Roofing' }]}
            />
            <MissionCard trade="fencing" title="Fence contractor" city="Naperville, IL" distance="3.2 mi" slot="Tue, Oct 20 · 10–11 AM" amounts={amounts} />
            <span className="mc-btn mc-btn--primary mc-btn--block">Accept mission</span>
          </div>
          <div className="lp-hero__floater mc-card" aria-hidden="true" style={{ boxShadow: 'var(--shadow-raised)' }}>
            <div className="overline mc-muted" style={{ marginBottom: 8 }}>This business</div>
            <div className="mc-pline" style={{ marginBottom: 10 }}><i data-state="done" /><i data-state="pending" /><i /></div>
            <div className="mc-kv">
              {split.map(([k, v]) => (
                <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

`components/landing/how.tsx` :

```tsx
// « How it works » en trois étapes. Port de MapCrew.landing.how.
const STEPS = [
  ['Apply and get certified', 'Five short video lessons and a quiz — about 45 minutes, online, at your pace.', 'About 45 min'],
  ['Pick missions near you', 'Every mission shows the trade, distance, time slot and exact pay before you accept. You choose when and where.', 'No quotas'],
  ['Visit, help, get paid', 'Spend 45–60 minutes with the owner, set up their profile on their own phone, take the photos, check out.', 'Paid every Friday'],
]

export function How() {
  return (
    <section className="lp-sec" id="how" aria-labelledby="how-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">How it works</p>
        <h2 className="lp-h2" id="how-h">Three steps. No guesswork.</h2>
        <div className="lp-steps">
          {STEPS.map(([title, text, tag], i) => (
            <article className="lp-stepcard" key={title}>
              <span className="lp-stepcard__n">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="mc-badge mc-badge--outline lp-stepcard__tag">{tag}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`components/landing/pay.tsx` :

```tsx
import { Fragment } from 'react'
import { Icon } from '@/components/mc/icons'
import { LEVEL_LABEL, sortLevels, usd, type PayAmounts, type PayLevel } from '@/components/mc/money'
import { Estimator } from './estimator'

// Paie transparente : les trois paiements, les niveaux, le vendredi, et l'estimateur.
// Port de MapCrew.landing.pay ; montants et pourcentages lus dans les réglages.
export function Pay({ amounts, levels }: { amounts: PayAmounts; levels: PayLevel[] }) {
  const steps = [
    { cls: 'lp-pstep', n: 'Step 1', when: 'When we validate your visit', note: 'Checked by our team after check-out', amt: usd(amounts.VISIT) },
    { cls: 'lp-pstep', n: 'Step 2', when: 'When the profile goes live', note: 'After the owner finishes verification', amt: `+${usd(amounts.LIVE)}` },
    // Étape 3 jamais présentée comme certaine : carte en contour, « if it happens ».
    { cls: 'lp-pstep lp-pstep--maybe', n: 'Step 3 · if it happens', when: 'If the business becomes our customer', note: 'The owner decides — not guaranteed', amt: `+${usd(amounts.CLIENT)}` },
  ]
  return (
    <section className="lp-sec lp-sec--sunk" id="pay" aria-labelledby="pay-h">
      <div className="lp-wrap lp-pay__grid">
        <div>
          <p className="lp-eyebrow">Pay, fully transparent</p>
          <h2 className="lp-h2" id="pay-h">Three payments per business. All on the card.</h2>
          <p className="lp-lede">You see the full breakdown before you accept a mission. Nothing is hidden behind “up to”.</p>
          <div className="lp-payout">
            {steps.map((s, i) => (
              <Fragment key={s.n}>
                {i > 0 ? <span className="mc-payout__arrow"><Icon name="arrow-right" className="mc-ico--lg" /></span> : null}
                <div className={s.cls}>
                  <span className="mc-payout__n">{s.n}</span>
                  <span className="mc-payout__when">{s.when}</span>
                  <span className="mc-payout__note">{s.note}</span>
                  <span className="mc-payout__amt">{s.amt}</span>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="lp-levels">
            {sortLevels(levels).map((l) => (
              <div className="lp-level" key={l.name}>
                <span className={`mc-level mc-level--${l.name.toLowerCase()}`}>{LEVEL_LABEL[l.name]}</span>
                <b>{`+${l.bonusPct}%`}</b>
                <span>{l.minValidated === 0 ? 'From your first visit' : `After ${l.minValidated} validated visits`}</span>
              </div>
            ))}
          </div>
          <div className="lp-friday">
            <Icon name="calendar" />
            <div><b>Paid every Friday via Stripe</b><span>To the bank account or debit card you connect. No fees to join.</span></div>
          </div>
        </div>
        <Estimator amounts={amounts} levels={levels} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/landing/sections-top.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/landing/nav.tsx components/landing/hero.tsx components/landing/how.tsx components/landing/pay.tsx components/landing/sections-top.test.tsx
git commit -m "feat(landing): nav, hero, how it works and pay sections"
```

### Task 49: Bas de page (visit, who, trust, faq, footer)

La ligne d'indépendance apparaît dans la section confiance (sur fond papier), dans la FAQ et dans le pied de page. Les témoignages restent des placeholders. Les pages légales n'existent pas encore : les liens du pied de page restent en `#`, comme dans la maquette, jusqu'au lancement public.

**Files:**
- Create: `components/landing/visit.tsx`, `components/landing/who.tsx`, `components/landing/trust.tsx`, `components/landing/faq.tsx`, `components/landing/footer.tsx`
- Test: `components/landing/sections-bottom.test.tsx`

- [ ] **Step 1: Écrire le test qui échoue**

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BRAND_LEGAL, BRAND_SUPPORT, independenceLine } from '@/lib/brand'
import { Faq } from './faq'
import { Footer } from './footer'
import { NO_REVIEWS_LINE, Trust } from './trust'
import { Visit } from './visit'
import { TESTIMONIAL_PLACEHOLDER, Who } from './who'

describe('bas de page', () => {
  it('Visit : paiement de visite issu des props', () => {
    expect(renderToStaticMarkup(<Visit amounts={{ VISIT: 4500, LIVE: 3000, CLIENT: 6000 }} />)).toContain('Your $45 is on its way to validation.')
  })

  it('Who : trois témoignages en placeholders, 18+', () => {
    const html = renderToStaticMarkup(<Who />)
    expect(html.split(TESTIMONIAL_PLACEHOLDER)).toHaveLength(4)
    expect(html).toContain('18+ only')
  })

  it('Trust : ligne d’indépendance sur fond papier et phrase exacte sur les avis', () => {
    const html = renderToStaticMarkup(<Trust />)
    expect(html).toContain(`<p class="lp-indep">`)
    expect(html).toContain(`<span>${independenceLine()}</span>`)
    expect(html).toContain(NO_REVIEWS_LINE)
  })

  it('Faq : commence par le paiement (ouverte), mentions de marque, aucun avis', () => {
    const html = renderToStaticMarkup(<Faq />)
    expect(html).toMatch(/<details open=""><summary>When do I get paid\?/)
    expect(html.indexOf('When do I get paid?')).toBeLessThan(html.indexOf('Do I need a car?'))
    for (const value of [BRAND_LEGAL, BRAND_SUPPORT, independenceLine()]) expect(html).toContain(value)
    expect(html).not.toMatch(/\breview/i)
  })

  it('Footer : appel vers /apply, 18+, contractant indépendant, ligne d’indépendance', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(html).toContain('href="/apply">Apply in 5 minutes')
    expect(html).toContain('18+ only · Independent contractor')
    expect(html).toContain(independenceLine())
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/landing/sections-bottom.test.tsx`
Expected: FAIL (« Cannot find module './faq' »).

- [ ] **Step 3: Écrire les cinq sections**

`components/landing/visit.tsx` :

```tsx
import { usd, type PayAmounts } from '@/components/mc/money'
import { PhotoPlaceholder } from '@/components/mc/photo-placeholder'

// Déroulé d'une visite, minute par minute. Port de MapCrew.landing.visit.
export function Visit({ amounts }: { amounts: PayAmounts }) {
  const steps = [
    ['0:00', 'Check in', 'Tap check-in when you arrive. We confirm with the owner that you’re there.'],
    ['0:05', 'Owner signs consent', 'They read and sign on your phone: what you’ll do, what you won’t.'],
    ['0:10', 'Profile set up — on their phone', 'The owner signs in to their own Google account. You guide; they type. You never see their password.'],
    ['0:30', 'Photos', '10–15 shots: logo, truck, team, equipment, past jobs. The app shows what’s still missing.'],
    ['0:45', 'Verification', 'If Google offers video verification, you walk the owner through it.'],
    ['0:55', 'Done — check out', `Submit your checklist. Your ${usd(amounts.VISIT)} is on its way to validation.`],
  ]
  return (
    <section className="lp-sec" aria-labelledby="visit-h">
      <div className="lp-wrap lp-visit__grid">
        <div>
          <p className="lp-eyebrow">What a visit looks like</p>
          <h2 className="lp-h2" id="visit-h">About an hour, start to finish.</h2>
          <p className="lp-lede">The app walks you through every step. Training covers the rest, including what to say.</p>
          <PhotoPlaceholder className="lp-visitphoto" title="Agent and owner at a fencing workshop" brief="Daylight, owner holding their own phone, agent pointing at the screen. Casual clothes, early 20s–30s." />
        </div>
        <ol className="lp-timeline">
          {steps.map(([t, title, text]) => (
            <li className="lp-tl" key={t}>
              <span className="lp-tl__t">{t}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
```

`components/landing/who.tsx` :

```tsx
import { PhotoPlaceholder } from '@/components/mc/photo-placeholder'

// Pour qui. Les témoignages restent des placeholders tant qu'aucun agent réel n'a accepté d'être cité
// (règle de contenu n° 3 : jamais de citation inventée). Port de MapCrew.landing.who.
export const TESTIMONIAL_PLACEHOLDER = '[Testimonial placeholder — real agent quote, with permission]'

const PERSONAS = [
  ['Students', 'Fit visits between classes. Pick a mission, go, be back for your 2 PM.', 'Agent with a backpack talking with a concrete contractor beside a mixer truck'],
  ['Parents', 'Daytime only, during school hours, close to home. No quotas, no minimums.', 'Agent and tree-service owner looking at photos next to a chipper'],
  ['Gig workers', 'Pay per mission is fixed and shown up front, with distance. Payouts every Friday.', 'Agent photographing a roofing crew’s truck in a driveway'],
]

export function Who() {
  return (
    <section className="lp-sec lp-sec--sunk" aria-labelledby="who-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Who it’s for</p>
        <h2 className="lp-h2" id="who-h">Flexible work for people with a phone and a free morning.</h2>
        <div className="lp-who">
          {PERSONAS.map(([title, text, brief]) => (
            <article className="lp-persona" key={title}>
              <PhotoPlaceholder title={title} brief={brief} />
              <div className="lp-persona__body">
                <h3>{title}</h3>
                <p>{text}</p>
                <p className="lp-quote">{TESTIMONIAL_PLACEHOLDER}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="lp-pills">
          {['No experience needed', 'No quotas', 'You set your radius', '18+ only'].map((pill) => (
            <span className="mc-badge mc-badge--outline" key={pill}>{pill}</span>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`components/landing/trust.tsx` :

```tsx
import { Icon, type IconName } from '@/components/mc/icons'
import { independenceLine } from '@/lib/brand'

// Confiance et sécurité, sur fond forêt. Porte la ligne d'indépendance (sur fond papier, impossible à
// manquer) et la seule phrase autorisée sur les avis. Port de MapCrew.landing.trust.
export const NO_REVIEWS_LINE = 'Agents are never paid for reviews, and never write or ask for them.'

const ITEMS: [IconName, string, string][] = [
  ['store', 'Every business said yes first', 'Our team calls each contractor and books the visit. You never show up cold.'],
  ['sun', 'Daytime appointments', 'Visits are scheduled during business hours, at the business.'],
  ['id', 'Identity-verified agents', 'Every agent verifies their ID before their first mission.'],
  ['lock', 'You never handle passwords', 'The owner signs in on their own phone, to their own account.'],
  ['pen', 'A clear contractor agreement', 'You’re an independent contractor. The agreement is short and in plain English.'],
  ['chat', 'Real support', 'Message a real person from the app during visits. [Support hours placeholder]'],
]

export function Trust() {
  return (
    <section className="lp-sec lp-sec--forest" id="safety" aria-labelledby="trust-h">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Trust and safety</p>
        <h2 className="lp-h2" id="trust-h">Built so you know exactly who you’re working with.</h2>
        <div className="lp-trust">
          {ITEMS.map(([icon, title, text]) => (
            <div className="lp-titem" key={title}>
              <span className="lp-titem__i"><Icon name={icon} /></span>
              <div><h3>{title}</h3><p>{text}</p></div>
            </div>
          ))}
        </div>
        <p className="lp-indep"><Icon name="info" /><span>{independenceLine()}</span></p>
        <p className="lp-lede" style={{ marginTop: 16, fontSize: 15 }}>{NO_REVIEWS_LINE}</p>
      </div>
    </section>
  )
}
```

`components/landing/faq.tsx` :

```tsx
import type { ReactNode } from 'react'
import { Icon } from '@/components/mc/icons'
import { BRAND_ADDRESS, BRAND_LEGAL, BRAND_SUPPORT, independenceLine } from '@/lib/brand'

// Questions franches, la première sur le paiement. Port de MapCrew.landing.faq.
export function Faq() {
  const items: { q: string; a: ReactNode }[] = [
    { q: 'When do I get paid?', a: <><p>Every Friday, via Stripe, for every payment step validated by [cutoff day and time placeholder]. Money goes to the bank account or debit card you connect.</p><p>Your first payout can take a few extra days while Stripe verifies your details.</p></> },
    { q: 'Do I need a car?', a: <p>No. You set a travel radius and tell us whether you have a car; we only show missions you can reach. Some areas will have fewer missions without one.</p> },
    // Pas d'avis ici (règle n° 2) : la maquette disait « paid for visits — never for reviews ».
    { q: 'Is this legit?', a: <p>{`Yes, and you can check: ${BRAND_LEGAL} is a registered US company at ${BRAND_ADDRESS}. Every business agreed to the visit before it’s offered to you, you’re paid for the visit and the setup help you give, and it costs nothing to join. ${independenceLine()}`}</p> },
    { q: 'How do taxes work (1099)?', a: <p>You’re an independent contractor, so we don’t withhold taxes. If your earnings pass the IRS reporting threshold, you’ll get a 1099-NEC through Stripe early the next year. Setting some money aside helps. This isn’t tax advice.</p> },
    { q: 'What if the owner isn’t there?', a: <p>Check in on arrival so we know you made it, then tap “Owner not here”. Our team calls the business while you wait. If the visit can’t happen: [no-show policy placeholder].</p> },
    { q: 'Why 18+?', a: <p>You’ll sign a contractor agreement, get paid through Stripe and visit businesses on your own. All of that requires you to be an adult.</p> },
  ]
  return (
    <section className="lp-sec" id="faq" aria-labelledby="faq-h">
      <div className="lp-wrap lp-faq__grid">
        <div>
          <p className="lp-eyebrow">FAQ</p>
          <h2 className="lp-h2" id="faq-h">Fair questions.</h2>
          <p className="lp-lede">{`Still unsure? Write to ${BRAND_SUPPORT} — a person answers.`}</p>
        </div>
        <div className="lp-faq">
          {items.map((item, i) => (
            <details key={item.q} open={i === 0}>
              <summary>{item.q}<Icon name="plus" /></summary>
              <div>{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
```

`components/landing/footer.tsx` :

```tsx
import { Icon } from '@/components/mc/icons'
import { Logo } from '@/components/mc/logo'
import { BRAND_ADDRESS, BRAND_LEGAL, independenceLine } from '@/lib/brand'

// Appel final et pied de page (mentions légales, 2e ligne d'indépendance). Port de MapCrew.landing.footer.
// Les pages légales n'existent pas encore : liens « # » comme la maquette, à remplacer avant le lancement public.
export function Footer() {
  return (
    <div className="lp-sec--forest">
      <div className="lp-wrap">
        <section className="lp-final" aria-labelledby="final-h">
          <div>
            <h2 id="final-h">Your neighborhood has businesses that need to be found.</h2>
            <p className="lp-final__fine">18+ only · Independent contractor · About 5 minutes to apply</p>
          </div>
          <a className="mc-btn mc-btn--primary mc-btn--lg" href="/apply">Apply in 5 minutes <Icon name="arrow-right" /></a>
        </section>
        <footer className="lp-foot">
          <div className="lp-foot__legal">
            <Logo />
            <span><b>{BRAND_LEGAL}</b><br />{BRAND_ADDRESS}</span>
          </div>
          <nav aria-label="Legal">
            {['Terms', 'Privacy', 'Contractor agreement', 'Contact', 'Help center'].map((label) => (
              <a href="#" key={label}>{label}</a>
            ))}
          </nav>
          <div className="lp-foot__legal">
            <span>{`${independenceLine()} Google Business Profile is a trademark of Google LLC.`}</span>
            <span>Earnings shown are examples, not guarantees. Agents are independent contractors, 18 or older.</span>
            <span>{`© ${new Date().getFullYear()} ${BRAND_LEGAL}`}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/landing/sections-bottom.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add components/landing/visit.tsx components/landing/who.tsx components/landing/trust.tsx components/landing/faq.tsx components/landing/footer.tsx components/landing/sections-bottom.test.tsx
git commit -m "feat(landing): visit, who, trust, FAQ and footer sections"
```

### Task 41: Assemblage, page d'accueil, métadonnées et PWA

`<Landing>` assemble les sections dans l'ordre de la maquette, et un test vérifie les règles de contenu sur la page entière. `app/page.tsx` est un composant serveur fin : il lit les réglages au moment de la requête. `await connection()` empêche le pré-rendu au build : le build ne touche jamais la base.

Le manifeste ouvre l'espace agent (`/agent`) en `standalone`, aux couleurs forest (barre d'état) et paper (lancement). `app/icon.svg` est le pin de marque de `bundle.js` (corps `signal`, contour et œil `ink`) sur un carré `paper`, sans couleur Google. Next le sert à `/icon.svg` et l'ajoute aux balises `<link rel="icon">`.

Le design system a un défaut sur mobile : `.lp-hero { padding: … 0 … }` écrase la gouttière de 16 px de `.lp-wrap`, et le titre touche le bord de l'écran (c'est aussi le cas dans la maquette). Le correctif va dans `app/globals.css`, chargé après `bundle.css`, et ne s'applique que sous 900 px : le desktop reste identique à la maquette.

**Files:**
- Create: `components/landing/landing.tsx`, `app/manifest.ts`, `app/icon.svg`
- Modify: `app/page.tsx` (remplace la page provisoire du Task 1), `app/globals.css`
- Test: `components/landing/landing.test.tsx`, `app/manifest.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

`components/landing/landing.test.tsx` :

```tsx
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { independenceLine } from '@/lib/brand'
import { Landing } from './landing'
import { NO_REVIEWS_LINE } from './trust'

// Montants volontairement différents des valeurs par défaut : rien ne doit être écrit en dur.
const SETTINGS = {
  tierAmountsCents: { VISIT: 4500, LIVE: 3000, CLIENT: 6000, RETURN_VISIT: 2000 },
  levels: [{ name: 'BRONZE' as const, minValidated: 0, bonusPct: 0 }, { name: 'SILVER' as const, minValidated: 8, bonusPct: 12 }, { name: 'GOLD' as const, minValidated: 20, bonusPct: 25 }],
}

const html = renderToStaticMarkup(<Landing amounts={SETTINGS.tierAmountsCents} levels={SETTINGS.levels} />)
const count = (needle: string) => html.split(needle).length - 1

describe('Landing — règles de contenu du design system', () => {
  it('ligne d’indépendance au moins deux fois (confiance et pied de page)', () => {
    expect(count(independenceLine())).toBeGreaterThanOrEqual(2)
  })

  it('montants issus des props, « up to » calculé, aucun montant par défaut en dur', () => {
    expect(html).toContain('up to $135 per business')
    for (const amt of ['$45', '+$30', '+$60']) expect(html).toContain(`<span class="mc-payout__amt">${amt}</span>`)
    expect(html).toContain('<b>+12%</b><span>After 8 validated visits</span>')
    expect(html).toContain('$360 – $1,080')
    for (const fixed of ['$40', '$25', '$50', '$115', '$320', '$920']) {
      expect(html).not.toMatch(new RegExp(`\\${fixed}(?![\\d,])`))
    }
  })

  it('aucun « review » ni « rating » hors de la phrase autorisée de la section confiance', () => {
    expect(count(NO_REVIEWS_LINE)).toBe(1)
    const rest = html.split(NO_REVIEWS_LINE).join('')
    expect(rest).not.toMatch(/\breview/i)
    expect(rest).not.toMatch(/\bratings?\b/i)
  })

  it('aucune étoile', () => {
    expect(html).not.toMatch(/\bstars?\b/i)
  })

  it('liens vers /apply et /login', () => {
    expect(count('href="/apply"')).toBeGreaterThanOrEqual(3)
    expect(html).toContain('href="/login"')
  })

  it('estimateur étiqueté comme exemple, 18+ et contractant indépendant affichés', () => {
    expect(html).toContain('Example, not a guarantee')
    expect(html).toContain('18+ only')
    expect(html).toContain('Field agents · US · 18+')
    expect(html).toMatch(/independent contractor/i)
  })

  it('sections dans l’ordre de la maquette', () => {
    const ids = [...html.matchAll(/aria-labelledby="([\w-]+)"/g)].map((m) => m[1]).filter((id) => id !== 'est-lvl')
    expect(ids).toEqual(['hero-h', 'how-h', 'pay-h', 'visit-h', 'who-h', 'trust-h', 'faq-h', 'final-h'])
  })
})
```

`app/manifest.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { BRAND_NAME } from '@/lib/brand'
import manifest from './manifest'

describe('manifest PWA', () => {
  it('ouvre l’espace agent en mode standalone, aux couleurs du design system', () => {
    const m = manifest()
    expect(m.short_name).toBe(BRAND_NAME)
    expect(m.start_url).toBe('/agent')
    expect(m.display).toBe('standalone')
    expect(m.theme_color).toBe('#1f3b2f')
    expect(m.background_color).toBe('#f6f2ea')
    expect(m.icons?.[0]).toMatchObject({ src: '/icon.svg', type: 'image/svg+xml' })
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run components/landing/landing.test.tsx app/manifest.test.ts`
Expected: FAIL (« Cannot find module './landing' » et « Cannot find module './manifest' »).

- [ ] **Step 3: Écrire `components/landing/landing.tsx`**

```tsx
import type { PayAmounts, PayLevel } from '@/components/mc/money'
import { Faq } from './faq'
import { Footer } from './footer'
import { Hero } from './hero'
import { How } from './how'
import { Nav } from './nav'
import { Pay } from './pay'
import { Trust } from './trust'
import { Visit } from './visit'
import { Who } from './who'

// Montants (cents) et niveaux viennent des réglages (modules/settings).
export interface LandingProps { amounts: PayAmounts; levels: PayLevel[] }

// Landing : un seul balisage, la mise en page passe en desktop par container query à 900 px sur `.lp`.
// Même ordre de sections que MapCrew.renderLanding(…, ["nav","hero","how","pay","visit","who","trust","faq","footer"]).
export function Landing({ amounts, levels }: LandingProps) {
  return (
    <div className="mc lp" data-theme="light">
      <Nav />
      <main>
        <Hero amounts={amounts} />
        <How />
        <Pay amounts={amounts} levels={levels} />
        <Visit amounts={amounts} />
        <Who />
        <Trust />
        <Faq />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 4: Remplacer tout le contenu de `app/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Landing } from '@/components/landing/landing'
import { BRAND_NAME } from '@/lib/brand'
import { getSettings } from '@/modules/settings'

const title = `${BRAND_NAME} — Get paid to put local businesses on the map`
const description =
  'Visit local contractors who already agreed to a visit, help each owner set up their own free Google Business Profile on their phone, and get paid every Friday. 18+, independent contractor.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, siteName: BRAND_NAME, type: 'website', locale: 'en_US' },
}

// Les montants viennent des réglages en base : la page se rend à la demande, jamais pendant le build.
export default async function Home() {
  await connection()
  const settings = await getSettings()
  return <Landing amounts={settings.tierAmountsCents} levels={settings.levels} />
}
```

- [ ] **Step 5: Écrire `app/manifest.ts` et `app/icon.svg`**

`app/manifest.ts` :

```ts
import type { MetadataRoute } from 'next'
import { BRAND_NAME } from '@/lib/brand'

// PWA des agents : installée depuis l'espace agent, elle s'ouvre sur /agent, en plein écran.
// Couleurs du design system : forest (barre d'état) et paper (écran de lancement).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} — Field agents`,
    short_name: BRAND_NAME,
    description: 'Missions, visits and earnings for field agents.',
    start_url: '/agent',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#1f3b2f',
    background_color: '#f6f2ea',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}
```

`app/icon.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
  <rect width="48" height="48" rx="11" fill="#f6f2ea"/>
  <g transform="translate(7 2)">
    <path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z" fill="#f26a1b" stroke="#17201c" stroke-width="1.5"/>
    <circle cx="17" cy="16.5" r="5.5" fill="#17201c"/>
  </g>
</svg>
```

- [ ] **Step 6: Ajouter le correctif de gouttière à la fin de `app/globals.css`**

```css
/* Correctif du design system : sur mobile, `.lp-hero` (padding vertical) écrase la gouttière de 16 px
   de `.lp-wrap` et le titre touche le bord de l'écran. Desktop (≥ 900 px) inchangé, identique à la maquette. */
@container (max-width: 899px) {
  .lp-hero.lp-wrap { padding-left: var(--space-4); padding-right: var(--space-4); }
}
```

- [ ] **Step 7: Lancer les tests, le typage et le lint**

Run: `npx vitest run components/landing app/manifest.test.ts && npm test && npx tsc --noEmit && npm run lint`
Expected: PASS (5 fichiers, 20 tests), puis toute la suite au vert, aucune erreur de typage ni de lint.

- [ ] **Step 8: Commit**

```bash
git add components/landing/landing.tsx components/landing/landing.test.tsx app/page.tsx app/globals.css app/manifest.ts app/manifest.test.ts app/icon.svg
git commit -m "feat(landing): landing page from settings, PWA manifest and icon"
```

### Task 42: Vérification visuelle de la landing

Les `preview.html` du design system ne chargent ni `bundle.css` ni `bundle.js` (l'outil du design system les injecte) : ouverts tels quels, ils sont vides. La référence est donc une page locale qui rend les sections de `LandingMobile/preview.html` (390 px) et de `LandingDesktop` + `LandingDesktopLower` (1440 px) sur toute la largeur.

**Files:**
- Create (non versionné, `.data/` est ignoré par git) : `.data/mapcrew-ref.html`

- [ ] **Step 1: Créer la page de référence `.data/mapcrew-ref.html`**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MapCrew reference landing</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Public+Sans:ital,wght@0,400..700;1,400&display=swap">
<link rel="stylesheet" href="../design/mapcrew/tokens.css">
<link rel="stylesheet" href="../design/mapcrew/components/bundle.css">
<script src="../design/mapcrew/components/bundle.js"></script>
<style>html, body { margin: 0; }</style>
</head>
<body>
<div id="ref"></div>
<script>MapCrew.renderLanding(document.getElementById('ref'), ['nav', 'hero', 'how', 'pay', 'visit', 'who', 'trust', 'faq', 'footer'])</script>
</body>
</html>
```

Run: `mkdir -p .data && open .data/mapcrew-ref.html`
Expected: la landing de référence s'affiche dans le navigateur.

- [ ] **Step 2: Lancer l'app**

Run: `npm run dev` (Postgres démarré, migrations appliquées), puis ouvrir `http://localhost:3000/`.
Expected: la landing s'affiche sans erreur dans le terminal ni dans la console du navigateur. Sans réglage enregistré, les montants sont ceux par défaut ($40, +$25, +$50, up to $115).

- [ ] **Step 3: Comparer à 390 px puis à 1440 px**

Dans les outils de développement (barre d'appareil), régler 390 × 844, puis 1440 × 900, et comparer `localhost:3000` à la référence, section par section :
- **Nav** : à 390 px, le logo et « Apply » seul. À 1440 px, les ancres, « Log in » et « Apply in 5 minutes ». « Apply » ouvre `/apply`, « Log in » ouvre `/login`.
- **Hero** : « Field agents · US · 18+ », soulignement orange sous « on the map. », « up to $115 per business », deux CTA, quatre faits cochés. Carte avec rayon, point « you », pins « $115 », « Bonus », terminé et pris. Téléphone avec la carte de mission. Panneau « This business » en desktop seulement. Écart voulu : à 390 px, le hero garde une gouttière de 16 px (correctif du Task 50) là où la référence touche le bord.
- **How it works** et **Pay** : trois cartes, puis trois colonnes en desktop. L'étape 3 est en contour, les flèches sont tournées sur mobile. Bronze +0 %, Silver +10 %, Gold +20 %. En desktop, l'estimateur est à droite et reste collant au défilement.
- **Estimateur** : à 8 missions et Bronze, « $320 – $920 » et « 6–8 hours ». Le curseur met à jour le nombre, la fourchette, les heures et le remplissage orange. Silver et Gold ajoutent 10 % et 20 %. Au clavier, Tab atteint le niveau coché, puis les flèches changent de niveau.
- **Visit**, **Who**, **Trust** : six étapes de 0:00 à 0:55 et la photo « [Photo] ». Trois personas avec témoignage en placeholder. Fond forest, ligne d'indépendance sur fond papier, puis la phrase exacte sur les avis.
- **FAQ** et **Footer** : la première question est ouverte, et le « + » tourne de 45°. Appel final, mentions en placeholders, liens légaux, seconde ligne d'indépendance.
- **Partout** : titres en Bricolage Grotesque, texte en Public Sans. Même soulignement des liens que la référence : le preflight de Tailwind est dans `@layer base`, donc `bundle.css`, hors couche, l'emporte. Les pins ne glissent pas au chargement. À 390 px, `document.documentElement.scrollWidth === 390` dans la console : aucun défilement horizontal.

- [ ] **Step 4: Vérifier les réglages et la PWA**

Run: `psql agents_terrain -c "INSERT INTO \"Setting\" (key, value, \"updatedAt\") VALUES ('app', '{\"tierAmountsCents\":{\"VISIT\":4500,\"LIVE\":2500,\"CLIENT\":5000,\"RETURN_VISIT\":2000}}', now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"`, puis recharger `/`.
Expected: « $45 » à l'étape 1, « up to $120 per business », « $360 – $960 » dans l'estimateur (8 missions, Bronze). Remettre les valeurs par défaut avec `psql agents_terrain -c "DELETE FROM \"Setting\" WHERE key = 'app'"` (« DELETE 1 »).

Ouvrir `/manifest.webmanifest`, puis `/icon.svg`.
Expected: `"start_url": "/agent"`, `"display": "standalone"`, `"theme_color": "#1f3b2f"`, `"background_color": "#f6f2ea"`. L'icône (pin orange, œil sombre, fond papier) apparaît aussi dans l'onglet.

- [ ] **Step 5: Corriger les écarts et committer**

Corriger tout écart non listé comme voulu, relancer `npm test && npx tsc --noEmit && npm run lint` (tout au vert), puis :

```bash
git add -A components app
git commit -m "fix(landing): visual parity with the MapCrew mockups"
```

S'il n'y a aucun écart, il n'y a rien à committer.

## Chunk 14: Écrans agent — coquille, connexion, candidature, formation, contrat

Écrans mobiles en anglais, construits avec les classes du design system (`mc-*`) et ses maquettes : `design/mapcrew/components/AppApply`, `AppAcademy`, `AppPayoutSetup` (`preview.html` + `README.md`). Les icônes viennent de `components/mc/icons.tsx` (`<Icon name="…" className="mc-ico--sm" />`, chunk 12). Les pages sont des composants serveur ; seuls les formulaires interactifs sont des composants client. Chaque server action relit l'agent avec `requireAgent()` avant d'appeler un service.

### Task 52: Coquille de l'app agent (statuts, barre d'onglets)

**Files:**
- Create: `modules/agents/home-rule.ts`, `lib/agent-guard.ts`, `lib/request.ts`
- Create: `app/agent/agent.css`, `app/agent/layout.tsx`, `app/agent/page.tsx`, `app/agent/status/page.tsx`
- Create: `components/agent/app-bar.tsx`, `components/agent/tab-bar.tsx`, `components/agent/submit-button.tsx`
- Test: `modules/agents/home-rule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { homePathFor } from './home-rule'

describe('homePathFor', () => {
  it.each([
    ['TRAINING', '/agent/academy'],
    ['CERTIFIED', '/agent/contract'],
    ['ACTIVE', '/agent/missions'],
    ['APPLICANT', '/agent/status'],
    ['LOCKED', '/agent/status'],
    ['REFUSED', '/agent/status'],
    ['SUSPENDED', '/agent/status'],
  ] as const)('%s → %s', (status, path) => {
    expect(homePathFor(status)).toBe(path)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run modules/agents/home-rule.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `modules/agents/home-rule.ts`, `lib/agent-guard.ts`, `lib/request.ts`**

`modules/agents/home-rule.ts` :

```ts
import type { AgentStatus } from '@prisma/client'

/** Écran d'accueil selon le statut : formation, contrat, missions, ou un message (verrouillé, refusé, suspendu). */
export function homePathFor(status: AgentStatus): string {
  switch (status) {
    case 'TRAINING':
      return '/agent/academy'
    case 'CERTIFIED':
      return '/agent/contract'
    case 'ACTIVE':
      return '/agent/missions'
    default:
      return '/agent/status'
  }
}
```

`lib/agent-guard.ts` :

```ts
import type { Agent, AgentStatus } from '@prisma/client'
import { redirect } from 'next/navigation'
import { requireAgent } from '@/lib/session'
import { homePathFor } from '@/modules/agents/home-rule'

/** Agent connecté dont le statut autorise la page ; sinon renvoi vers son écran d'accueil. */
export async function requireAgentIn(statuses: AgentStatus[]): Promise<Agent> {
  const agent = await requireAgent()
  if (!statuses.includes(agent.status)) redirect(homePathFor(agent.status))
  return agent
}
```

`lib/request.ts` :

```ts
import { headers } from 'next/headers'

/** Adresse IP du visiteur derrière Traefik (première valeur de X-Forwarded-For), ou null. */
export async function clientIp(): Promise<string | null> {
  const h = await headers()
  const first = (h.get('x-forwarded-for') ?? '').split(',')[0].trim()
  return first || h.get('x-real-ip') || null
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run modules/agents/home-rule.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Écrire la coquille (CSS, layout, composants)**

`app/agent/agent.css` (les maquettes dessinent un téléphone ; ici l'app occupe tout l'écran, colonne de 480 px au plus) :

```css
.mc-app { min-height: 100dvh; max-width: 480px; margin: 0 auto; display: flex; flex-direction: column; background: var(--paper); }
.mc-app .mc-scroll { overflow: visible; flex: 1; padding-top: var(--space-2); }
.mc-app .mc-bottom { position: sticky; bottom: 0; z-index: 5; padding-bottom: max(var(--space-4), env(safe-area-inset-bottom)); }
.mc-app .mc-tabbar { position: sticky; bottom: 0; z-index: 5; padding-bottom: max(10px, env(safe-area-inset-bottom)); }
.mc-app .mc-appbar { position: sticky; top: 0; z-index: 5; background: var(--paper); }
.mc-app a.mc-mission { text-decoration: none; }
.mc-app .mc-toast { margin: var(--space-3) var(--space-4) 0; }
```

`app/agent/layout.tsx` :

```tsx
import { requireAgent } from '@/lib/session'
import './agent.css'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  await requireAgent()
  return (
    <div className="mc mc-app" data-theme="light">
      {children}
    </div>
  )
}
```

`app/agent/page.tsx` :

```tsx
import { redirect } from 'next/navigation'
import { requireAgent } from '@/lib/session'
import { homePathFor } from '@/modules/agents/home-rule'

export default async function AgentHome() {
  const agent = await requireAgent()
  redirect(homePathFor(agent.status))
}
```

`app/agent/status/page.tsx` :

```tsx
import { redirect } from 'next/navigation'
import { BRAND_NAME } from '@/lib/brand'
import { requireAgent } from '@/lib/session'
import { signOut } from '@/lib/auth'
import { Icon } from '@/components/mc/icons'

const MESSAGES = {
  APPLICANT: ['Verify your phone', 'Log in again with the code we text you to finish your application.'],
  LOCKED: ['Your quiz is locked', 'You used your 3 attempts. Our team will review your account and contact you by text.'],
  REFUSED: ['Application closed', `We can’t offer missions to your account. Thank you for your interest in ${BRAND_NAME}.`],
  SUSPENDED: ['Account paused', 'Your account is paused while our team reviews a recent visit. Validated earnings stay payable. We’ll contact you by text.'],
} as const

export default async function StatusPage() {
  const agent = await requireAgent()
  if (!(agent.status in MESSAGES)) redirect('/agent')
  const [title, body] = MESSAGES[agent.status as keyof typeof MESSAGES]
  async function logout() {
    'use server'
    await signOut({ redirectTo: '/' })
  }
  return (
    <main className="mc-scroll" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 64 }}>
      <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="info" className="mc-ico--lg" /></span>
      <h1 className="h1" style={{ marginTop: 20 }}>{title}</h1>
      <p className="mc-muted" style={{ marginTop: 8 }}>{body}</p>
      <form action={logout} style={{ marginTop: 32 }}>
        <button type="submit" className="mc-btn mc-btn--secondary mc-btn--block">Log out</button>
      </form>
    </main>
  )
}
```

`components/agent/app-bar.tsx` :

```tsx
import Link from 'next/link'
import { Icon } from '@/components/mc/icons'

export function AppBar({ title, back, right, large }: { title: string; back?: string; right?: React.ReactNode; large?: boolean }) {
  return (
    <header className={`mc-appbar${large ? ' mc-appbar--pad' : ''}`}>
      {back && (
        <Link href={back} className="mc-iconbtn" aria-label="Back">
          <Icon name="arrow-left" />
        </Link>
      )}
      <span className="mc-appbar__title" style={large ? { font: '650 24px/1.2 var(--font-display)' } : undefined}>{title}</span>
      {right}
    </header>
  )
}
```

`components/agent/tab-bar.tsx` :

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/mc/icons'

const TABS = [
  { href: '/agent/missions', icon: 'map', label: 'Missions' },
  { href: '/agent/visits', icon: 'calendar', label: 'Visits' },
  { href: '/agent/earnings', icon: 'wallet', label: 'Earnings' },
  { href: '/agent/profile', icon: 'user', label: 'Profile' },
] as const

export function TabBar() {
  const path = usePathname()
  return (
    <nav className="mc-tabbar" aria-label="Main">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className="mc-tab" aria-current={path.startsWith(t.href) ? 'page' : undefined}>
          <Icon name={t.icon} className="mc-ico--lg" />
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
```

`components/agent/submit-button.tsx` :

```tsx
'use client'
import { useFormStatus } from 'react-dom'

/** Bouton d'envoi qui se désactive pendant l'envoi (évite les doubles clics). */
export function SubmitButton({ children, className = 'mc-btn mc-btn--primary mc-btn--lg mc-btn--block', disabled }: { children: React.ReactNode; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={disabled || pending} aria-busy={pending}>
      {pending ? 'Please wait…' : children}
    </button>
  )
}
```

La classe `mc-iconbtn` est définie dans `bundle.css` (bouton icône 44×44) ; sur un `<Link>` elle s'applique de la même façon.

- [ ] **Step 6: Vérifier et commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

```bash
git add modules/agents/home-rule.ts modules/agents/home-rule.test.ts lib/agent-guard.ts lib/request.ts app/agent components/agent
git commit -m "feat(agent-app): app shell, status routing and tab bar"
```

### Task 53: Connexion par code SMS (`/login`)

**Files:**
- Create: `app/login/page.tsx`, `app/login/actions.ts`, `components/agent/otp-input.tsx`, `components/agent/code-form.tsx`

- [ ] **Step 1: Écrire les actions (`app/login/actions.ts`)**

```ts
'use server'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { clientIp } from '@/lib/request'
import { requestLoginCode } from '@/modules/recruitment'

export type CodeRequestState = { phone?: string; error?: string }
export type VerifyState = { error?: string }

export async function sendLoginCode(_prev: CodeRequestState, form: FormData): Promise<CodeRequestState> {
  const r = await requestLoginCode(String(form.get('phone') ?? ''), new Date(), await clientIp())
  return r.ok ? { phone: r.phone } : { error: r.error }
}

/** Vérifie le code et ouvre la session agent (Auth.js, fournisseur « agent-otp »). */
export async function verifyCode(_prev: VerifyState, form: FormData): Promise<VerifyState> {
  try {
    await signIn('agent-otp', { phone: String(form.get('phone') ?? ''), code: String(form.get('code') ?? ''), redirectTo: '/agent' })
    return {}
  } catch (e) {
    if (e instanceof AuthError) return { error: 'That code is not valid or has expired. Check the last text we sent.' }
    throw e // la redirection de Next passe par une exception : on la laisse remonter
  }
}
```

- [ ] **Step 2: Écrire `components/agent/otp-input.tsx`**

```tsx
'use client'
import { useRef, useState } from 'react'

/** 6 cases d'un chiffre ; un collage remplit à partir de la case. Valeur envoyée dans un champ caché `code`. */
export function OtpInput({ onCodeChange }: { onCodeChange?: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function update(next: string[]) {
    setDigits(next)
    onCodeChange?.(next.join('')) // le parent sait à tout moment si les 6 chiffres sont là
  }
  function onChange(i: number, value: string) {
    const clean = value.replace(/\D/g, '')
    // Une seule case contient au plus un chiffre : on garde le chiffre tapé (le dernier) ; un collage
    // de plusieurs chiffres remplit à partir de cette case.
    const typed = clean.length === 2 && digits[i] !== '' ? clean.replace(digits[i], '').slice(-1) || clean.slice(-1) : null
    if (clean.length > 1 && typed === null) {
      const next = [...digits]
      clean.slice(0, 6 - i).split('').forEach((d, k) => { next[i + k] = d })
      update(next)
      refs.current[Math.min(i + clean.length, 5)]?.focus()
      return
    }
    const next = [...digits]
    next[i] = typed ?? clean
    update(next)
    if (next[i] && i < 5) refs.current[i + 1]?.focus()
  }
  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="mc-otp">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          value={d}
          onChange={(e) => onChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={6}
          aria-label={`Digit ${i + 1}`}
        />
      ))}
      <input type="hidden" name="code" value={digits.join('')} />
    </div>
  )
}
```

- [ ] **Step 3: Écrire `components/agent/code-form.tsx` (saisie du code, partagée avec la candidature)**

```tsx
'use client'
import { useActionState, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { verifyCode, type VerifyState } from '@/app/login/actions'
import { OtpInput } from './otp-input'
import { SubmitButton } from './submit-button'

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, '').slice(-10)
  return `(${d.slice(0, 3)}) •••-${d.slice(6)}`
}

export function CodeForm({ phone, onResend, onEdit }: { phone: string; onResend: () => void; onEdit: () => void }) {
  const [state, action] = useActionState<VerifyState, FormData>(verifyCode, {})
  const [code, setCode] = useState('')
  const complete = /^\d{6}$/.test(code)
  return (
    <form action={action} style={{ display: 'contents' }}>
      <input type="hidden" name="phone" value={phone} />
      <div className="mc-scroll" style={{ paddingTop: 20 }}>
        <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="phone" className="mc-ico--lg" /></span>
        <h1 className="h1" style={{ marginTop: 20 }}>Check your texts</h1>
        <p className="mc-muted" style={{ marginTop: 8 }}>
          We sent a 6-digit code to <b className="mc-num" style={{ color: 'var(--ink)' }}>{maskPhone(phone)}</b>.
        </p>
        <div className="mc-field" style={{ marginTop: 28 }}>
          <span className="mc-label">Verification code</span>
          <OtpInput onCodeChange={setCode} />
          {state.error && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{state.error}</p>}
        </div>
        <div className="mc-stack" style={{ marginTop: 24, gap: 4 }}>
          <button type="button" className="mc-btn mc-btn--ghost" style={{ justifyContent: 'flex-start', padding: 0 }} onClick={onResend}>
            Didn’t get it? <span className="mc-accent-text">&nbsp;Resend code</span>
          </button>
          <button type="button" className="mc-btn mc-btn--ghost" style={{ justifyContent: 'flex-start', padding: 0 }} onClick={onEdit}>
            Wrong number? <span className="mc-accent-text">&nbsp;Edit</span>
          </button>
        </div>
        <p className="body-s mc-muted" style={{ marginTop: 16 }}>Message and data rates may apply. We only text you about your account and missions.</p>
      </div>
      <div className="mc-bottom">
        <SubmitButton disabled={!complete}>Verify</SubmitButton>
        {!complete && <p className="body-s mc-muted" style={{ textAlign: 'center' }}>Enter all 6 digits to continue</p>}
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Écrire `app/login/page.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { useActionState, useState, startTransition } from 'react'
import { Icon } from '@/components/mc/icons'
import { CodeForm } from '@/components/agent/code-form'
import { SubmitButton } from '@/components/agent/submit-button'
import { sendLoginCode, type CodeRequestState } from './actions'
import '@/app/agent/agent.css'

export default function LoginPage() {
  const [state, action] = useActionState<CodeRequestState, FormData>(sendLoginCode, {})
  const [editing, setEditing] = useState(false)
  const [lastPhone, setLastPhone] = useState('')

  if (state.phone && !editing) {
    const resend = () => {
      const f = new FormData()
      f.set('phone', state.phone!)
      startTransition(() => action(f))
    }
    return (
      <div className="mc mc-app" data-theme="light">
        <CodeForm phone={state.phone} onResend={resend} onEdit={() => setEditing(true)} />
      </div>
    )
  }

  return (
    <div className="mc mc-app" data-theme="light">
      <form action={(f) => { setLastPhone(String(f.get('phone') ?? '')); setEditing(false); action(f) }} style={{ display: 'contents' }}>
        <div className="mc-scroll" style={{ paddingTop: 48 }}>
          <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="phone" className="mc-ico--lg" /></span>
          <h1 className="h1" style={{ marginTop: 20 }}>Log in</h1>
          <p className="mc-muted" style={{ marginTop: 8 }}>Enter the mobile number you applied with. We’ll text you a code.</p>
          <div className="mc-field" style={{ marginTop: 28 }}>
            <label className="mc-label" htmlFor="phone">Mobile number</label>
            <input className={`mc-input mc-num${state.error ? ' mc-input--error' : ''}`} id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={lastPhone} placeholder="(617) 555-0142" required aria-invalid={!!state.error} />
            {state.error && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{state.error}</p>}
          </div>
          <p className="body-s mc-muted" style={{ marginTop: 24 }}>New here? <Link className="mc-link" href="/apply">Apply in 5 minutes</Link></p>
        </div>
        <div className="mc-bottom"><SubmitButton>Send code</SubmitButton></div>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Vérifier dans le navigateur**

Run: `npm run dev`, puis ouvrir `http://localhost:3000/login` en vue mobile (390 px).
Expected :
- un numéro invalide (« 123 ») affiche « Enter a valid US mobile number » sous le champ ;
- le numéro d'un agent créé par `scripts/seed-dev.ts` (chunks du back-office) passe à l'écran « Check your texts » ;
- le code s'affiche dans la console du serveur (`[sms:console]`) ;
- saisir ce code mène vers `/agent`, puis vers l'écran qui correspond au statut de l'agent ;
- un faux code affiche « That code is not valid… ».

- [ ] **Step 6: Commit**

```bash
git add app/login components/agent/otp-input.tsx components/agent/code-form.tsx
git commit -m "feat(agent-app): SMS code login"
```

### Task 54: Candidature en 6 étapes (`/apply`)

Comme la maquette `AppApply` : un sujet par écran, une barre de progression « n of 6 », le bouton « Continue » en bas avec l'étape suivante nommée dessous. Le formulaire complet est envoyé une seule fois à la fin. Les erreurs du serveur ramènent à l'étape concernée.

**Files:**
- Create: `app/apply/page.tsx`, `app/apply/actions.ts`, `app/apply/apply-form.tsx`, `app/apply/apply-steps.ts`
- Test: `app/apply/apply-steps.test.ts`

- [ ] **Step 1: Écrire le test qui échoue (`app/apply/apply-steps.test.ts`)**

```ts
import { describe, expect, it } from 'vitest'
import { STEPS, birthDateFromParts, firstStepWithError } from './apply-steps'

describe('étapes de candidature', () => {
  it('6 étapes, chacune avec ses champs', () => {
    expect(STEPS).toHaveLength(6)
    expect(STEPS.map((s) => s.fields).flat()).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'phone', 'birthDate', 'zip', 'radiusMiles', 'hasCar', 'availability', 'confirm18']),
    )
  })
  it('ramène à la première étape qui porte une erreur', () => {
    expect(firstStepWithError({ zip: 'x', phone: 'y' })).toBe(1)
    expect(firstStepWithError({ confirm18: 'x' })).toBe(5)
    expect(firstStepWithError({})).toBe(-1)
  })
  it('assemble la date de naissance (mois, jour, année)', () => {
    expect(birthDateFromParts('4', '7', '2005')).toBe('2005-04-07')
    expect(birthDateFromParts('', '7', '2005')).toBe('')
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run app/apply/apply-steps.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `app/apply/apply-steps.ts`**

```ts
// Découpage de la candidature en 6 écrans (maquette AppApply), sans logique réseau.
export const STEPS = [
  { eyebrow: 'About you', title: 'What’s your name?', fields: ['firstName', 'lastName', 'email'], next: 'your mobile number' },
  { eyebrow: 'About you', title: 'Your mobile number', fields: ['phone'], next: 'your date of birth' },
  { eyebrow: 'About you', title: 'When were you born?', fields: ['birthDate'], next: 'where you can work' },
  { eyebrow: 'Where you’ll work', title: 'Where can you work?', fields: ['zip', 'radiusMiles', 'hasCar'], next: 'when you’re usually free' },
  { eyebrow: 'When you’re free', title: 'When are you usually free?', fields: ['availability'], next: 'review and confirm' },
  { eyebrow: 'Almost done', title: 'Review and confirm', fields: ['confirm18'], next: null },
] as const

export function firstStepWithError(errors: Record<string, string>): number {
  return STEPS.findIndex((s) => s.fields.some((f) => f in errors))
}

/** « 4 », « 7 », « 2005 » → « 2005-04-07 » (vide si une partie manque ; la validation serveur fait le reste). */
export function birthDateFromParts(month: string, day: string, year: string): string {
  if (!month || !day || !year) return ''
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run app/apply/apply-steps.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Écrire `app/apply/actions.ts`**

```ts
'use server'
import { clientIp } from '@/lib/request'
import { apply } from '@/modules/recruitment'

export type ApplyState = { phone?: string; fieldErrors?: Record<string, string> }

export async function submitApplication(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const input = {
    firstName: String(form.get('firstName') ?? ''),
    lastName: String(form.get('lastName') ?? ''),
    email: String(form.get('email') ?? ''),
    phone: String(form.get('phone') ?? ''),
    birthDate: String(form.get('birthDate') ?? ''),
    zip: String(form.get('zip') ?? ''),
    radiusMiles: String(form.get('radiusMiles') ?? ''),
    hasCar: String(form.get('hasCar') ?? ''),
    availability: form.getAll('availability').map(String),
    confirm18: form.get('confirm18') ? 'on' : undefined,
  }
  const r = await apply(input, new Date(), await clientIp())
  return r.ok ? { phone: r.phone } : { fieldErrors: r.fieldErrors }
}
```

- [ ] **Step 6: Écrire `app/apply/apply-form.tsx`**

```tsx
'use client'
import { startTransition, useActionState, useEffect, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { CodeForm } from '@/components/agent/code-form'
import { SubmitButton } from '@/components/agent/submit-button'
import { AVAILABILITY_SLOTS, DAYS, RADIUS_OPTIONS } from '@/modules/recruitment/apply-rule'
import { submitApplication, type ApplyState } from './actions'
import { STEPS, birthDateFromParts, firstStepWithError } from './apply-steps'

type Values = {
  firstName: string; lastName: string; email: string; phone: string
  month: string; day: string; year: string
  zip: string; radiusMiles: string; hasCar: 'yes' | 'no' | ''; availability: string[]; confirm18: boolean
}

const EMPTY: Values = { firstName: '', lastName: '', email: '', phone: '', month: '', day: '', year: '', zip: '', radiusMiles: '10', hasCar: '', availability: [], confirm18: false }
const DAY_LABEL: Record<(typeof DAYS)[number], string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }

function Field({ id, label, error, help, children }: { id: string; label: string; error?: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="mc-field">
      <label className="mc-label" htmlFor={id}>{label}</label>
      {children}
      {help && !error && <span className="mc-help">{help}</span>}
      {error && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{error}</p>}
    </div>
  )
}

export function ApplyForm() {
  const [state, action] = useActionState<ApplyState, FormData>(submitApplication, {})
  const [step, setStep] = useState(0)
  const [v, setV] = useState<Values>(EMPTY)
  const [verifying, setVerifying] = useState(false)
  const errors = state.fieldErrors ?? {}
  const set = <K extends keyof Values>(k: K, value: Values[K]) => setV((x) => ({ ...x, [k]: value }))

  useEffect(() => {
    if (state.phone) setVerifying(true)
    else if (state.fieldErrors) {
      const s = firstStepWithError(state.fieldErrors)
      if (s >= 0) setStep(s)
    }
  }, [state])

  function toFormData(): FormData {
    const f = new FormData()
    f.set('firstName', v.firstName); f.set('lastName', v.lastName); f.set('email', v.email); f.set('phone', v.phone)
    f.set('birthDate', birthDateFromParts(v.month, v.day, v.year)); f.set('zip', v.zip); f.set('radiusMiles', v.radiusMiles); f.set('hasCar', v.hasCar)
    v.availability.forEach((a) => f.append('availability', a))
    if (v.confirm18) f.set('confirm18', 'on')
    return f
  }

  if (verifying && state.phone) {
    return <CodeForm phone={state.phone} onResend={() => startTransition(() => action(toFormData()))} onEdit={() => { setVerifying(false); setStep(1) }} />
  }

  const s = STEPS[step]
  const last = step === STEPS.length - 1
  const toggleSlot = (slot: string) => set('availability', v.availability.includes(slot) ? v.availability.filter((x) => x !== slot) : [...v.availability, slot])

  return (
    <form action={() => (last ? action(toFormData()) : setStep(step + 1))} style={{ display: 'contents' }}>
      <header className="mc-appbar">
        {step > 0 ? (
          <button type="button" className="mc-iconbtn" aria-label="Back" onClick={() => setStep(step - 1)}><Icon name="arrow-left" /></button>
        ) : (
          <a className="mc-iconbtn" aria-label="Back" href="/"><Icon name="arrow-left" /></a>
        )}
        <span className="mc-appbar__title">Apply</span>
        <span className="body-s mc-muted mc-num" style={{ paddingRight: 12 }}>{step + 1} of 6</span>
      </header>
      <div style={{ padding: '0 16px' }}>
        <div className="mc-progress" role="progressbar" aria-label={`Step ${step + 1} of 6`} aria-valuemin={0} aria-valuemax={6} aria-valuenow={step + 1}>
          <span style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>
      </div>
      <div className="mc-scroll" style={{ paddingTop: 28 }}>
        <p className="overline mc-accent-text">{s.eyebrow}</p>
        <h1 className="h1" style={{ marginTop: 8 }}>{s.title}</h1>
        <div className="mc-stack" style={{ gap: 24, marginTop: 28 }}>
          {step === 0 && (
            <>
              <Field id="firstName" label="First name" error={errors.firstName}><input className="mc-input" id="firstName" autoComplete="given-name" value={v.firstName} onChange={(e) => set('firstName', e.target.value)} required /></Field>
              <Field id="lastName" label="Last name" error={errors.lastName}><input className="mc-input" id="lastName" autoComplete="family-name" value={v.lastName} onChange={(e) => set('lastName', e.target.value)} required /></Field>
              <Field id="email" label="Email" error={errors.email}><input className="mc-input" id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} required /></Field>
            </>
          )}
          {step === 1 && (
            <Field id="phone" label="Mobile number" error={errors.phone} help="We text you a code to log in. US mobile numbers only.">
              <input className="mc-input mc-num" id="phone" type="tel" inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(617) 555-0142" required />
            </Field>
          )}
          {step === 2 && (
            <>
              <p className="mc-muted" style={{ marginTop: -16 }}>Agents must be 18 or older.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 8 }}>
                <Field id="m" label="Month"><input className="mc-input mc-num" id="m" inputMode="numeric" maxLength={2} value={v.month} onChange={(e) => set('month', e.target.value.replace(/\D/g, ''))} required /></Field>
                <Field id="d" label="Day"><input className="mc-input mc-num" id="d" inputMode="numeric" maxLength={2} value={v.day} onChange={(e) => set('day', e.target.value.replace(/\D/g, ''))} required /></Field>
                <Field id="y" label="Year"><input className="mc-input mc-num" id="y" inputMode="numeric" maxLength={4} value={v.year} onChange={(e) => set('year', e.target.value.replace(/\D/g, ''))} required /></Field>
              </div>
              {errors.birthDate && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.birthDate}</p>}
              <div className="mc-card mc-card--sunk" style={{ display: 'flex', gap: 12 }}>
                <Icon name="id" />
                <p className="body-s">We’ll confirm your age with a photo ID before your first payout. It’s also why you’ll sign an independent contractor agreement.</p>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <Field id="zip" label="Home ZIP code" error={errors.zip} help="Used to find missions near you. Never shown to businesses.">
                <input className="mc-input mc-num" id="zip" inputMode="numeric" maxLength={5} value={v.zip} onChange={(e) => set('zip', e.target.value.replace(/\D/g, ''))} required />
              </Field>
              <div className="mc-field">
                <span className="mc-label" id="rad">How far will you travel?</span>
                <div className="mc-chips" role="radiogroup" aria-labelledby="rad">
                  {RADIUS_OPTIONS.map((r) => (
                    <button key={r} type="button" className="mc-chip" role="radio" aria-checked={v.radiusMiles === String(r)} onClick={() => set('radiusMiles', String(r))}>{r} mi</button>
                  ))}
                </div>
              </div>
              <div className="mc-field">
                <span className="mc-label" id="car">Do you have a car?</span>
                <div className="mc-seg" role="group" aria-labelledby="car">
                  <button type="button" aria-pressed={v.hasCar === 'yes'} onClick={() => set('hasCar', 'yes')}><Icon name="car" className="mc-ico--sm" /> Yes</button>
                  <button type="button" aria-pressed={v.hasCar === 'no'} onClick={() => set('hasCar', 'no')}>No</button>
                </div>
                {errors.hasCar ? <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.hasCar}</p> : <span className="mc-help">No car is fine — choose a radius you can reach by bike or transit.</span>}
              </div>
            </>
          )}
          {step === 4 && (
            <div className="mc-field">
              <span className="mc-label" id="avail">Pick every time you could visit a business</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 8, alignItems: 'center' }} role="group" aria-labelledby="avail">
                {DAYS.map((d) => (
                  <div key={d} style={{ display: 'contents' }}>
                    <span className="label">{DAY_LABEL[d]}</span>
                    {(['am', 'pm'] as const).map((half) => {
                      const slot = `${d}-${half}`
                      return (
                        <button key={slot} type="button" className="mc-chip" aria-pressed={v.availability.includes(slot)} onClick={() => toggleSlot(slot)}>
                          {half === 'am' ? 'Morning' : 'Afternoon'}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
              {errors.availability && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.availability}</p>}
              <span className="mc-help">{v.availability.length} of {AVAILABILITY_SLOTS.length} selected. You can change this later.</span>
            </div>
          )}
          {step === 5 && (
            <>
              <div className="mc-card">
                <div className="mc-kv">
                  <div><span className="k">Name</span><span className="v">{v.firstName} {v.lastName}</span></div>
                  <div><span className="k">Mobile</span><span className="v">{v.phone}</span></div>
                  <div><span className="k">ZIP · radius</span><span className="v">{v.zip} · {v.radiusMiles} mi</span></div>
                  <div><span className="k">Time slots</span><span className="v">{v.availability.length}</span></div>
                </div>
              </div>
              <label className="mc-check">
                <input type="checkbox" checked={v.confirm18} onChange={(e) => set('confirm18', e.target.checked)} />
                <span className="body-s" style={{ fontSize: 15 }}>I’m 18 or older. I understand field agents work as independent contractors.</span>
              </label>
              {errors.confirm18 && <p className="mc-error" role="alert"><Icon name="alert" className="mc-ico--sm" />{errors.confirm18}</p>}
            </>
          )}
        </div>
      </div>
      <div className="mc-bottom">
        {last ? <SubmitButton disabled={!v.confirm18}>Submit application</SubmitButton> : <button type="submit" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Continue</button>}
        {s.next && <p className="body-s mc-muted" style={{ textAlign: 'center' }}>Next: {s.next}</p>}
      </div>
    </form>
  )
}
```

- [ ] **Step 7: Écrire `app/apply/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { BRAND_NAME } from '@/lib/brand'
import { ApplyForm } from './apply-form'
import '@/app/agent/agent.css'

export const metadata: Metadata = { title: `Apply · ${BRAND_NAME}`, robots: { index: false } }

export default function ApplyPage() {
  return (
    <div className="mc mc-app" data-theme="light">
      <ApplyForm />
    </div>
  )
}
```

- [ ] **Step 8: Vérifier dans le navigateur**

Run: `npm run dev`, puis ouvrir `http://localhost:3000/apply` à 390 px de large.
Expected :
- les 6 écrans se suivent avec « n of 6 » et la ligne « Next: … » ;
- « Back » revient à l'écran précédent sans perdre les valeurs ;
- une date de naissance de mineur renvoie à l'écran 3 avec « You must be 18 or older » ;
- un ZIP inconnu (« 99999 ») renvoie à l'écran 4 ;
- une candidature valide affiche « Check your texts », le code apparaît dans la console du serveur, et sa saisie mène à `/agent/academy`.

- [ ] **Step 9: Commit**

```bash
git add app/apply
git commit -m "feat(agent-app): 6-step application with SMS verification"
```

## Chunk 15: Écrans agent — formation et contrat

### Task 55: Formation et quiz (`/agent/academy`)

**Files:**
- Create: `app/agent/academy/page.tsx`, `app/agent/academy/[moduleId]/page.tsx`, `app/agent/academy/quiz/page.tsx`, `app/agent/academy/quiz/quiz-form.tsx`, `app/agent/academy/quiz/actions.ts`

- [ ] **Step 1: Écrire la liste des modules (`app/agent/academy/page.tsx`)**

```tsx
import Link from 'next/link'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { requireAgentIn } from '@/lib/agent-guard'
import { ACADEMY_MODULES } from '@/modules/academy'

export default async function AcademyPage() {
  const agent = await requireAgentIn(['TRAINING', 'CERTIFIED', 'ACTIVE'])
  const minutes = ACADEMY_MODULES.reduce((s, m) => s + m.minutes, 0)
  return (
    <>
      <AppBar title="Academy" large right={<span className="mc-badge mc-badge--outline"><Icon name="clock" /> ~{minutes} min</span>} />
      <main className="mc-scroll">
        <p className="mc-muted">Five short lessons, then a quiz. Read each lesson before you start the quiz.</p>
        <ol className="mc-list" style={{ marginTop: 16 }}>
          {ACADEMY_MODULES.map((m, i) => (
            <li key={m.id}>
              <span className="mc-step__dot">{i + 1}</span>
              <Link href={`/agent/academy/${m.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                <div style={{ fontWeight: 600 }}>{m.title}</div>
                <div className="body-s mc-muted">{m.videoUrl ? 'Video' : 'Lesson'} · {m.minutes} min</div>
              </Link>
              <Icon name="chev-right" />
            </li>
          ))}
          <li style={{ background: 'var(--surface-sunk)' }}>
            <span className="mc-step__dot"><Icon name={agent.status === 'TRAINING' ? 'cap' : 'check'} className="mc-ico--sm" /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>Final quiz · {ACADEMY_MODULES.reduce((s, m) => s + m.questions.length, 0)} questions</div>
              <div className="body-s mc-muted">{agent.status === 'TRAINING' ? '80% to pass. 3 attempts.' : 'Passed'}</div>
            </div>
          </li>
        </ol>
      </main>
      {agent.status === 'TRAINING' && (
        <div className="mc-bottom">
          <Link href="/agent/academy/quiz" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Start the quiz</Link>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Écrire la page d'un module (`app/agent/academy/[moduleId]/page.tsx`)**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { requireAgentIn } from '@/lib/agent-guard'
import { ACADEMY_MODULES } from '@/modules/academy'

export default async function ModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  await requireAgentIn(['TRAINING', 'CERTIFIED', 'ACTIVE'])
  const { moduleId } = await params
  const i = ACADEMY_MODULES.findIndex((m) => m.id === moduleId)
  if (i < 0) notFound()
  const m = ACADEMY_MODULES[i]
  const next = ACADEMY_MODULES[i + 1]
  return (
    <>
      <AppBar title={`Lesson ${i + 1} of ${ACADEMY_MODULES.length}`} back="/agent/academy" />
      <main className="mc-scroll">
        <h1 className="h1">{m.title}</h1>
        {m.videoUrl ? (
          <video src={m.videoUrl} controls playsInline style={{ width: '100%', borderRadius: 'var(--radius-lg)', marginTop: 16 }} />
        ) : (
          <p className="mc-badge mc-badge--outline" style={{ marginTop: 12 }}><Icon name="video" /> Video coming soon</p>
        )}
        <ul className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {m.summary.map((line) => (
            <li key={line} className="mc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: 'var(--success)' }}><Icon name="check" /></span>
              <span style={{ fontSize: 15, lineHeight: '22px' }}>{line}</span>
            </li>
          ))}
        </ul>
      </main>
      <div className="mc-bottom">
        <Link href={next ? `/agent/academy/${next.id}` : '/agent/academy/quiz'} className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">
          {next ? `Next: ${next.title}` : 'Start the quiz'}
        </Link>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Écrire l'action du quiz (`app/agent/academy/quiz/actions.ts`)**

```ts
'use server'
import { requireAgent } from '@/lib/session'
import { submitQuiz } from '@/modules/academy'

export type QuizState = { result?: { passed: boolean; score: number; locked: boolean }; error?: string; retryAt?: string }

export async function sendQuiz(_prev: QuizState, form: FormData): Promise<QuizState> {
  const agent = await requireAgent()
  const answers: Record<string, number> = {}
  for (const [k, v] of form.entries()) if (k.startsWith('q:')) answers[k.slice(2)] = Number(v)
  const r = await submitQuiz(agent.id, answers)
  if (!r.ok) return { error: r.error, retryAt: r.retryAt?.toISOString() }
  return { result: { passed: r.passed, score: r.score, locked: r.locked } }
}
```

- [ ] **Step 4: Écrire le formulaire du quiz (`app/agent/academy/quiz/quiz-form.tsx`)**

Une question par écran avec des points de progression (maquette `AppAcademy`). Les bonnes réponses restent sur le serveur : pas de correction question par question (écart assumé avec la maquette, qui montre « That's right »), seulement le score à la fin.

```tsx
'use client'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { SubmitButton } from '@/components/agent/submit-button'
import { sendQuiz, type QuizState } from './actions'

type Q = { id: string; prompt: string; options: string[] }

export function QuizForm({ questions, passPct }: { questions: Q[]; passPct: number }) {
  const [state, action] = useActionState<QuizState, FormData>(sendQuiz, {})
  const [i, setI] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  if (state.result?.passed) {
    return (
      <>
        <main className="mc-scroll" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 40 }}>
          <div style={{ position: 'relative', width: 132, height: 132, marginBottom: 32 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', boxShadow: 'inset 0 0 0 2px var(--line)' }} />
            <span style={{ position: 'absolute', inset: 14, borderRadius: '50%', background: 'var(--signal-soft)' }} />
            <svg viewBox="0 0 34 44" style={{ position: 'absolute', left: 38, top: 24, width: 56, height: 72 }} aria-hidden="true">
              <path d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8 1.5 27.9 17 42.5 17 42.5S32.5 27.9 32.5 16.8C32.5 8.3 25.6 1.5 17 1.5z" fill="var(--signal)" stroke="var(--ink)" strokeWidth="1.5" />
              <path d="M11.5 16.5l3.8 3.8 7.4-7.6" fill="none" stroke="var(--ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="overline mc-accent-text">Academy complete</p>
          <h1 className="display-m" style={{ marginTop: 10 }}>You’re certified.</h1>
          <p className="body-l mc-muted" style={{ marginTop: 12 }}>Quiz score: <b className="mc-num" style={{ color: 'var(--ink)' }}>{state.result.score}%</b>. Next, sign your contractor agreement.</p>
        </main>
        <div className="mc-bottom"><Link href="/agent/contract" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Sign the agreement</Link></div>
      </>
    )
  }

  if (state.result || state.error) {
    const locked = state.result?.locked
    return (
      <>
        <main className="mc-scroll" style={{ paddingTop: 40 }}>
          <span className="mc-trade" style={{ width: 56, height: 56, borderRadius: 18 }}><Icon name="info" className="mc-ico--lg" /></span>
          <h1 className="h1" style={{ marginTop: 20 }}>{state.result ? `You scored ${state.result.score}%` : 'Not available right now'}</h1>
          <p className="mc-muted" style={{ marginTop: 8 }}>
            {state.error ??
              (locked
                ? 'That was your third attempt. Our team will review your account and text you.'
                : `You need ${passPct}% to pass. Read the lessons again; you can retry in 24 hours.`)}
          </p>
        </main>
        <div className="mc-bottom"><Link href="/agent/academy" className="mc-btn mc-btn--secondary mc-btn--lg mc-btn--block">Back to the lessons</Link></div>
      </>
    )
  }

  const q = questions[i]
  const last = i === questions.length - 1
  return (
    <form action={action} style={{ display: 'contents' }}>
      {Object.entries(answers).map(([id, v]) => <input key={id} type="hidden" name={`q:${id}`} value={v} />)}
      <header className="mc-appbar">
        <Link href="/agent/academy" className="mc-iconbtn" aria-label="Back"><Icon name="arrow-left" /></Link>
        <span className="mc-appbar__title">Quiz</span>
        <span className="body-s mc-muted mc-num" style={{ paddingRight: 12 }}>{i + 1} of {questions.length}</span>
      </header>
      <div style={{ padding: '0 16px' }}>
        <div className="mc-dots" aria-hidden="true">{questions.map((x, n) => <span key={x.id} {...(n <= i ? { 'data-on': '' } : {})} />)}</div>
      </div>
      <main className="mc-scroll" style={{ paddingTop: 28 }}>
        <h1 className="h2">{q.prompt}</h1>
        <div className="mc-stack" role="radiogroup" aria-label={q.prompt} style={{ marginTop: 24, gap: 10 }}>
          {q.options.map((o, n) => (
            <label key={o} className="mc-card mc-card--flat mc-check" style={{ padding: 16, ...(answers[q.id] === n ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : {}) }}>
              <input type="radio" name={`pick-${q.id}`} checked={answers[q.id] === n} onChange={() => setAnswers((a) => ({ ...a, [q.id]: n }))} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      </main>
      <div className="mc-bottom">
        {last ? (
          <SubmitButton disabled={answers[q.id] === undefined}>Submit answers</SubmitButton>
        ) : (
          <button type="button" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block" disabled={answers[q.id] === undefined} onClick={() => setI(i + 1)}>Next question</button>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 5: Écrire `app/agent/academy/quiz/page.tsx`**

```tsx
import { requireAgentIn } from '@/lib/agent-guard'
import { quizForClient } from '@/modules/academy'
import { PASS_PCT } from '@/modules/academy/quiz-rule'
import { QuizForm } from './quiz-form'

export default async function QuizPage() {
  await requireAgentIn(['TRAINING'])
  const questions = quizForClient().flatMap((m) => m.questions)
  return <QuizForm questions={questions} passPct={PASS_PCT} />
}
```

- [ ] **Step 6: Vérifier dans le navigateur**

Avec un agent TRAINING (seed ou candidature) : ouvrir `/agent/academy`.
Expected :
- la liste montre 5 leçons et le quiz ;
- chaque leçon affiche son résumé et un bouton vers la suivante ;
- le quiz affiche une question par écran, et « Next question » reste désactivé tant qu'aucune réponse n'est choisie ;
- tout bon donne l'écran « You’re certified. » avec un lien vers l'accord ;
- des réponses fausses donnent le score et l'attente de 24 h ;
- un nouvel essai immédiat est refusé avec « You can retry the quiz 24 hours after… ».

- [ ] **Step 7: Commit**

```bash
git add app/agent/academy
git commit -m "feat(agent-app): academy lessons and quiz"
```

### Task 56: Accord de prestataire (`/agent/contract`)

Écran 1 de la maquette `AppPayoutSetup` : l'accord résumé en langage simple, le texte complet dépliable, le nom légal tapé et une case à cocher. Le passage par Stripe (écrans 2 et 3) arrive en phase 2.

**Files:**
- Create: `app/agent/contract/page.tsx`, `app/agent/contract/contract-form.tsx`, `app/agent/contract/actions.ts`

- [ ] **Step 1: Écrire l'action (`app/agent/contract/actions.ts`)**

```ts
'use server'
import { redirect } from 'next/navigation'
import { clientIp } from '@/lib/request'
import { requireAgent } from '@/lib/session'
import { signContract } from '@/modules/contract'

export type SignState = { error?: string }

export async function sign(_prev: SignState, form: FormData): Promise<SignState> {
  const agent = await requireAgent()
  if (!form.get('agree')) return { error: 'Check the box to confirm you read the agreement and are 18 or older.' }
  const r = await signContract(agent.id, { ip: (await clientIp()) ?? 'unknown', signedName: String(form.get('signedName') ?? '') })
  if (!r.ok) return { error: r.error }
  redirect('/agent/missions')
}
```

- [ ] **Step 2: Écrire le formulaire (`app/agent/contract/contract-form.tsx`)**

```tsx
'use client'
import { useActionState } from 'react'
import { Icon } from '@/components/mc/icons'
import { SubmitButton } from '@/components/agent/submit-button'
import { sign, type SignState } from './actions'

export function ContractForm() {
  const [state, action] = useActionState<SignState, FormData>(sign, {})
  return (
    <form action={action} style={{ display: 'contents' }}>
      <div className="mc-scroll" style={{ paddingTop: 0 }}>
        <div className="mc-field">
          <label className="mc-label" htmlFor="sig">Type your full legal name to sign</label>
          <input className="mc-input" id="sig" name="signedName" autoComplete="name" required style={{ fontFamily: 'var(--font-display)', fontSize: 19 }} />
        </div>
        <label className="mc-check" style={{ marginTop: 16 }}>
          <input type="checkbox" name="agree" />
          <span className="body-s" style={{ fontSize: 15 }}>I’ve read the agreement and I’m 18 or older.</span>
        </label>
        {state.error && <p className="mc-error" role="alert" style={{ marginTop: 12 }}><Icon name="alert" className="mc-ico--sm" />{state.error}</p>}
      </div>
      <div className="mc-bottom"><SubmitButton>Sign and continue</SubmitButton></div>
    </form>
  )
}
```

- [ ] **Step 3: Écrire la page (`app/agent/contract/page.tsx`)**

```tsx
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { CONTRACT_IS_DRAFT, CONTRACT_SECTIONS } from '@/modules/contract'
import { getSettings } from '@/modules/settings'
import { ContractForm } from './contract-form'

export default async function ContractPage() {
  await requireAgentIn(['CERTIFIED'])
  const { tierAmountsCents: a } = await getSettings()
  const bullets = [
    'You’re an independent contractor, not an employee.',
    `We pay ${usd(a.VISIT)}, +${usd(a.LIVE)} and +${usd(a.CLIENT)} per business as each step is validated.`,
    'You handle your own taxes. We send a 1099-NEC when required.',
    'You never handle owners’ passwords and never write or ask for reviews.',
    'Either of us can end it at any time.',
  ]
  return (
    <>
      <AppBar title="Get paid" />
      <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8 }}>
        <span className="mc-badge mc-badge--bonus">1 Agreement</span>
        <span className="mc-badge mc-badge--outline">2 Payouts · coming soon</span>
      </div>
      <main className="mc-scroll" style={{ paddingTop: 16, flex: 'none' }}>
        {CONTRACT_IS_DRAFT && (
          <p className="mc-badge mc-badge--pending" style={{ marginBottom: 12 }}><Icon name="info" /> Draft — pending legal review</p>
        )}
        <h1 className="h1">Your contractor agreement, in plain English</h1>
        <ul className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bullets.map((t) => (
            <li key={t} className="mc-row" style={{ alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: 'var(--success)' }}><Icon name="check" /></span>
              <span className="body-s" style={{ fontSize: 15, lineHeight: '22px' }}>{t}</span>
            </li>
          ))}
        </ul>
        <details style={{ marginTop: 16 }}>
          <summary className="mc-link mc-row" style={{ minHeight: 44, cursor: 'pointer' }}><Icon name="external" className="mc-ico--sm" /> Read the full agreement</summary>
          <div className="mc-card mc-card--sunk" style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CONTRACT_SECTIONS.map((s) => (
              <section key={s.title}>
                <h2 className="h3">{s.title}</h2>
                <p className="body-s" style={{ marginTop: 4 }}>{s.body}</p>
              </section>
            ))}
          </div>
        </details>
      </main>
      <ContractForm />
    </>
  )
}
```

`usd` vient de `components/mc/money.ts` (chunk 12) : `usd(4000)` → `$40`.

- [ ] **Step 4: Vérifier dans le navigateur**

Avec un agent CERTIFIED : ouvrir `/agent/contract`.
Expected :
- les 5 puces affichent les montants des réglages ;
- le texte complet se déplie ;
- signer sans cocher la case affiche le message d'erreur ;
- un nom d'un seul caractère affiche « Type your full legal name to sign. » ;
- une signature valide mène à `/agent/missions`, et la base contient `contractSignedName` et le statut `ACTIVE`.

- [ ] **Step 5: Commit**

```bash
git add app/agent/contract
git commit -m "feat(agent-app): plain-English contractor agreement with typed signature"
```


## Chunk 16: Écrans agent — missions, détail, visites, gains, profil

Maquettes : `AppMissions`, `AppMissionDetail`, `AppMissionTracker`, `AppEarnings`, `EmptyState`. Composants du chunk 12 utilisés : `Icon`, `MapMotif`, `MissionCard`, `usd`, `maxPerBusiness`, `LEVEL_LABEL` (`components/mc/`).

### Task 57: Règles d'affichage (carte, suivi des paiements, niveau)

**Files:**
- Create: `components/agent/map-projection.ts`, `components/agent/tracker-rule.ts`, `components/agent/level-rule.ts`
- Test: `components/agent/display-rules.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@/modules/settings/defaults'
import { levelProgress } from './level-rule'
import { projectToMap } from './map-projection'
import { trackerSteps } from './tracker-rule'

describe('projectToMap', () => {
  const me = { lat: 42.3496, lng: -71.0746 }
  it('l’agent est au centre ; un point au bord du rayon touche le bord utile', () => {
    expect(projectToMap(me, me, 10)).toEqual({ x: 50, y: 50 })
    const north = projectToMap(me, { lat: me.lat + 10 / 69, lng: me.lng }, 10)
    expect(north.x).toBe(50)
    expect(north.y).toBeCloseTo(8, 0)
    const east = projectToMap(me, { lat: me.lat, lng: me.lng + 10 / (69.17 * Math.cos((me.lat * Math.PI) / 180)) }, 10)
    expect(east.x).toBeCloseTo(92, 0)
  })
  it('un point hors rayon reste sur le bord', () => {
    const far = projectToMap(me, { lat: me.lat - 5, lng: me.lng }, 10)
    expect(far.y).toBe(92)
  })
})

describe('trackerSteps (maquette AppMissionTracker)', () => {
  const amounts = DEFAULT_SETTINGS.tierAmountsCents
  it('soumise : visite en attente, le reste en attente d’étape', () => {
    expect(trackerSteps({ type: 'VISIT', status: 'SUBMITTED', earnings: [], amounts }).map((s) => s.state)).toEqual(['pending', 'waiting', 'waiting'])
  })
  it('validée : visite gagnée (montant réel), fiche en ligne en attente', () => {
    const steps = trackerSteps({ type: 'VISIT', status: 'VALIDATED', earnings: [{ tier: 'VISIT', amountCents: 4400, status: 'PAYABLE' }], amounts })
    expect(steps.map((s) => [s.tier, s.state, s.amountCents])).toEqual([['VISIT', 'done', 4400], ['LIVE', 'pending', 2500], ['CLIENT', 'waiting', 5000]])
  })
  it('mission de retour : un seul palier', () => {
    expect(trackerSteps({ type: 'RETURN_VISIT', status: 'VALIDATED', earnings: [{ tier: 'RETURN_VISIT', amountCents: 2000, status: 'PAYABLE' }], amounts })).toEqual([{ tier: 'RETURN_VISIT', state: 'done', amountCents: 2000 }])
  })
  it('un gain annulé ne compte pas comme gagné', () => {
    expect(trackerSteps({ type: 'VISIT', status: 'VALIDATED', earnings: [{ tier: 'VISIT', amountCents: 4000, status: 'VOID' }], amounts })[0].state).toBe('waiting')
  })
})

describe('levelProgress', () => {
  it('« 2 more visits to Silver » à 3 visites validées', () => {
    expect(levelProgress(3, DEFAULT_SETTINGS.levels)).toEqual({ current: 'BRONZE', next: 'SILVER', nextBonusPct: 10, remaining: 2, pct: 60 })
  })
  it('Gold : plus de niveau suivant', () => {
    expect(levelProgress(20, DEFAULT_SETTINGS.levels)).toEqual({ current: 'GOLD', next: null, nextBonusPct: null, remaining: 0, pct: 100 })
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/agent/display-rules.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire les trois règles**

`components/agent/map-projection.ts` :

```ts
// Place une mission sur le motif de carte (coordonnées en % du cadre) selon sa direction et sa distance
// depuis l'agent. Illustration, pas une vraie carte : les positions reçues sont déjà arrondies (≈ 1 km).
const MILES_PER_DEG_LAT = 69
const MILES_PER_DEG_LNG_EQUATOR = 69.17
const MARGIN = 42 // % du rayon utile autour du centre (on garde 8 % de bord pour les pins)

export function projectToMap(center: { lat: number; lng: number }, point: { lat: number; lng: number }, radiusMiles: number) {
  const r = Math.max(radiusMiles, 1)
  const dx = (point.lng - center.lng) * MILES_PER_DEG_LNG_EQUATOR * Math.cos((center.lat * Math.PI) / 180)
  const dy = (point.lat - center.lat) * MILES_PER_DEG_LAT
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  const round = (v: number) => Math.round(v * 10) / 10
  return { x: round(50 + clamp(dx / r) * MARGIN), y: round(50 - clamp(dy / r) * MARGIN) }
}
```

`components/agent/tracker-rule.ts` :

```ts
import type { EarningStatus, EarningTier, MissionStatus, MissionType } from '@prisma/client'

export type TrackState = 'done' | 'pending' | 'waiting'
export interface TrackStep { tier: EarningTier; state: TrackState; amountCents: number }

/** Les paliers d'une mission pour l'écran de suivi : gagné, en attente (en cours), ou pas encore atteint. */
export function trackerSteps(input: {
  type: MissionType
  status: MissionStatus
  earnings: { tier: EarningTier; amountCents: number; status: EarningStatus }[]
  amounts: { VISIT: number; LIVE: number; CLIENT: number; RETURN_VISIT: number }
}): TrackStep[] {
  const earned = new Map(input.earnings.filter((e) => e.status !== 'VOID').map((e) => [e.tier, e.amountCents]))
  const inReview = input.status === 'SUBMITTED' || input.status === 'NEEDS_FIX'
  if (input.type === 'RETURN_VISIT') {
    const got = earned.get('RETURN_VISIT')
    return [{ tier: 'RETURN_VISIT', state: got != null ? 'done' : inReview ? 'pending' : 'waiting', amountCents: got ?? input.amounts.RETURN_VISIT }]
  }
  const visit = earned.get('VISIT')
  const live = earned.get('LIVE')
  const client = earned.get('CLIENT')
  return [
    { tier: 'VISIT', state: visit != null ? 'done' : inReview ? 'pending' : 'waiting', amountCents: visit ?? input.amounts.VISIT },
    { tier: 'LIVE', state: live != null ? 'done' : visit != null ? 'pending' : 'waiting', amountCents: live ?? input.amounts.LIVE },
    { tier: 'CLIENT', state: client != null ? 'done' : 'waiting', amountCents: client ?? input.amounts.CLIENT },
  ]
}
```

`components/agent/level-rule.ts` :

```ts
import type { Settings } from '@/modules/settings/defaults'

/** Progression vers le niveau suivant, pour la carte « 2 more visits to Silver ». */
export function levelProgress(validated: number, levels: Settings['levels']) {
  const sorted = [...levels].sort((a, b) => a.minValidated - b.minValidated)
  const current = [...sorted].reverse().find((l) => validated >= l.minValidated) ?? sorted[0]
  const next = sorted.find((l) => l.minValidated > validated) ?? null
  if (!next) return { current: current.name, next: null, nextBonusPct: null, remaining: 0, pct: 100 }
  return {
    current: current.name,
    next: next.name,
    nextBonusPct: next.bonusPct,
    remaining: next.minValidated - validated,
    pct: Math.round((validated / next.minValidated) * 100),
  }
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run components/agent/display-rules.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add components/agent/map-projection.ts components/agent/tracker-rule.ts components/agent/level-rule.ts components/agent/display-rules.test.ts
git commit -m "feat(agent-app): map projection, payout tracker and level progress rules"
```

### Task 58: Onglets et liste des missions (carte / liste)

**Files:**
- Create: `app/agent/(tabs)/layout.tsx`, `app/agent/(tabs)/missions/page.tsx`, `components/agent/missions-view.tsx`

- [ ] **Step 1: Écrire le layout des onglets (`app/agent/(tabs)/layout.tsx`)**

```tsx
import { TabBar } from '@/components/agent/tab-bar'
import { requireAgentIn } from '@/lib/agent-guard'

// Les quatre onglets sont réservés aux agents ACTIVE ; les autres sont renvoyés vers leur étape.
export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  await requireAgentIn(['ACTIVE'])
  return (
    <>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <TabBar />
    </>
  )
}
```

- [ ] **Step 2: Écrire la vue carte/liste (`components/agent/missions-view.tsx`)**

```tsx
'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import { MissionCard } from '@/components/mc/mission-card'
import { maxPerBusiness, usd, type PayAmounts } from '@/components/mc/money'
import { projectToMap } from './map-projection'

export interface MissionItem {
  id: string
  trade: string
  city: string
  state: string
  distanceMiles: number
  slotLabel: string
  approx: { lat: number; lng: number }
  urgencyBonusCents: number
}

export function MissionsView({ items, me, radiusMiles, zip, amounts }: {
  items: MissionItem[]
  me: { lat: number; lng: number }
  radiusMiles: number
  zip: string
  amounts: PayAmounts
}) {
  const [view, setView] = useState<'map' | 'list'>('list')
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null)
  const reach = Math.max(radiusMiles, ...items.map((m) => m.distanceMiles))
  const pins = useMemo(
    () => items.map((m) => {
      const p = projectToMap(me, m.approx, reach)
      return { id: m.id, x: p.x, y: p.y, tag: m.urgencyBonusCents > 0 ? 'Bonus' : usd(maxPerBusiness(amounts, m.urgencyBonusCents)), bonus: m.urgencyBonusCents > 0, label: `${m.trade}, ${m.distanceMiles} mi` }
    }),
    [items, me, reach, amounts],
  )
  const current = items.find((m) => m.id === selected)

  const card = (m: MissionItem) => (
    <MissionCard
      key={m.id}
      href={`/agent/missions/${m.id}`}
      trade={m.trade}
      title={m.trade}
      city={`${m.city}, ${m.state}`}
      distance={`${m.distanceMiles} mi`}
      slot={m.slotLabel}
      bonusCents={m.urgencyBonusCents}
      amounts={amounts}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ padding: '4px 16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="mc-between">
          <h1 className="h2">Missions near you</h1>
          <span className="mc-badge mc-badge--outline" style={{ height: 36 }}><Icon name="pin" /> {zip} · {radiusMiles} mi</span>
        </div>
        <div className="mc-seg" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><Icon name="map" className="mc-ico--sm" /> Map</button>
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Icon name="list" className="mc-ico--sm" /> List</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mc-empty">
          <div className="mc-empty__art"><MapMotif seed={7} cols={4} rows={3} gap={3} water={false} height={112} pins={[{ x: 55, y: 55, state: 'muted', label: 'No mission' }]} /></div>
          <h3>No missions within {radiusMiles} miles right now</h3>
          <p>New missions are posted as our team books visits. We’ll text you when one opens near you.</p>
        </div>
      ) : view === 'map' ? (
        <div style={{ position: 'relative', flex: 1, minHeight: 420 }}>
          <MapMotif
            seed={33} cols={5} rows={7} gap={2.6} label="Missions map (approximate positions)"
            style={{ position: 'absolute', inset: 0, borderRadius: 0 }}
            you={[50, 50]}
            pins={pins.map(({ id, ...p }) => ({ ...p, selected: id === selected, onClick: () => setSelected(id) }))}
          />
          {current && (
            <div className="mc-sheet" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5 }}>
              {card(current)}
              <Link href={`/agent/missions/${current.id}`} className="mc-btn mc-btn--primary mc-btn--block" style={{ marginTop: 12 }}>View mission</Link>
            </div>
          )}
        </div>
      ) : (
        <div className="mc-scroll" style={{ paddingTop: 4 }}>
          <p className="body-s mc-muted" style={{ marginBottom: 12 }}>{items.length} mission{items.length > 1 ? 's' : ''} within {radiusMiles} mi · sorted by distance</p>
          <div className="mc-stack">{items.map(card)}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Écrire la page (`app/agent/(tabs)/missions/page.tsx`)**

```tsx
import { requireAgentIn } from '@/lib/agent-guard'
import { listOpenMissionsFor } from '@/modules/missions'
import { getSettings } from '@/modules/settings'
import { MissionsView } from '@/components/agent/missions-view'

export default async function MissionsPage() {
  const agent = await requireAgentIn(['ACTIVE'])
  const [items, settings] = await Promise.all([listOpenMissionsFor(agent), getSettings()])
  const a = settings.tierAmountsCents
  return (
    <MissionsView
      items={items}
      me={{ lat: agent.lat, lng: agent.lng }}
      radiusMiles={agent.radiusMiles}
      zip={agent.zip}
      amounts={{ VISIT: a.VISIT, LIVE: a.LIVE, CLIENT: a.CLIENT }}
    />
  )
}
```

- [ ] **Step 4: Vérifier dans le navigateur**

Avec `scripts/seed-dev.ts` (chunks du back-office : agent ACTIVE, missions ouvertes près de lui), se connecter puis ouvrir `/agent/missions` à 390 px.
Expected :
- la liste montre les cartes de mission (métier, ville, distance, créneau, décomposition « $40 visit + $25 live + $50 if customer », « up to $115 »), sans nom ni adresse de pro ;
- « Map » affiche le motif de quartier, l'agent au centre et un pin par mission, avec le badge « Bonus » s'il y a un bonus ;
- toucher un pin change la carte du bas ;
- sans mission, l'état vide s'affiche ;
- la barre d'onglets du bas souligne « Missions ».

- [ ] **Step 5: Commit**

```bash
git add "app/agent/(tabs)" components/agent/missions-view.tsx
git commit -m "feat(agent-app): missions tab with map/list toggle"
```

### Task 59: Détail d'une mission, acceptation, désistement, suivi

**Files:**
- Create: `app/agent/missions/[id]/page.tsx`, `app/agent/missions/[id]/actions.ts`, `components/agent/payout-tracker.tsx`

- [ ] **Step 1: Écrire les actions (`app/agent/missions/[id]/actions.ts`)**

```ts
'use server'
import { redirect } from 'next/navigation'
import { requireAgent } from '@/lib/session'
import { acceptMission, releaseMission } from '@/modules/missions'

// Les refus (mission prise, limite de 3, moins de 24 h) reviennent sur la page via ?error=, affiché en toast.
export async function accept(missionId: string): Promise<void> {
  const agent = await requireAgent()
  const r = await acceptMission(missionId, agent)
  redirect(r.ok ? `/agent/missions/${missionId}?accepted=1` : `/agent/missions/${missionId}?error=${encodeURIComponent(r.error)}`)
}

export async function release(missionId: string): Promise<void> {
  const agent = await requireAgent()
  const r = await releaseMission(missionId, agent)
  redirect(r.ok ? '/agent/visits?released=1' : `/agent/missions/${missionId}?error=${encodeURIComponent(r.error)}`)
}
```

- [ ] **Step 2: Écrire le suivi des paiements (`components/agent/payout-tracker.tsx`)**

```tsx
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import type { TrackStep } from './tracker-rule'

const LABELS = {
  VISIT: ['Visit validated', 'Our team is reviewing your checklist.', 'Validated · added to your balance.'],
  LIVE: ['Profile live', 'Waiting for the owner to finish verification. We check every day.', 'Live · added to your balance.'],
  CLIENT: ['Became customer', 'Only if the owner decides to sign up.', 'Signed up · added to your balance.'],
  RETURN_VISIT: ['Return visit validated', 'Our team is reviewing your checklist.', 'Validated · added to your balance.'],
  URGENCY: ['Mission bonus', '', 'Added to your balance.'],
} as const

export function PayoutTracker({ steps }: { steps: TrackStep[] }) {
  return (
    <ol className="mc-track">
      {steps.map((s) => {
        const [title, waitingText, doneText] = LABELS[s.tier]
        return (
          <li key={s.tier} className="mc-track__item" data-state={s.state}>
            <span className="mc-track__dot"><Icon name={s.state === 'done' ? 'check' : 'clock'} /></span>
            <div>
              <b>{title}</b>
              <p className="body-s mc-muted" style={{ marginTop: 2 }}>{s.state === 'done' ? doneText : waitingText}</p>
              <div style={{ marginTop: 8 }}>
                {s.state === 'done' && <span className="mc-badge mc-badge--success"><Icon name="check" /> Earned</span>}
                {s.state === 'pending' && <span className="mc-badge mc-badge--pending"><Icon name="clock" /> Pending</span>}
                {s.state === 'waiting' && <span className="mc-badge mc-badge--outline">Waiting</span>}
              </div>
            </div>
            <span className="mc-track__amt">{s.tier === 'VISIT' || s.tier === 'RETURN_VISIT' ? '' : '+'}{usd(s.amountCents, { cents: true })}</span>
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 3: Écrire la page (`app/agent/missions/[id]/page.tsx`)**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AppBar } from '@/components/agent/app-bar'
import { PayoutTracker } from '@/components/agent/payout-tracker'
import { trackerSteps } from '@/components/agent/tracker-rule'
import { Icon } from '@/components/mc/icons'
import { MapMotif } from '@/components/mc/map-motif'
import { LEVEL_LABEL, usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { prisma } from '@/lib/prisma'
import { getMissionForAgent } from '@/modules/missions'
import { getSettings } from '@/modules/settings'
import { accept, release } from './actions'

export default async function MissionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ accepted?: string; error?: string }> }) {
  const agent = await requireAgentIn(['ACTIVE', 'SUSPENDED'])
  const { id } = await params
  const { accepted, error } = await searchParams
  const d = await getMissionForAgent(id, agent)
  if (!d) notFound()
  const s = d.summary
  const status = s.status
  const daytime = true // créneaux posés par l'équipe pendant les heures d'ouverture (badge de la maquette)
  const p = d.pay
  const afterSubmit = d.mine && ['SUBMITTED', 'VALIDATED', 'REJECTED'].includes(status)
  const earnings = afterSubmit ? await prisma.earning.findMany({ where: { missionId: id } }) : []
  const amounts = (await getSettings()).tierAmountsCents

  return (
    <>
      <div style={{ position: 'relative', flex: 'none' }}>
        <MapMotif seed={33} cols={5} rows={4} gap={2.8} height={200} water={false} style={{ borderRadius: 0 }} you={[26, 74]} route="M26 74 L26 62 L64 62 L64 50" pins={[{ x: 64, y: 50, selected: true, label: 'Mission location (approximate)' }]} />
        <div style={{ position: 'absolute', left: 8, top: 6, zIndex: 5 }}>
          <Link href={d.mine ? '/agent/visits' : '/agent/missions'} className="mc-iconbtn" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }} aria-label="Back"><Icon name="arrow-left" /></Link>
        </div>
      </div>
      {error && <p className="mc-error" role="alert" style={{ margin: '12px 16px 0' }}><Icon name="alert" className="mc-ico--sm" />{error}</p>}
      {accepted && <div className="mc-toast mc-toast--success" role="status"><span className="mc-toast__icon"><Icon name="check" /></span><span>Mission accepted. The owner got a text with your first name and time.</span></div>}
      <main className="mc-scroll" style={{ paddingTop: 20 }}>
        <div className="mc-row">
          {s.urgencyBonusCents > 0 && <span className="mc-badge mc-badge--bonus"><Icon name="flag" /> Bonus +{usd(s.urgencyBonusCents)}</span>}
          {daytime && <span className="mc-badge mc-badge--outline"><Icon name="sun" /> Daytime</span>}
          {d.mine && status === 'NEEDS_FIX' && <span className="mc-badge mc-badge--danger"><Icon name="alert" /> Needs a fix</span>}
        </div>
        <h1 className="h1" style={{ marginTop: 12 }}>{d.pro?.businessName ?? s.trade}</h1>
        <p className="mc-muted" style={{ marginTop: 4 }}>{s.trade} · {s.city}, {s.state} · {s.distanceMiles} mi</p>

        <div className="mc-card" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="mc-row" style={{ gap: 12 }}><Icon name="calendar" /><div><b>{s.slotLabel}</b><div className="body-s mc-muted">Plan for 45–60 minutes on site</div></div></div>
          <div className="mc-row" style={{ gap: 12 }}><Icon name="store" /><div><b>The owner agreed to this visit</b><div className="body-s mc-muted">Booked by our team on {new Date(d.bookedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. {d.pro ? '' : 'Exact address after you accept.'}</div></div></div>
          {d.pro && (
            <div className="mc-row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <Icon name="pin" />
              <div>
                <b>{d.pro.address}, {d.pro.city}, {d.pro.state} {d.pro.zip}</b>
                <div className="body-s mc-muted">{d.pro.contactName ?? 'Owner'} · <a className="mc-link" href={`tel:${d.pro.phone}`}>Call</a> · <a className="mc-link" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${d.pro.address}, ${d.pro.city}, ${d.pro.state} ${d.pro.zip}`)}`} target="_blank" rel="noreferrer">Directions</a></div>
              </div>
            </div>
          )}
        </div>

        {d.fixMessage && status === 'NEEDS_FIX' && (
          <div className="mc-card mc-card--sunk" style={{ marginTop: 12, display: 'flex', gap: 12 }} role="status"><Icon name="alert" /><p className="body-s"><b>What to fix:</b> {d.fixMessage}</p></div>
        )}

        {afterSubmit ? (
          <>
            <h2 className="h3" style={{ margin: '24px 0 16px' }}>Payout steps</h2>
            <PayoutTracker steps={trackerSteps({ type: s.type, status, earnings, amounts })} />
          </>
        ) : (
          <>
            <h2 className="h3" style={{ marginTop: 24 }}>What to expect</h2>
            <ul className="mc-stack" style={{ marginTop: 12, gap: 10 }}>
              {[...(d.claimExisting ? ['The business already shows on Google: help the owner claim it instead of creating a new one'] : ['Create a new profile (none exists yet)']), `Suggested category: ${d.suggestedCategory}`, ...d.instructions].map((t) => (
                <li key={t} className="mc-row" style={{ gap: 10, alignItems: 'flex-start' }}><span style={{ color: 'var(--ink-muted)' }}><Icon name="check" className="mc-ico--sm" /></span><span style={{ fontSize: 15 }}>{t}</span></li>
              ))}
            </ul>
            <h2 className="h3" style={{ marginTop: 24 }}>Your pay for this business</h2>
            <div className="mc-card" style={{ marginTop: 12 }}>
              <div className="mc-kv">
                {p.kind === 'RETURN_VISIT' ? (
                  <div><span className="k">Return visit validated</span><span className="v">{usd(p.returnVisitCents, { cents: true })}</span></div>
                ) : (
                  <>
                    <div><span className="k">Visit validated</span><span className="v">{usd(p.visitCents, { cents: true })}</span></div>
                    <div><span className="k">Profile goes live</span><span className="v">+{usd(p.liveCents, { cents: true })}</span></div>
                    <div><span className="k">If they become a customer</span><span className="v">+{usd(p.clientCents, { cents: true })}</span></div>
                  </>
                )}
                {p.urgencyCents > 0 && <div><span className="k">Mission bonus</span><span className="v">+{usd(p.urgencyCents, { cents: true })}</span></div>}
                {p.levelBonusCents > 0 && <div><span className="k"><span className={`mc-level mc-level--${p.levelName.toLowerCase()}`} style={{ height: 24 }}>{LEVEL_LABEL[p.levelName]} +{p.levelBonusPct}%</span></span><span className="v">+{usd(p.levelBonusCents, { cents: true })}</span></div>}
                <div><span className="k mc-kv__total">Up to</span><span className="v money">{usd(p.upToCents, { cents: true })}</span></div>
              </div>
              {p.kind === 'VISIT' && <p className="body-s mc-muted" style={{ marginTop: 8 }}>The last step depends on the owner’s decision. Your level bonus applies to the three payout steps.</p>}
            </div>
            <div className="mc-card mc-card--sunk" style={{ marginTop: 12, display: 'flex', gap: 12 }}>
              <Icon name="info" />
              <p className="body-s"><b>Cancel free up to 24 h before</b> — until {d.releaseDeadlineLabel}. After that, contact support.</p>
            </div>
          </>
        )}
      </main>
      <div className="mc-bottom">
        {!d.mine && status === 'OPEN' && agent.status === 'ACTIVE' && (
          <form action={async () => { 'use server'; await accept(id) }}>
            <button type="submit" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">Accept mission</button>
          </form>
        )}
        {d.mine && (status === 'ACCEPTED' || status === 'NEEDS_FIX') && (
          <Link href={`/agent/missions/${id}/visit`} className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block">{status === 'NEEDS_FIX' ? 'Fix your visit' : 'Start visit'}</Link>
        )}
        {d.canRelease && (
          <form action={async () => { 'use server'; await release(id) }}>
            <button type="submit" className="mc-btn mc-btn--ghost mc-btn--block">Release this mission</button>
          </form>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Vérifier dans le navigateur**

Avec le seed : ouvrir une mission depuis la liste.
Expected :
- avant d'accepter : pas de nom ni d'adresse, la décomposition de paie avec bonus et niveau, la règle des 24 h ;
- « Accept mission » mène au détail avec le toast « Mission accepted », le nom du pro, l'adresse, « Call » et « Directions », et le bouton « Start visit » ;
- la console serveur montre le SMS envoyé au pro ;
- « Release this mission » (créneau à plus de 24 h) renvoie vers l'onglet Visites ;
- une mission soumise affiche le suivi des 3 paliers.

- [ ] **Step 5: Commit**

```bash
git add "app/agent/missions/[id]/page.tsx" "app/agent/missions/[id]/actions.ts" components/agent/payout-tracker.tsx
git commit -m "feat(agent-app): mission detail, accept, release and payout tracker"
```

### Task 60: Onglets Visites, Gains et Profil

**Files:**
- Create: `app/agent/(tabs)/visits/page.tsx`, `app/agent/(tabs)/earnings/page.tsx`, `app/agent/(tabs)/profile/page.tsx`

- [ ] **Step 1: Écrire l'onglet Visites (`app/agent/(tabs)/visits/page.tsx`)**

```tsx
import Link from 'next/link'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { listAgentMissions } from '@/modules/missions'
import { getSettings } from '@/modules/settings'

const GROUPS = [
  { title: 'Upcoming', statuses: ['ACCEPTED'], badge: null },
  { title: 'Needs a fix', statuses: ['NEEDS_FIX'], badge: 'danger' },
  { title: 'In review', statuses: ['SUBMITTED'], badge: 'pending' },
  { title: 'Done', statuses: ['VALIDATED', 'REJECTED'], badge: null },
] as const

export default async function VisitsPage({ searchParams }: { searchParams: Promise<{ released?: string }> }) {
  const agent = await requireAgentIn(['ACTIVE'])
  const { released } = await searchParams
  const [missions, settings] = await Promise.all([listAgentMissions(agent), getSettings()])
  return (
    <>
      <AppBar title="Visits" large />
      {released && <div className="mc-toast" role="status"><span className="mc-toast__icon"><Icon name="check" /></span><span>Mission released. The owner was told by text.</span></div>}
      <main className="mc-scroll">
        {missions.length === 0 && (
          <div className="mc-empty">
            <h3>No visits yet</h3>
            <p>Accept a mission to see it here. Your first {usd(settings.tierAmountsCents.VISIT)} is earned once your first visit is validated.</p>
            <Link href="/agent/missions" className="mc-btn mc-btn--primary">Find a mission</Link>
          </div>
        )}
        {GROUPS.map((g) => {
          const list = missions.filter((m) => (g.statuses as readonly string[]).includes(m.status))
          if (list.length === 0) return null
          return (
            <section key={g.title} style={{ marginTop: 16 }}>
              <h2 className="h3" style={{ marginBottom: 8 }}>{g.title}</h2>
              <ul className="mc-list">
                {list.map((m) => (
                  <li key={m.id}>
                    <Link href={m.status === 'ACCEPTED' || m.status === 'NEEDS_FIX' ? `/agent/missions/${m.id}/visit` : `/agent/missions/${m.id}`} style={{ flex: 1, textDecoration: 'none' }}>
                      <div style={{ fontWeight: 600 }}>{m.businessName}</div>
                      <div className="body-s mc-muted">{m.city}, {m.state} · {m.slotLabel}</div>
                    </Link>
                    {m.status === 'REJECTED' ? <span className="mc-badge mc-badge--outline">Not validated</span> : m.earnedCents > 0 ? <span className="money">{usd(m.earnedCents, { cents: true })}</span> : g.badge === 'pending' ? <span className="mc-badge mc-badge--pending"><Icon name="clock" /> Pending</span> : g.badge === 'danger' ? <span className="mc-badge mc-badge--danger"><Icon name="alert" /> Fix</span> : <Icon name="chev-right" />}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </main>
    </>
  )
}
```

- [ ] **Step 2: Écrire l'onglet Gains (`app/agent/(tabs)/earnings/page.tsx`)**

Phase 1 : pas encore de virement (phase 2). La carte « Next payout » de la maquette est remplacée par une carte honnête : virements chaque vendredi via Stripe, à connecter avant le premier.

```tsx
import { AppBar } from '@/components/agent/app-bar'
import { levelProgress } from '@/components/agent/level-rule'
import { Icon } from '@/components/mc/icons'
import { LEVEL_LABEL, usd } from '@/components/mc/money'
import { requireAgentIn } from '@/lib/agent-guard'
import { prisma } from '@/lib/prisma'
import { balanceOf, listEarnings } from '@/modules/ledger'
import { getSettings } from '@/modules/settings'

const TIER_LABEL = { VISIT: 'Visit validated', LIVE: 'Profile live', CLIENT: 'Became customer', RETURN_VISIT: 'Return visit', URGENCY: 'Mission bonus' } as const

export default async function EarningsPage() {
  const agent = await requireAgentIn(['ACTIVE'])
  const [balance, earnings, settings, validated] = await Promise.all([
    balanceOf(agent.id),
    listEarnings(agent.id),
    getSettings(),
    prisma.mission.count({ where: { agentId: agent.id, status: 'VALIDATED' } }),
  ])
  const lp = levelProgress(validated, settings.levels)
  const payable = earnings.filter((e) => e.status === 'PAYABLE')
  return (
    <>
      <AppBar title="Earnings" large right={<span className={`mc-level mc-level--${lp.current.toLowerCase()}`}>{LEVEL_LABEL[lp.current]}</span>} />
      <main className="mc-scroll">
        <div className="mc-card mc-card--forest" style={{ padding: 20 }}>
          <p className="body-s" style={{ color: 'var(--on-forest-muted)' }}>Payable balance</p>
          <p className="money-xl" style={{ marginTop: 6 }}>{usd(balance, { cents: true })}</p>
          <p className="body-s" style={{ color: 'var(--on-forest-muted)', marginTop: 6 }}>{payable.length} validated payment{payable.length === 1 ? '' : 's'}</p>
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--paper)', color: 'var(--ink)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Icon name="calendar" />
            <div style={{ flex: 1 }}><b>Paid every Friday via Stripe</b><div className="body-s mc-muted">You’ll connect your bank before your first payout. Independent contractor, 18+.</div></div>
          </div>
        </div>
        <div className="mc-card" style={{ marginTop: 12 }}>
          {lp.next ? (
            <>
              <div className="mc-between"><b>{lp.remaining} more visit{lp.remaining === 1 ? '' : 's'} to {LEVEL_LABEL[lp.next]}</b><span className={`mc-level mc-level--${lp.next.toLowerCase()}`}>{LEVEL_LABEL[lp.next]}</span></div>
              <div className="mc-progress" style={{ marginTop: 12 }} role="progressbar" aria-label={`${validated} validated visits`} aria-valuenow={lp.pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${lp.pct}%` }} /></div>
              <div className="mc-between" style={{ marginTop: 8 }}><span className="body-s mc-muted mc-num">{validated} validated visit{validated === 1 ? '' : 's'}</span><span className="body-s mc-muted">+{lp.nextBonusPct}% on every payment</span></div>
            </>
          ) : (
            <b>You’re at the top level: +{settings.levels.find((l) => l.name === 'GOLD')?.bonusPct}% on every payment.</b>
          )}
        </div>
        <h2 className="h3" style={{ margin: '24px 0 8px' }}>History</h2>
        {earnings.length === 0 ? (
          <p className="mc-muted">Your first {usd(settings.tierAmountsCents.VISIT)} shows here once your first visit is validated.</p>
        ) : (
          <ul className="mc-list">
            {earnings.map((e) => (
              <li key={e.id}>
                <span className="mc-trade" style={{ width: 40, height: 40, background: e.status === 'VOID' ? 'var(--surface-sunk)' : 'var(--success-soft)', color: e.status === 'VOID' ? 'var(--ink-muted)' : 'var(--success)' }}><Icon name={e.status === 'VOID' ? 'x' : 'check'} /></span>
                <div style={{ flex: 1 }}>
                  <b>{TIER_LABEL[e.tier]}</b>
                  <div className="body-s mc-muted">{e.mission.pro.trade} · {e.mission.pro.city}, {e.mission.pro.state} · {e.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{e.status === 'VOID' ? ' · voided' : ''}</div>
                </div>
                <span className="money" style={e.status === 'VOID' ? { textDecoration: 'line-through', color: 'var(--ink-muted)' } : undefined}>{usd(e.amountCents, { cents: true })}</span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
```

- [ ] **Step 3: Écrire l'onglet Profil (`app/agent/(tabs)/profile/page.tsx`)**

```tsx
import Link from 'next/link'
import { AppBar } from '@/components/agent/app-bar'
import { Icon } from '@/components/mc/icons'
import { signOut } from '@/lib/auth'
import { requireAgentIn } from '@/lib/agent-guard'

export default async function ProfilePage() {
  const agent = await requireAgentIn(['ACTIVE'])
  async function logout() {
    'use server'
    await signOut({ redirectTo: '/' })
  }
  return (
    <>
      <AppBar title="Profile" large />
      <main className="mc-scroll">
        <div className="mc-card">
          <div className="mc-kv">
            <div><span className="k">Name</span><span className="v">{agent.firstName} {agent.lastName}</span></div>
            <div><span className="k">Mobile</span><span className="v">{agent.phone}</span></div>
            <div><span className="k">Home ZIP</span><span className="v">{agent.zip}</span></div>
            <div><span className="k">Travel radius</span><span className="v">{agent.radiusMiles} mi</span></div>
            <div><span className="k">Agreement</span><span className="v">Signed {agent.contractSignedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
          </div>
        </div>
        <ul className="mc-list" style={{ marginTop: 16 }}>
          <li><Icon name="cap" /><Link href="/agent/academy" style={{ flex: 1, textDecoration: 'none' }}>Review the lessons</Link><Icon name="chev-right" /></li>
          <li><Icon name="help" /><span style={{ flex: 1 }}>Need help? Text or email support from the address on our website.</span></li>
        </ul>
        <form action={logout} style={{ marginTop: 24 }}>
          <button type="submit" className="mc-btn mc-btn--secondary mc-btn--block">Log out</button>
        </form>
      </main>
    </>
  )
}
```

- [ ] **Step 4: Vérifier dans le navigateur**

Avec le seed (agent qui a une visite validée et une soumise) :
- Visites : les groupes « In review » et « Done » s'affichent, avec les montants gagnés ;
- Gains : le solde payable, la carte de niveau (« 4 more visits to Silver ») et l'historique avec les gains annulés barrés ;
- Profil : les informations de l'agent, et « Log out » ramène à la landing.

- [ ] **Step 5: Commit**

```bash
git add "app/agent/(tabs)/visits" "app/agent/(tabs)/earnings" "app/agent/(tabs)/profile"
git commit -m "feat(agent-app): visits, earnings and profile tabs"
```


## Chunk 17: Écrans agent — checklist de visite hors-ligne et test de bout en bout

Maquette : `design/mapcrew/components/AppVisitChecklist` (stepper vertical, panneau sous l'étape courante, indicateur de synchro, « Submit visit » désactivé avec le nombre d'étapes restantes, toast hors-ligne).

**Fonctionnement hors-ligne (spec §4.6).** Chaque action (une étape, une photo) devient une tâche dans une file d'attente gardée dans IndexedDB (`idb-keyval`), puis la file est envoyée dans l'ordre. Sans réseau, la tâche reste sur le téléphone, l'écran la montre comme faite (« saved on phone »), et l'envoi reprend au retour du réseau (événement `online`, et toutes les 30 s). La soumission, elle, exige le réseau et une file vide. Consigne de formation (module 2) : ouvrir la mission avant de partir. La page est alors déjà chargée et fonctionne même sans réseau sur place.

### Task 61: File d'attente hors-ligne (`components/agent/visit/outbox.ts`)

**Files:**
- Create: `components/agent/visit/outbox.ts`, `components/agent/visit/send.ts`
- Test: `components/agent/visit/outbox.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it, vi } from 'vitest'
import { Outbox, memoryStore, type Job, type SendResult } from './outbox'

const step = (id: string, s = 'checkin'): Job => ({ id, kind: 'step', missionId: 'm1', step: s, data: {} })

describe('Outbox', () => {
  it('envoie dans l’ordre et vide la file ; garde le dernier état renvoyé', async () => {
    const sent: string[] = []
    const box = new Outbox(memoryStore(), async (j) => { sent.push(j.id); return { ok: true, state: { last: j.id } } })
    await box.enqueue(step('a'))
    await box.enqueue(step('b'))
    expect(await box.flush()).toMatchObject({ sent: 2, state: { last: 'b' }, remaining: 0, stopped: null })
    expect(sent).toEqual(['a', 'b'])
  })

  it('s’arrête à la première erreur réseau et garde la suite pour plus tard', async () => {
    const box = new Outbox(memoryStore(), async (j): Promise<SendResult> => (j.id === 'b' ? { ok: false, retry: true, error: 'Network error' } : { ok: true, state: null }))
    for (const id of ['a', 'b', 'c']) await box.enqueue(step(id))
    expect(await box.flush()).toMatchObject({ sent: 1, remaining: 2, stopped: 'Network error' })
    expect((await box.pending()).map((j) => j.id)).toEqual(['b', 'c'])
  })

  it('abandonne une tâche refusée par le serveur (4xx) et continue', async () => {
    const box = new Outbox(memoryStore(), async (j): Promise<SendResult> => (j.id === 'a' ? { ok: false, retry: false, status: 409, error: 'Check in first.' } : { ok: true, state: 's' }))
    await box.enqueue(step('a', 'invite'))
    await box.enqueue(step('b'))
    const r = await box.flush()
    expect(r.rejected.map((x) => [x.job.id, x.error])).toEqual([['a', 'Check in first.']])
    expect(r).toMatchObject({ sent: 1, remaining: 0 })
  })

  it('deux flush simultanés n’envoient chaque tâche qu’une fois', async () => {
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: true, state: null }))
    const box = new Outbox(memoryStore(), send)
    await box.enqueue(step('a'))
    await Promise.all([box.flush(), box.flush()])
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('un ajout pendant la suppression d’une tâche envoyée n’est pas perdu (store lent)', async () => {
    let jobs: Job[] = []
    const slow = { load: async () => { await new Promise((r) => setTimeout(r, 5)); return [...jobs] }, save: async (n: Job[]) => { await new Promise((r) => setTimeout(r, 5)); jobs = [...n] } }
    const box = new Outbox(slow, async () => ({ ok: true, state: null }))
    await box.enqueue(step('a'))
    const flushing = box.flush()
    await box.enqueue(step('b'))
    await flushing
    await box.flush()
    expect(jobs).toEqual([])
  })

  it('une tâche ajoutée pendant l’envoi part dans le même passage', async () => {
    const store = memoryStore()
    let box: Outbox
    const send = vi.fn(async (j: Job): Promise<SendResult> => {
      if (j.id === 'a') await box.enqueue(step('b'))
      return { ok: true, state: null }
    })
    box = new Outbox(store, send)
    await box.enqueue(step('a'))
    expect((await box.flush()).sent).toBe(2)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run components/agent/visit/outbox.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Écrire `components/agent/visit/outbox.ts`**

```ts
import { get, set } from 'idb-keyval'

export type Job =
  | { id: string; kind: 'step'; missionId: string; step: string; data: unknown }
  | {
      id: string
      kind: 'photo'
      missionId: string
      blob: Blob
      category: string
      clientAt: string
      exifTakenAt: string | null
      exifLat: number | null
      exifLng: number | null
    }

export type SendResult = { ok: true; state: unknown } | { ok: false; retry: boolean; status?: number; error: string }
export type Sender = (job: Job) => Promise<SendResult>

export interface OutboxStore {
  load(): Promise<Job[]>
  save(jobs: Job[]): Promise<void>
}

export interface FlushResult {
  sent: number
  state: unknown | null // dernier état de visite renvoyé par le serveur
  rejected: { job: Job; error: string }[]
  stopped: string | null // erreur qui a interrompu l'envoi (réseau, serveur), ou null
  remaining: number
}

/** File d'attente persistante des actions de la checklist. Un seul envoi à la fois ; ordre conservé. */
export class Outbox {
  private running: Promise<FlushResult> | null = null
  private lock: Promise<unknown> = Promise.resolve()

  constructor(private store: OutboxStore, private send: Sender) {}

  /** Lecture-écriture de la file une à la fois : un ajout pendant un envoi ne perd ni ne double rien. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.lock.then(fn, fn)
    this.lock = next.catch(() => undefined)
    return next
  }

  pending(): Promise<Job[]> {
    return this.exclusive(() => this.store.load())
  }

  enqueue(job: Job): Promise<void> {
    return this.exclusive(async () => {
      await this.store.save([...(await this.store.load()), job])
    })
  }

  flush(): Promise<FlushResult> {
    this.running ??= this.run().finally(() => {
      this.running = null
    })
    return this.running
  }

  private drop(id: string) {
    return this.exclusive(async () => {
      await this.store.save((await this.store.load()).filter((j) => j.id !== id))
    })
  }

  private async run(): Promise<FlushResult> {
    let sent = 0
    let state: unknown | null = null
    let stopped: string | null = null
    const rejected: { job: Job; error: string }[] = []
    for (;;) {
      const job = (await this.pending())[0]
      if (!job) break
      const r = await this.send(job)
      if (r.ok) {
        sent++
        state = r.state
        await this.drop(job.id)
      } else if (r.retry) {
        stopped = r.error
        break
      } else {
        rejected.push({ job, error: r.error })
        await this.drop(job.id)
      }
    }
    return { sent, state, rejected, stopped, remaining: (await this.pending()).length }
  }
}

/** Stockage dans IndexedDB : survit à un rechargement de page ou à une coupure de batterie. */
export function idbStore(key = 'mapcrew-outbox-v1'): OutboxStore {
  return {
    load: async () => (await get<Job[]>(key)) ?? [],
    save: (jobs) => set(key, jobs),
  }
}

/** Stockage en mémoire (tests). */
export function memoryStore(): OutboxStore {
  let jobs: Job[] = []
  return {
    load: async () => [...jobs],
    save: async (next) => {
      jobs = [...next]
    },
  }
}
```

- [ ] **Step 4: Écrire `components/agent/visit/send.ts`**

```ts
import type { Job, SendResult } from './outbox'

export const SESSION_EXPIRED = 'SESSION_EXPIRED'

/** Envoie une tâche à l'API. Réseau coupé, 5xx ou session expirée (401) : on réessaiera. 4xx : refus définitif. */
export async function sendJob(job: Job): Promise<SendResult> {
  try {
    let res: Response
    if (job.kind === 'step') {
      res = await fetch(`/api/agent/missions/${job.missionId}/steps`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ step: job.step, data: job.data }),
      })
    } else {
      const f = new FormData()
      f.set('file', job.blob, 'photo.jpg')
      f.set('category', job.category)
      f.set('clientAt', job.clientAt)
      if (job.exifTakenAt) f.set('exifTakenAt', job.exifTakenAt)
      if (job.exifLat != null) f.set('exifLat', String(job.exifLat))
      if (job.exifLng != null) f.set('exifLng', String(job.exifLng))
      res = await fetch(`/api/agent/missions/${job.missionId}/photos`, { method: 'POST', body: f })
    }
    const body = (await res.json().catch(() => ({}))) as { state?: unknown; error?: string }
    if (res.ok) return { ok: true, state: body.state ?? null }
    if (res.status === 401) return { ok: false, retry: true, status: 401, error: SESSION_EXPIRED }
    const retry = res.status >= 500
    return { ok: false, retry, status: res.status, error: body.error ?? (retry ? 'Server unavailable' : 'Rejected') }
  } catch {
    return { ok: false, retry: true, error: 'Network error' }
  }
}
```

- [ ] **Step 5: Lancer le test**

Run: `npx vitest run components/agent/visit/outbox.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add components/agent/visit/outbox.ts components/agent/visit/send.ts components/agent/visit/outbox.test.ts
git commit -m "feat(agent-app): persistent offline outbox for visit actions"
```

### Task 62: Accès au téléphone (position, EXIF, compression, signature)

**Files:**
- Create: `components/agent/visit/device.ts`, `components/agent/visit/signature-pad.tsx`

- [ ] **Step 1: Écrire `components/agent/visit/device.ts`**

```ts
import exifr from 'exifr'

export interface Position { lat: number; lng: number; accuracy: number }

/** Position GPS précise, avec des messages d'aide clairs en cas de refus ou d'échec. */
export function getPosition(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This browser can’t share your location. Try Chrome or Safari.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) =>
        reject(new Error(e.code === e.PERMISSION_DENIED
          ? 'Location is turned off for this site. Allow location in your browser settings, then tap Check in again.'
          : 'We couldn’t get your location. Step outside or near a window and try again.')),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    )
  })
}

/** Date de prise de vue et GPS de la photo d'origine (la compression les efface : on les lit avant). */
export async function readExif(file: File): Promise<{ takenAt: string | null; lat: number | null; lng: number | null }> {
  const [meta, gps] = await Promise.all([
    exifr.parse(file, ['DateTimeOriginal']).catch(() => null) as Promise<{ DateTimeOriginal?: Date } | null>,
    exifr.gps(file).catch(() => null) as Promise<{ latitude?: number; longitude?: number } | null>,
  ])
  const d = meta?.DateTimeOriginal instanceof Date && !Number.isNaN(meta.DateTimeOriginal.getTime()) ? meta.DateTimeOriginal : null
  return { takenAt: d ? d.toISOString() : null, lat: gps?.latitude ?? null, lng: gps?.longitude ?? null }
}

/** Réduit la photo (1600 px de côté au plus) et la réencode en JPEG : ≈ 300 Ko au lieu de 4 Mo. */
export async function compressToJpeg(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process this photo.'))), 'image/jpeg', quality))
}
```

- [ ] **Step 2: Écrire `components/agent/visit/signature-pad.tsx`**

```tsx
'use client'
import { useEffect, useRef } from 'react'

/** Zone de signature au doigt. Renvoie un PNG (data URL) après chaque trait, ou null après « Clear ». */
export function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const inked = useRef(false)

  useEffect(() => {
    const c = ref.current!
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = getComputedStyle(c).getPropertyValue('--ink').trim() || '#17201c'
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const ctx = () => ref.current!.getContext('2d')!

  return (
    <div className="mc-stack" style={{ gap: 8 }}>
      <canvas
        ref={ref}
        role="img"
        aria-label="Signature area: the owner signs here with a finger"
        style={{ width: '100%', height: 180, touchAction: 'none', background: 'var(--surface)', borderRadius: 'var(--radius-md)', boxShadow: 'inset 0 0 0 1.5px var(--line-strong)' }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drawing.current = true
          const p = point(e)
          ctx().beginPath()
          ctx().moveTo(p.x, p.y)
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return
          const p = point(e)
          ctx().lineTo(p.x, p.y)
          ctx().stroke()
          inked.current = true
        }}
        onPointerUp={() => {
          drawing.current = false
          if (inked.current) onChange(ref.current!.toDataURL('image/png'))
        }}
      />
      <button
        type="button"
        className="mc-btn mc-btn--ghost mc-btn--sm"
        style={{ alignSelf: 'flex-start', padding: 0 }}
        onClick={() => {
          const c = ref.current!
          ctx().clearRect(0, 0, c.width, c.height)
          inked.current = false
          onChange(null)
        }}
      >
        Clear signature
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Vérifier et commit**

Run: `npx tsc --noEmit`
Expected: aucune erreur (`exifr` fournit ses types).

```bash
git add components/agent/visit/device.ts components/agent/visit/signature-pad.tsx
git commit -m "feat(agent-app): geolocation, EXIF, photo compression and signature pad"
```

### Task 63: Écran de la checklist (`/agent/missions/[id]/visit`)

**Files:**
- Create: `components/agent/visit/panels.tsx`, `components/agent/visit/photo-step.tsx`, `components/agent/visit/visit-client.tsx`, `app/agent/missions/[id]/visit/page.tsx`

- [ ] **Step 1: Écrire les panneaux d'étape (`components/agent/visit/panels.tsx`)**

```tsx
'use client'
import { useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { SignaturePad } from './signature-pad'

const now = () => new Date().toISOString()
type Save = (data: Record<string, unknown>) => Promise<void>

export function CheckinPanel({ onSave, locate }: { onSave: Save; locate: () => Promise<{ lat: number; lng: number; accuracy: number }> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <p className="body-s">Tap when you’re at the business. We record your location once, to confirm the visit.</p>
      {error && <p className="mc-error" role="alert" style={{ marginTop: 8 }}><Icon name="alert" className="mc-ico--sm" />{error}</p>}
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ marginTop: 12 }} disabled={busy} onClick={async () => {
        setBusy(true); setError(null)
        try { await onSave({ ...(await locate()), clientAt: now() }) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
      }}>
        <Icon name="check-in" className="mc-ico--sm" /> {busy ? 'Locating…' : 'Check in here'}
      </button>
    </>
  )
}

export function ConsentPanel({ text, version, defaultName, onSave }: { text: string[]; version: string; defaultName: string; onSave: Save }) {
  const [name, setName] = useState(defaultName)
  const [png, setPng] = useState<string | null>(null)
  return (
    <>
      <p className="body-s" style={{ fontWeight: 600 }}>Hand your phone to the owner. They read and sign:</p>
      <ul style={{ margin: '8px 0 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {text.map((t) => <li key={t} className="body-s">• {t}</li>)}
      </ul>
      <div className="mc-field">
        <label className="mc-label" htmlFor="signer">Owner’s full name</label>
        <input className="mc-input" id="signer" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginTop: 12 }}><SignaturePad onChange={setPng} /></div>
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ marginTop: 8 }} disabled={!png || name.trim().length < 2}
        onClick={() => onSave({ signerName: name.trim(), textVersion: version, signaturePng: png, clientAt: now() })}>
        <Icon name="pen" className="mc-ico--sm" /> Save signature
      </button>
    </>
  )
}

export function ProfilePanel({ defaults, onSave }: { defaults: { listingName: string; category: string; city: string; zip: string; claim: boolean }; onSave: Save }) {
  const [v, setV] = useState({ ...defaults, mode: defaults.claim ? 'CLAIMED' : 'CREATED' })
  const field = (id: keyof typeof v, label: string, help?: string) => (
    <div className="mc-field">
      <label className="mc-label" htmlFor={`pf-${id}`}>{label}</label>
      <input className="mc-input" id={`pf-${id}`} value={String(v[id])} onChange={(e) => setV({ ...v, [id]: e.target.value })} />
      {help && <span className="mc-help">{help}</span>}
    </div>
  )
  return (
    <div className="mc-stack" style={{ gap: 16 }}>
      <p className="body-s">The owner types on their own phone, in their own Google account. Enter what they used.</p>
      <div className="mc-seg" role="group" aria-label="Profile">
        <button type="button" aria-pressed={v.mode === 'CREATED'} onClick={() => setV({ ...v, mode: 'CREATED' })}>Created new</button>
        <button type="button" aria-pressed={v.mode === 'CLAIMED'} onClick={() => setV({ ...v, mode: 'CLAIMED' })}>Claimed existing</button>
      </div>
      {field('listingName', 'Business name on the profile', 'The real name on their sign or license. No extra keywords.')}
      {field('category', 'Primary category')}
      {field('city', 'City')}
      {field('zip', 'ZIP code')}
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ alignSelf: 'flex-start' }}
        onClick={() => onSave({ listingName: v.listingName, category: v.category, city: v.city, zip: v.zip, mode: v.mode, clientAt: now() })}>
        <Icon name="store" className="mc-ico--sm" /> Save profile details
      </button>
    </div>
  )
}

export function InvitePanel({ email, onSave }: { email: string; onSave: Save }) {
  return (
    <>
      <p className="body-s">Ask the owner to add <b>{email}</b> as a manager in their profile settings, so we can confirm it goes live. They can remove it anytime.</p>
      <div className="mc-stack" style={{ marginTop: 12, gap: 8 }}>
        <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" onClick={() => onSave({ result: 'INVITE_SENT', clientAt: now() })}><Icon name="check" className="mc-ico--sm" /> Owner sent the invite</button>
        <button type="button" className="mc-btn mc-btn--ghost mc-btn--sm" onClick={() => onSave({ result: 'INVITE_NOT_ALLOWED_YET', clientAt: now() })}>Google doesn’t offer this yet</button>
      </div>
    </>
  )
}

export function VerificationPanel({ onSave }: { onSave: Save }) {
  const [result, setResult] = useState<'VIDEO_DONE' | 'VIDEO_NOT_OFFERED' | 'OTHER_METHOD_STARTED' | null>(null)
  const [method, setMethod] = useState('')
  const options = [
    ['VIDEO_DONE', 'Video verification done', 'The owner recorded it from their own account.'],
    ['VIDEO_NOT_OFFERED', 'Not offered yet', 'Normal: Google may offer it later.'],
    ['OTHER_METHOD_STARTED', 'Another method started', 'Postcard, phone or email.'],
  ] as const
  return (
    <div className="mc-stack" role="radiogroup" aria-label="Verification" style={{ gap: 8 }}>
      {options.map(([value, title, hint]) => (
        <label key={value} className="mc-card mc-card--flat mc-check" style={{ padding: 12, ...(result === value ? { boxShadow: 'inset 0 0 0 2px var(--ink)' } : {}) }}>
          <input type="radio" name="verification" checked={result === value} onChange={() => setResult(value)} />
          <span><b>{title}</b><br /><span className="body-s mc-muted">{hint}</span></span>
        </label>
      ))}
      {result === 'OTHER_METHOD_STARTED' && (
        <div className="mc-field"><label className="mc-label" htmlFor="vm">Which method?</label><input className="mc-input" id="vm" value={method} onChange={(e) => setMethod(e.target.value)} /></div>
      )}
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ alignSelf: 'flex-start' }}
        disabled={!result || (result === 'OTHER_METHOD_STARTED' && method.trim().length < 2)}
        onClick={() => onSave({ result, ...(result === 'OTHER_METHOD_STARTED' ? { method: method.trim() } : {}), clientAt: now() })}>
        <Icon name="video" className="mc-ico--sm" /> Save verification
      </button>
    </div>
  )
}

export function CheckoutPanel({ onSave }: { onSave: Save }) {
  return (
    <>
      <p className="body-s">Before you leave: thank the owner and tell them they’ll get a short text about today’s visit.</p>
      <button type="button" className="mc-btn mc-btn--dark mc-btn--sm" style={{ marginTop: 12 }} onClick={() => onSave({ clientAt: now() })}>
        <Icon name="check-out" className="mc-ico--sm" /> Check out now
      </button>
    </>
  )
}
```

- [ ] **Step 2: Écrire l'étape photos (`components/agent/visit/photo-step.tsx`)**

```tsx
'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@/components/mc/icons'

export const PHOTO_CATEGORIES = [
  { value: 'LOGO', label: 'Logo', target: 1 },
  { value: 'VEHICLE', label: 'Truck', target: 2 },
  { value: 'TEAM', label: 'Team', target: 2 },
  { value: 'EQUIPMENT', label: 'Equipment', target: 3 },
  { value: 'JOB', label: 'Past jobs', target: 4 },
] as const

type Uploaded = { id: string; category: string; url: string }
type Pending = { id: string; category: string; blob: Blob }

export function PhotoStep({ uploaded, pending, min, max, editable, onAdd, onDelete }: {
  uploaded: Uploaded[]
  pending: Pending[]
  min: number
  max: number
  editable: boolean
  onAdd: (files: File[], category: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [category, setCategory] = useState<string>('LOGO')
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const total = uploaded.length + pending.length
  const pendingUrls = useMemo(() => pending.map((p) => ({ ...p, url: URL.createObjectURL(p.blob) })), [pending])
  useEffect(() => () => pendingUrls.forEach((p) => URL.revokeObjectURL(p.url)), [pendingUrls])
  const count = (c: string) => uploaded.filter((p) => p.category === c).length + pending.filter((p) => p.category === c).length
  const label = (c: string) => PHOTO_CATEGORIES.find((x) => x.value === c)?.label ?? c

  return (
    <>
      <div className="mc-between"><b className="mc-num">{total} of {min} minimum</b><span className="body-s mc-muted">up to {max}</span></div>
      <div className="mc-progress" style={{ marginTop: 8 }}><span style={{ width: `${Math.min(100, (total / min) * 100)}%` }} /></div>
      <div className="mc-chips" role="radiogroup" aria-label="Photo category" style={{ marginTop: 12 }}>
        {PHOTO_CATEGORIES.map((c) => (
          <button key={c.value} type="button" className="mc-chip" role="radio" aria-checked={category === c.value} onClick={() => setCategory(c.value)}>
            {count(c.value) >= c.target && <Icon name="check" className="mc-ico--sm" />} {c.label} <span className="mc-num">{count(c.value)}/{c.target}</span>
          </button>
        ))}
      </div>
      <div className="mc-slots" style={{ marginTop: 12 }}>
        {uploaded.map((p) => (
          <div key={p.id} className="mc-slot" data-filled role="img" aria-label={`${label(p.category)} photo`} style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover' }}>
            <span className="mc-slot__lbl">{label(p.category)}</span>
            {editable && <button type="button" className="mc-iconbtn" aria-label="Delete photo" style={{ position: 'absolute', left: 2, top: 2, background: 'var(--surface)' }} onClick={() => onDelete(p.id)}><Icon name="x" className="mc-ico--sm" /></button>}
          </div>
        ))}
        {pendingUrls.map((p) => (
          <div key={p.id} className="mc-slot" role="img" aria-label={`${label(p.category)} photo saved on phone`} style={{ backgroundImage: `url(${p.url})`, backgroundSize: 'cover' }}>
            <span className="mc-slot__lbl">On phone</span>
          </div>
        ))}
        {editable && total < max && (
          <button type="button" className="mc-slot mc-slot--add" disabled={busy} onClick={() => input.current?.click()}>
            <Icon name="camera" className="mc-ico--lg" />{busy ? 'Saving…' : label(category)}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" multiple hidden onChange={async (e) => {
        const files = Array.from(e.target.files ?? []).slice(0, max - total)
        e.target.value = ''
        if (!files.length) return
        setBusy(true)
        try { await onAdd(files, category) } finally { setBusy(false) }
      }} />
      <div className="mc-card mc-card--sunk" style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <Icon name="info" />
        <p className="body-s">Shoot in daylight, landscape. Ask before photographing anyone, and skip customers’ homes or house numbers.</p>
      </div>
    </>
  )
}
```

- [ ] **Step 3: Écrire l'écran (`components/agent/visit/visit-client.tsx`)**

```tsx
'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Icon } from '@/components/mc/icons'
import { STEPS_BY_TYPE, type StepName } from '@/modules/missions/checklist-rule'
import type { VisitState } from '@/modules/missions/visit'
import { compressToJpeg, getPosition, readExif } from './device'
import { Outbox, idbStore, type Job } from './outbox'
import { CheckinPanel, CheckoutPanel, ConsentPanel, InvitePanel, ProfilePanel, VerificationPanel } from './panels'
import { PhotoStep } from './photo-step'
import { SESSION_EXPIRED, sendJob } from './send'

const META: Record<StepName, { title: string; meta: string }> = {
  checkin: { title: 'Check in', meta: 'Tap when you arrive' },
  consent: { title: 'Consent signature', meta: 'Signed by the owner' },
  profile: { title: 'Profile setup', meta: 'Created on the owner’s phone' },
  invite: { title: 'Manager invite', meta: 'Owner adds us as a manager' },
  photos: { title: 'Photos', meta: 'Logo, truck, team, equipment, past jobs' },
  verification: { title: 'Verification', meta: 'Video verification, if offered' },
  checkout: { title: 'Check out', meta: 'Confirm you’re leaving' },
}

export function VisitClient({ initial, defaults }: {
  initial: VisitState
  defaults: { contactName: string; city: string; zip: string; category: string }
}) {
  const router = useRouter()
  const missionId = initial.missionId
  const [state, setState] = useState(initial)
  const [queue, setQueue] = useState<Job[]>([])
  const [online, setOnline] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const outbox = useMemo(() => new Outbox(idbStore(), sendJob), [])

  const refreshQueue = useCallback(async () => setQueue((await outbox.pending()).filter((j) => j.missionId === missionId)), [outbox, missionId])
  const flush = useCallback(async () => {
    setSyncing(true)
    const r = await outbox.flush()
    // La file est commune à toutes les missions : on n'affiche que l'état de CELLE-CI.
    if (r.state && (r.state as VisitState).missionId === missionId) setState(r.state as VisitState)
    if (r.rejected.length) setError(r.rejected.map((x) => x.error).join(' '))
    else if (r.stopped === SESSION_EXPIRED) setError('Your session expired. Log in again to upload your visit — everything is saved on this phone.')
    else if (r.stopped && navigator.onLine) setError(`Not uploaded yet (${r.stopped}). We’ll retry automatically.`)
    await refreshQueue()
    setSyncing(false)
  }, [outbox, refreshQueue, missionId])

  useEffect(() => {
    setOnline(navigator.onLine)
    void refreshQueue().then(flush)
    const on = () => { setOnline(true); void flush() }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const timer = window.setInterval(() => void flush(), 30_000)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); window.clearInterval(timer) }
  }, [flush, refreshQueue])

  async function add(job: Job) {
    setError(null)
    await outbox.enqueue(job)
    await refreshQueue()
    if (navigator.onLine) await flush()
    else setNotice('You’re offline. This is saved on your phone and will upload when you reconnect.')
  }
  const saveStep = (step: string) => (data: Record<string, unknown>) => add({ id: crypto.randomUUID(), kind: 'step', missionId, step, data })

  async function addPhotos(files: File[], category: string) {
    for (const file of files) {
      const exif = await readExif(file)
      const blob = await compressToJpeg(file)
      await outbox.enqueue({ id: crypto.randomUUID(), kind: 'photo', missionId, blob, category, clientAt: new Date().toISOString(), exifTakenAt: exif.takenAt, exifLat: exif.lat, exifLng: exif.lng })
    }
    await refreshQueue()
    if (navigator.onLine) await flush()
    else setNotice(`You’re offline. ${files.length} photo${files.length > 1 ? 's are' : ' is'} saved on this phone and will upload when you reconnect.`)
  }

  async function deletePhoto(id: string) {
    const res = await fetch(`/api/agent/missions/${missionId}/photos/${id}`, { method: 'DELETE' })
    const body = await res.json().catch(() => ({}))
    if (res.ok) setState(body.state)
    else setError(body.error ?? 'Could not delete this photo. Check your connection.')
  }

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/agent/missions/${missionId}/submit`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) return router.push(`/agent/missions/${missionId}`)
      setError(body.error ?? 'Could not submit. Try again.')
    } catch {
      setError('You’re offline. Submit when you’re back online.')
    } finally {
      setSubmitting(false)
    }
  }

  const steps = STEPS_BY_TYPE[state.type]
  const pendingSteps = new Set(queue.flatMap((j) => (j.kind === 'step' ? [j.step] : [])))
  const pendingPhotos = queue.flatMap((j) => (j.kind === 'photo' ? [{ id: j.id, category: j.category, blob: j.blob }] : []))
  const isDone = (s: StepName) => (s === 'photos' ? state.photos.length + pendingPhotos.length >= state.minPhotos : !!state.steps[s as Exclude<StepName, 'photos'>] || pendingSteps.has(s))
  const doneCount = steps.filter(isDone).length
  const current = steps.find((s) => !isDone(s) && state.editable.includes(s)) ?? null
  const [open, setOpen] = useState<StepName | null>(current)
  useEffect(() => setOpen((o) => (o && !isDone(o) ? o : current)), [current]) // eslint-disable-line react-hooks/exhaustive-deps

  const remaining = steps.length - doneCount
  const canSubmit = state.missing.length === 0 && queue.length === 0 && online
  const sync = !online && queue.length > 0
    ? <span className="mc-sync mc-sync--offline"><Icon name="wifi-off" className="mc-ico--sm" /> Offline · saved</span>
    : syncing || queue.length > 0
      ? <span className="mc-sync mc-sync--syncing"><Icon name="refresh" className="mc-ico--sm" /> Syncing</span>
      : <span className="mc-sync"><Icon name="cloud-check" className="mc-ico--sm" /> Synced</span>

  const panel = (s: StepName) => {
    switch (s) {
      case 'checkin': return <CheckinPanel onSave={saveStep('checkin')} locate={getPosition} />
      case 'consent': return <ConsentPanel text={state.consent.text} version={state.consent.version} defaultName={defaults.contactName} onSave={saveStep('consent')} />
      case 'profile': return <ProfilePanel defaults={{ listingName: state.businessName, category: defaults.category, city: defaults.city, zip: defaults.zip, claim: state.claimExisting }} onSave={saveStep('profile')} />
      case 'invite': return <InvitePanel email={state.managerEmail} onSave={saveStep('invite')} />
      case 'photos': return <PhotoStep uploaded={state.photos} pending={pendingPhotos} min={state.minPhotos} max={state.maxPhotos} editable={state.editable.includes('photos')} onAdd={addPhotos} onDelete={deletePhoto} />
      case 'verification': return <VerificationPanel onSave={saveStep('verification')} />
      case 'checkout': return <CheckoutPanel onSave={saveStep('checkout')} />
    }
  }

  return (
    <>
      <header className="mc-appbar">
        <Link href={`/agent/missions/${missionId}`} className="mc-iconbtn" aria-label="Back"><Icon name="arrow-left" /></Link>
        <span className="mc-appbar__title">Visit in progress</span>
        <span style={{ marginRight: 8 }}>{sync}</span>
      </header>
      <div style={{ padding: '0 16px 12px' }}>
        <div className="mc-between"><span className="body-s mc-muted">{state.businessName}</span><span className="body-s mc-num"><b>{doneCount}</b> of {steps.length}</span></div>
        <div className="mc-progress" style={{ marginTop: 8 }} role="progressbar" aria-label={`${doneCount} of ${steps.length} steps done`} aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length}><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      </div>
      {state.fixMessage && state.status === 'NEEDS_FIX' && (
        <div className="mc-card mc-card--sunk" style={{ margin: '0 16px 12px', display: 'flex', gap: 12 }} role="status"><Icon name="alert" /><p className="body-s"><b>What to fix:</b> {state.fixMessage}</p></div>
      )}
      <main className="mc-scroll">
        <div className="mc-stepper">
          {steps.map((s, i) => {
            const done = isDone(s)
            const editable = state.editable.includes(s)
            const st = done ? 'done' : s === current ? 'current' : 'todo'
            return (
              <div key={s}>
                <button type="button" className="mc-step" data-state={st} aria-expanded={open === s} disabled={!editable && !done} onClick={() => setOpen(open === s ? null : s)}>
                  <span className="mc-step__dot">{done ? <Icon name="check" className="mc-ico--sm" /> : i + 1}</span>
                  <span><span className="mc-step__title">{META[s].title}</span><br /><span className="mc-step__meta">{pendingSteps.has(s) ? 'Saved on phone · uploading' : META[s].meta}</span></span>
                  <span className="mc-step__status">{done ? 'Done' : st === 'current' ? 'Now' : ''}</span>
                </button>
                {open === s && editable && <div className="mc-step__panel">{panel(s)}</div>}
              </div>
            )
          })}
        </div>
        {notice && (
          <div className="mc-toast mc-toast--offline" role="status" style={{ marginTop: 16 }}>
            <span className="mc-toast__icon"><Icon name="wifi-off" /></span><span>{notice}</span>
            <button type="button" className="mc-toast__btn" onClick={() => setNotice(null)}>OK</button>
          </div>
        )}
        {error && <p className="mc-error" role="alert" style={{ marginTop: 16 }}><Icon name="alert" className="mc-ico--sm" />{error}</p>}
      </main>
      <div className="mc-bottom">
        <button type="button" className="mc-btn mc-btn--primary mc-btn--lg mc-btn--block" disabled={!canSubmit || submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit visit'}</button>
        <p className="body-s mc-muted" style={{ textAlign: 'center' }}>
          {remaining > 0 ? `Finish ${remaining} more step${remaining > 1 ? 's' : ''} to submit`
            : queue.length > 0 ? `Waiting to upload ${queue.length} item${queue.length > 1 ? 's' : ''}`
            : !online ? 'Reconnect to submit'
            : 'All steps done. Ready to submit.'}
        </p>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Écrire la page (`app/agent/missions/[id]/visit/page.tsx`)**

```tsx
import { notFound, redirect } from 'next/navigation'
import { VisitClient } from '@/components/agent/visit/visit-client'
import { requireAgentIn } from '@/lib/agent-guard'
import { getMissionForAgent, getVisitState } from '@/modules/missions'

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const agent = await requireAgentIn(['ACTIVE'])
  const { id } = await params
  const [state, detail] = await Promise.all([getVisitState(id, agent), getMissionForAgent(id, agent)])
  if (!state || !detail?.pro) notFound()
  if (state.status !== 'ACCEPTED' && state.status !== 'NEEDS_FIX') redirect(`/agent/missions/${id}`)
  return (
    <VisitClient
      initial={state}
      defaults={{ contactName: detail.pro.contactName ?? '', city: detail.pro.city, zip: detail.pro.zip, category: detail.suggestedCategory }}
    />
  )
}
```

- [ ] **Step 5: Vérifier dans le navigateur (téléphone réel recommandé)**

Avec une mission acceptée, ouvrir « Start visit » :
- « Check in here » demande la position, puis l'étape passe « Done » et « Synced » s'affiche ;
- la signature au doigt active « Save signature » ;
- l'étape photos ouvre l'appareil photo, les vignettes apparaissent et le compteur « n of 10 minimum » avance ;
- en mode avion, ajouter une photo affiche « Offline · saved », la vignette « On phone » et le toast. En réactivant le réseau, elle part seule ;
- « Submit visit » reste désactivé avec « Finish n more steps », puis mène au détail de la mission avec le suivi des paiements ;
- dans les DevTools (Network → Offline), ajouter 2 photos, rétablir le réseau, puis recharger la page : les photos sont bien envoyées. Sans service worker, une page rechargée hors-ligne ne s'affiche pas : la consigne reste d'ouvrir la visite avant de partir.

- [ ] **Step 6: Commit**

```bash
git add components/agent/visit "app/agent/missions/[id]/visit"
git commit -m "feat(agent-app): offline-first visit checklist"
```

## Chunk 18: Test de bout en bout

### Task 64: Test de bout en bout (Playwright)

Parcours complet de la spec §12 : connexion par code, acceptation, checklist (GPS et appareil photo simulés), soumission, validation par l'équipe, gain visible. La validation passe par le service (`validate`) : le back-office exige une connexion Google qu'un test ne peut pas faire.

**Files:**
- Modify: `package.json` (dépendance `@playwright/test`, script `e2e`), `.env.example` (`DATABASE_URL_E2E`)
- Create: `playwright.config.ts`, `e2e/helpers.ts`, `e2e/agent-flow.spec.ts`

- [ ] **Step 1: Installer Playwright et créer la base e2e**

Run: `npm install -D @playwright/test@^1.60.0 && npx playwright install chromium && createdb agents_terrain_e2e`
Expected: installation terminée ; base créée.

Ajouter à `.env.example` et à `.env.local` :

```
DATABASE_URL_E2E=postgresql://USER@localhost:5432/agents_terrain_e2e
```

Ajouter dans `package.json`, section `scripts` : `"e2e": "playwright test"`.

- [ ] **Step 2: Écrire `playwright.config.ts`**

```ts
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
```

- [ ] **Step 3: Écrire `e2e/helpers.ts`**

```ts
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
process.env.DATABASE_URL = process.env.DATABASE_URL_E2E // avant tout import du client Prisma
process.env.TWILIO_ACCOUNT_SID = '' // aucun SMS réel depuis le processus de test

const load = async () => ({
  prisma: (await import('@/lib/prisma')).prisma,
  hashOtp: (await import('@/modules/recruitment/otp-rule')).hashOtp,
  validate: (await import('@/modules/review')).validate,
})

export const AGENT_PHONE = '+16175550100'

/** Base e2e vide, puis un agent ACTIVE à Boston et une mission ouverte dans 3 jours chez un pro voisin. */
export async function seed() {
  const { prisma } = await load()
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (rows.length) await prisma.$executeRawUnsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
  await prisma.agent.create({
    data: {
      firstName: 'Maya', lastName: 'Thompson-Okafor', email: 'maya.e2e@example.com', phone: AGENT_PHONE, birthDate: new Date('2004-05-01'),
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
  return { missionId: mission.id }
}

/** Remplace le dernier code émis pour le numéro par un code connu (le SMS n'est pas lisible depuis le test). */
export async function forceLatestOtp(phone: string, code: string) {
  const { prisma, hashOtp } = await load()
  const otp = await prisma.otpCode.findFirstOrThrow({ where: { phone }, orderBy: { createdAt: 'desc' } })
  await prisma.otpCode.update({ where: { id: otp.id }, data: { codeHash: hashOtp(code, phone, process.env.AUTH_SECRET!) } })
}

export async function validateAsTeam(missionId: string) {
  const { validate } = await load()
  const r = await validate(missionId, 'e2e@allo-chantiers.fr', { confirmFlags: true })
  if (!r.ok) throw new Error(r.error)
}
```

- [ ] **Step 4: Écrire `e2e/agent-flow.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import { AGENT_PHONE, forceLatestOtp, seed, validateAsTeam } from './helpers'

test('agent : connexion, acceptation, visite complète, validation, gain visible', async ({ page }) => {
  const { missionId } = await seed()

  // Connexion par code SMS
  await page.goto('/login')
  await page.getByLabel('Mobile number').fill('(617) 555-0100')
  await page.getByRole('button', { name: 'Send code' }).click()
  await expect(page.getByRole('heading', { name: 'Check your texts' })).toBeVisible()
  await forceLatestOtp(AGENT_PHONE, '246810')
  await page.getByLabel('Digit 1').fill('246810') // un collage remplit les 6 cases
  await page.getByRole('button', { name: 'Verify' }).click()
  await page.waitForURL('**/agent/missions')

  // Acceptation
  await page.getByRole('link', { name: /Concrete contractor/ }).first().click()
  await expect(page.getByText('The owner agreed to this visit')).toBeVisible()
  await page.getByRole('button', { name: 'Accept mission' }).click()
  await expect(page.getByText('Delgado Concrete & Masonry Restoration Services LLC')).toBeVisible()
  await page.getByRole('link', { name: 'Start visit' }).click()

  // Checklist
  await page.getByRole('button', { name: 'Check in here' }).click()
  await expect(page.getByRole('button', { name: /^Check in/ })).toContainText('Done')
  const pad = page.getByRole('img', { name: /Signature area/ })
  const box = (await pad.boundingBox())!
  await page.mouse.move(box.x + 20, box.y + 90)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, box.y + 40, { steps: 8 })
  await page.mouse.move(box.x + 220, box.y + 120, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Save signature' }).click()
  await page.getByRole('button', { name: 'Save profile details' }).click()
  await page.getByRole('button', { name: 'Owner sent the invite' }).click()

  // 10 photos : un vrai JPEG produit par le navigateur (décodable par createImageBitmap)
  const jpeg = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 48
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#1f3b2f'
    ctx.fillRect(0, 0, 64, 48)
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), 'image/jpeg', 0.9))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  const files = Array.from({ length: 10 }, (_, i) => ({ name: `p${i}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(jpeg) }))
  await page.locator('input[type="file"]').setInputFiles(files)
  await expect(page.getByText('10 of 10 minimum')).toBeVisible()

  await page.getByText('Not offered yet').click()
  await page.getByRole('button', { name: 'Save verification' }).click()
  await page.getByRole('button', { name: 'Check out now' }).click()
  await expect(page.getByText('All steps done. Ready to submit.')).toBeVisible()
  await page.getByRole('button', { name: 'Submit visit' }).click()
  await page.waitForURL(`**/agent/missions/${missionId}`)
  await expect(page.getByText('Payout steps')).toBeVisible()

  // Validation par l'équipe, puis le gain apparaît
  await validateAsTeam(missionId)
  await page.goto('/agent/earnings')
  await expect(page.getByText('$40.00').first()).toBeVisible()
})
```

- [ ] **Step 5: Lancer le test**

Arrêter tout `npm run dev` sur le port 3000 au préalable (le test lance son propre serveur sur 3100).

Run: `npm run e2e`
Expected: `1 passed`. En cas d'échec, `npx playwright show-report` montre l'étape fautive, avec capture et trace.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e package.json package-lock.json .env.example
git commit -m "test(e2e): agent happy path from SMS login to validated earning"
```


## Chunk 19: Déploiement et runbook

Ce chunk prépare la mise en production sans la lancer : le déploiement réel demande le nom de domaine, les comptes (Google OAuth, Twilio, R2) et l'accord explicite de Marvin (spec §14). Rappel de la règle maison : on déploie **uniquement via GitHub** (push → `git pull` sur le VPS → `docker compose`), jamais par copie directe de fichiers.

### Task 65: Image Docker et démarrage

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `scripts/docker-entrypoint.sh`

- [ ] **Step 1: Écrire `.dockerignore`**

```
node_modules
.next
.data
.git
.env
.env*.local
secrets.env
coverage
tests
design/mapcrew/components/*/preview.html
```

- [ ] **Step 2: Écrire `scripts/docker-entrypoint.sh`**

```sh
#!/bin/sh
# Applique les migrations en attente puis démarre l'app. `migrate deploy` n'efface jamais de données.
set -e
npx prisma migrate deploy
exec npm start
```

Run: `chmod +x scripts/docker-entrypoint.sh`
Expected: aucune sortie.

- [ ] **Step 3: Écrire `Dockerfile`**

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
EXPOSE 3000
CMD ["./scripts/docker-entrypoint.sh"]
```

- [ ] **Step 4: Vérifier que le build de production passe en local**

Run: `npm run build`
Expected: « Compiled successfully », sans erreur de typage ni de lint bloquante. Docker n'est pas installé sur le poste de développement : l'image se construit sur le VPS (Task 67).

- [ ] **Step 5: Commit**

```bash
git add Dockerfile .dockerignore scripts/docker-entrypoint.sh
git commit -m "chore(deploy): production Docker image with migrate-on-start"
```

### Task 66: Composition (app + Postgres) derrière Traefik

**Files:**
- Create: `docker-compose.yml`, `secrets.env.example`

- [ ] **Step 1: Écrire `docker-compose.yml`**

Même réseau Traefik que gmb-tracker sur le VPS (`traefik-public`, certificats Let's Encrypt). Le domaine vient de la variable `APP_DOMAIN` du fichier `.env` posé à côté du compose sur le VPS.

```yaml
services:
  agents-terrain:
    build: .
    container_name: agents-terrain
    restart: unless-stopped
    env_file:
      - ./secrets.env
    environment:
      DATABASE_URL: postgresql://agents:${POSTGRES_PASSWORD}@agents-db:5432/agents_terrain
    depends_on:
      - agents-db
    volumes:
      # Utilisé seulement si STORAGE_DRIVER=local (en production : R2).
      - agents-uploads:/app/.data/uploads
    networks:
      - traefik-public
      - agents-internal
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=traefik-public"
      - "traefik.http.routers.agents-terrain.rule=Host(`${APP_DOMAIN}`)"
      - "traefik.http.routers.agents-terrain.entrypoints=websecure"
      - "traefik.http.routers.agents-terrain.tls=true"
      - "traefik.http.routers.agents-terrain.tls.certresolver=letsencrypt"
      - "traefik.http.services.agents-terrain.loadbalancer.server.port=3000"

  agents-db:
    image: postgres:16
    container_name: agents-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: agents
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: agents_terrain
    volumes:
      - agents-pg:/var/lib/postgresql/data
    networks:
      - agents-internal

volumes:
  agents-pg:
  agents-uploads:

networks:
  traefik-public:
    external: true
  agents-internal:
```

- [ ] **Step 2: Écrire `secrets.env.example`**

```
# Copier en secrets.env sur le VPS (jamais commité). DATABASE_URL est fourni par docker-compose.yml.
AUTH_SECRET=
AUTH_URL=https://DOMAINE
PUBLIC_BASE_URL=https://DOMAINE
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
CRON_SECRET=
STORAGE_DRIVER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
MANAGER_INVITE_EMAIL=
NEXT_PUBLIC_BRAND_NAME=MapCrew
```

- [ ] **Step 3: Vérifier la syntaxe YAML**

Run: `node -e "const y=require('fs').readFileSync('docker-compose.yml','utf8'); if(!/agents-db:/.test(y)||!/traefik-public:\n    external: true/.test(y)) process.exit(1); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml secrets.env.example
git commit -m "chore(deploy): compose with Postgres behind Traefik"
```

### Task 67: Runbook de mise en ligne (`docs/runbook.md`)

**Files:**
- Create: `docs/runbook.md`

- [ ] **Step 1: Écrire `docs/runbook.md`**

```markdown
# Runbook — Agents terrain (MapCrew)

## Avant le premier déploiement (une fois)

1. **Domaine** : choisir le nom de domaine, pointer un enregistrement A vers le VPS (76.13.219.244, celui de gmb-tracker).
2. **Secrets** : générer `AUTH_SECRET` et `CRON_SECRET` (`openssl rand -base64 48`, 32 caractères minimum), et `POSTGRES_PASSWORD`.
3. **Google OAuth (back-office)** : dans la console GCP du projet Allo-Chantiers, créer un client OAuth « Application Web » avec l'URI de redirection `https://DOMAINE/api/auth/callback/google`. Renseigner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
4. **Twilio** :
   - acheter un numéro US dédié, et le renseigner dans `TWILIO_FROM` ;
   - faire l'enregistrement **A2P 10DLC** (obligatoire pour envoyer des SMS à des mobiles US) ;
   - **Messaging → Settings → Geo Permissions** : n'autoriser que les **États-Unis** (protection contre le pompage SMS vers les numéros +1 des Caraïbes) ;
   - sur le numéro, webhook « A message comes in » : `POST https://DOMAINE/api/sms/inbound`.
5. **Cloudflare R2** : créer le bucket `agents-terrain-uploads` (privé) et une clé API limitée à ce bucket, puis renseigner `R2_*`.
6. **Compte gestionnaire Google dédié** (spec §2.7) : créer le compte, et mettre son email dans `MANAGER_INVITE_EMAIL`.
7. **Contrat** : faire relire `modules/contract/contract-text.ts` par un avocat US, puis passer `CONTRACT_IS_DRAFT` à `false` (avec une nouvelle `CONTRACT_VERSION`).

## Déployer (via GitHub uniquement)

1. Pousser la branche validée sur GitHub (`allo-chantiers/agents-terrain`), puis la fusionner dans `main`.
2. Sur le VPS :
   ```bash
   cd /var/www/agents-terrain && git pull --ff-only
   docker compose up -d --build
   docker compose logs -f agents-terrain   # attendre « Ready »
   ```
   Le conteneur applique les migrations au démarrage (`prisma migrate deploy`).
3. Premier admin : `docker compose exec agents-terrain npm run admin:add -- prenom@allo-chantiers.fr ADMIN`.

## Tâches planifiées (crontab de l'hôte)

```
*/15 * * * * curl -fsS -X POST -H "x-cron-secret: CRON_SECRET" https://DOMAINE/api/cron/no-show   >/dev/null
*/15 * * * * curl -fsS -X POST -H "x-cron-secret: CRON_SECRET" https://DOMAINE/api/cron/reminders >/dev/null
0 * * * *    curl -fsS -X POST -H "x-cron-secret: CRON_SECRET" https://DOMAINE/api/cron/needs-fix >/dev/null
```

## Sauvegardes

Chaque jour à 3 h : `docker exec agents-db pg_dump -U agents agents_terrain | gzip > /root/backups/agents-$(date +%F).sql.gz`, avec une rétention de 14 jours. Les photos sont dans R2.

## Vérifications après déploiement

- `https://DOMAINE/` : la landing s'affiche, la ligne « not affiliated with Google » est présente.
- `https://DOMAINE/admin/login` : la connexion Google réussit pour un compte de `AdminUser`, et échoue pour un autre compte @allo-chantiers.fr.
- Candidature test avec un vrai mobile US : le code SMS arrive.
- Répondre « 5 » au SMS après visite d'une mission test : la note apparaît dans la file de validation.
- `curl -X POST https://DOMAINE/api/cron/no-show` sans secret → 401.

## Pas de lancement public avant la phase 2

La landing promet des virements chaque vendredi et des agents dont l'identité est vérifiée : ces deux points arrivent en phase 2. En phase 1, n'utiliser l'app qu'avec des agents test.
```

- [ ] **Step 2: Commit**

```bash
git add docs/runbook.md
git commit -m "docs: production runbook (secrets, Twilio, OAuth, cron, backups)"
```

