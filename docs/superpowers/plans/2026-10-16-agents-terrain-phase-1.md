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
├── Dockerfile, docker-compose.yml, docs/runbook.md                 (chunk 6)
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

`app/page.tsx` (provisoire, remplacé au chunk 5) :

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

