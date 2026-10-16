# Agents terrain GBP — Design

- **Date :** 2026-10-16
- **Statut :** design validé par Marvin (blocs 1, 2 et 3), en attente de relecture de la spec
- **Projet :** nouvelle app autonome (ce repo), reliée à gmb-tracker par un pont étroit

## 1. Objectif

Recruter partout aux US des agents indépendants (étudiants, parents au foyer, gens qui veulent un revenu d'appoint) qui se déplacent chez de **vrais artisans**, pré-qualifiés par l'équipe, pour les aider à créer et faire vérifier **leur propre** fiche Google Business Profile. Le pro reste propriétaire de sa fiche, Allo-Chantiers en devient gestionnaire, puis le pro est proposé en abonnement mensuel (gestion de fiche + site + leads), comme les `Site` actuels de gmb-tracker.

L'agent est payé en 3 paliers : visite validée → fiche en ligne → pro devenu client.

**Mesure du succès :** coût par fiche en ligne, coût par client signé, délai visite → fiche en ligne, conversion pro → client.

## 2. Règles non négociables

Ces règles sont enseignées en formation, rappelées dans l'app et imposées par le code quand c'est possible.

1. **La fiche est celle du pro** : son nom réel (enseigne ou licence), son adresse réelle ou sa zone desservie, créée depuis **son** compte Google. Jamais une marque Allo-Chantiers posée sur son adresse.
2. **Le pro vérifie lui-même** sa fiche, avec sa vraie entreprise et ses propres documents ou sa propre vidéo. Ce produit n'a aucune dépendance au docgen de gmb-tracker et n'en aura jamais.
3. **L'agent ne se présente jamais comme Google** (cf. le procès Google contre G Verifier). Script de présentation imposé : « I'm a field agent with [marque], helping local contractors set up their free Google profile ».
4. **L'agent ne demande ni ne note jamais un mot de passe** du pro. Le pro tape ses identifiants lui-même.
5. **Aucun lien avec les avis.** Aucune mission, aucun bonus, aucun texte ne parle d'avis Google. Le contrat d'agent l'interdit expressément.
6. **Agents de 18 ans et plus uniquement** (contrôlé par Stripe Connect lors de la vérification d'identité).
7. **Compte gestionnaire Google dédié** : les fiches des pros sont rattachées à un compte gestionnaire séparé du parc existant, pour qu'un incident sur le parc ne puisse jamais toucher la vraie fiche d'un client.

## 3. Acteurs

| Acteur | Où | Ce qu'il fait |
|---|---|---|
| Agent | App mobile (PWA) | Candidature, formation, missions, visites, suivi des gains |
| Pro | Sur place, et par SMS | Crée et vérifie sa fiche, signe son accord, note l'agent |
| Équipe (setter) | Back-office | Pré-qualifie les pros par téléphone, crée les missions |
| Admin (Marvin, équipe) | Back-office | Valide les visites, lance les virements, pilote |

## 4. Parcours agent

### 4.1 Landing (EN)
Une page : la promesse (« Get paid to help local contractors get on Google Maps »), le fonctionnement en 3 étapes, les montants par palier, un exemple de « up to $X/month », un compteur « $X paid to agents » (somme des `Payout` payés, masquée tant qu'elle est sous un seuil réglable), une FAQ qui commence par « When do I get paid? », un bouton « Apply ».

### 4.2 Candidature
Champs : prénom, nom, email, mobile US, ZIP, rayon de déplacement (5 / 10 / 25 / 50 miles), véhicule (oui/non), disponibilités (créneaux de la semaine), case « I am 18 or older ». Vérification du mobile par code SMS (Twilio), connexion par lien magique envoyé par email (Auth.js). Le ZIP est géocodé en lat/lng pour le dispatch.

### 4.3 Formation (`academy`)
5 modules, chacun = une vidéo de 3 à 5 min + 3 à 5 questions :
1. À quoi sert une fiche Google pour un artisan
2. Le déroulé d'une visite (la checklist, écran par écran)
3. Les photos qui passent (règles de contenu Google)
4. La vérification vidéo : ce que fait le pro, ce que fait l'agent
5. Les règles (section 2)

Score global ≥ 80 % → statut `CERTIFIED`. En cas d'échec, nouvel essai possible après 24 h, 3 essais au maximum, puis revue manuelle par un admin.

### 4.4 Activation
Avant d'accepter sa première mission, l'agent doit :
- accepter le contrat d'agent indépendant (case + horodatage + version du contrat enregistrés) ;
- terminer l'onboarding Stripe Connect Express (identité, 18+, W-9, compte bancaire).

Quand le webhook Stripe `account.updated` indique `payouts_enabled = true` et que le contrat est signé → statut `ACTIVE`.

### 4.5 Missions
L'agent `ACTIVE` voit les missions `OPEN` dont le pro est dans son rayon (distance à vol d'oiseau entre la lat/lng de l'agent et celle du pro), en liste et sur une carte. Une mission affiche : le métier du pro, la ville, la distance, le créneau proposé, les gains possibles des 3 paliers. Le nom et l'adresse exacts du pro ne s'affichent qu'une fois la mission acceptée.

Accepter une mission la passe en `ACCEPTED` et envoie un SMS de confirmation au pro (nom de l'agent, créneau). Rappel SMS au pro et à l'agent la veille.

Un agent a au maximum 3 missions `ACCEPTED` en même temps.

Désistement : possible jusqu'à 24 h avant le créneau, la mission repasse `OPEN`. Pas de check-in dans les 2 h suivant le créneau → la mission repasse `OPEN` automatiquement et un `FraudFlag` de type `NO_SHOW` est créé.

### 4.6 La visite (checklist)
Écrans successifs. Le bouton « Submit » n'apparaît que quand toutes les étapes obligatoires sont faites.

| # | Étape | Obligatoire | Donnée enregistrée |
|---|---|---|---|
| 1 | Check-in | Oui | lat/lng + précision + horodatage (géoloc du navigateur) |
| 2 | Accord du pro | Oui | signature (image), nom du signataire, version du texte, horodatage |
| 3 | Création de la fiche depuis le compte Google du pro | Oui | nom saisi de la fiche, catégorie utilisée |
| 4 | Invitation de l'email gestionnaire dédié (affiché à l'écran) | Oui | case « invitation envoyée » cochée par l'agent |
| 5 | Photos | Oui, 10 minimum | fichiers + EXIF (date, GPS si présent) + catégorie (logo, véhicule, équipe, matériel, chantier) |
| 6 | Vérification | Oui (un choix) | `VIDEO_DONE` / `VIDEO_NOT_OFFERED` / `OTHER_METHOD_STARTED` (+ méthode) |
| 7 | Check-out | Oui | horodatage ; question au pro sur l'écran de l'agent : « Was the agent professional? » (1 à 5) |

Le texte d'accord (étape 2) dit que le pro : est propriétaire de la fiche ; autorise [marque] / Allo-Chantiers comme gestionnaire ; accepte d'être recontacté pour une offre de gestion ; peut retirer l'accès gestionnaire à tout moment.

Hors-ligne : les étapes sont enregistrées localement (IndexedDB) et envoyées dès que le réseau revient. Les photos sont envoyées directement au stockage objet par URL signée.

### 4.7 Suivi et gains
Chaque mission affiche ses 3 paliers avec leur état (à venir / gagné / payé). Écran « Earnings » : solde payable, date du prochain virement (vendredi), historique des virements, niveau actuel et missions restantes avant le niveau suivant.

## 5. Back-office

Accès par compte `AdminUser` (email + mot de passe + TOTP). Deux rôles : `ADMIN` (tout) et `SETTER` (pros et missions uniquement).

1. **Pros** : liste avec filtres (statut, ville, métier) ; fiche pro avec notes d'appel ; import CSV (nom, contact, téléphone, adresse, métier). Statuts en section 7.3.
2. **Missions** : création depuis un pro `AGREED` (créneau, catégorie suggérée, consignes). Une mission `OPEN` non acceptée après 48 h remonte dans un encart « Missions non prises ». En V1 l'admin peut alors augmenter le rayon de diffusion ou ajouter un bonus urgence (montant libre) à la main.
3. **Validation** : file des missions `SUBMITTED`, la plus ancienne en premier. Pour chacune : photos, carte du check-in avec la distance à l'adresse du pro, signature, résultat du rapprochement d'invitation Google (section 9.4), note du pro, alertes fraude. Actions : **Valider** (→ `VALIDATED`, crée l'`Earning` du palier 1), **Demander une correction** (→ `NEEDS_FIX`, message obligatoire), **Rejeter** (→ `REJECTED`, motif obligatoire).
4. **Agents** : liste et fiche agent (statut, niveau, missions par statut, taux de validation, note moyenne, alertes). Actions : suspendre / réactiver, reprendre la certification.
5. **Paiements** : gains `PAYABLE` regroupés par agent, bouton « Lancer les virements » (section 8.4), historique des `Payout`, export CSV.
6. **Pilotage** : coût par fiche en ligne, coût par client signé, délai médian visite → en ligne, conversion pro → client par ville et par agent, missions ouvertes non prises.
7. **Réglages** : montants des paliers, pourcentages et seuils des niveaux, rayon par défaut, seuil d'affichage du compteur de la landing.

Tous les changements de statut faits par un admin sont journalisés (`AuditLog` : qui, quoi, quand, motif).

## 6. Rémunération

### 6.1 Paliers (montants par défaut, réglables)

| Palier | `tier` | Déclencheur | Défaut |
|---|---|---|---|
| Visite validée | `VISIT` | Admin clique « Valider » | $40 |
| Fiche en ligne | `LIVE` | La fiche du pro est vérifiée par Google (section 9.4) | $25 |
| Pro client | `CLIENT` | Premier paiement du pro reçu dans gmb-tracker (section 9.5) | $50 |
| Bonus urgence | `URGENCY` | Ajouté par un admin sur une mission non prise | libre |
| Mission de retour | `RETURN_VISIT` | Mission de type retour validée | $20 |

### 6.2 Niveaux
Le niveau dépend du nombre de missions `VALIDATED` de l'agent **au moment où le gain est créé** :

| Niveau | Missions validées | Bonus |
|---|---|---|
| Bronze | 0 à 4 | 0 % |
| Silver | 5 à 14 | +10 % |
| Gold | 15 et plus | +20 % (et voit les nouvelles missions 2 h avant les autres) |

Le bonus est calculé et **figé** sur la ligne `Earning` (`baseAmount`, `levelBonusPct`, `amount`). Un changement de niveau ou de réglage ne modifie jamais un gain déjà créé.

### 6.3 Règles
- Un seul gain par `(missionId, tier)`, garanti par une contrainte d'unicité en base. Rejouer un déclencheur ne paie jamais deux fois.
- Un palier gagné reste acquis : pas de reprise si le pro résilie plus tard.
- Un admin peut annuler (`VOID`) un gain non encore payé, avec un motif obligatoire (fraude avérée).
- Les paliers `LIVE` et `CLIENT` n'existent que si le palier `VISIT` de la même mission a été validé.
- Délai maximum pour les paliers suivants : `LIVE` doit arriver dans les 60 jours après la validation, `CLIENT` dans les 90 jours. Au-delà, plus de suivi.

## 7. États

### 7.1 Agent
`APPLICANT` → (mobile vérifié) `TRAINING` → (quiz ≥ 80 %) `CERTIFIED` → (contrat + Stripe `payouts_enabled`) `ACTIVE`. Un admin peut passer `ACTIVE` ↔ `SUSPENDED`. Un agent `SUSPENDED` ne voit plus de missions ; ses missions `ACCEPTED` repassent `OPEN` ; ses gains `PAYABLE` restent payables sauf si un admin les annule.

### 7.2 Mission
- `OPEN` → `ACCEPTED` (agent) → `SUBMITTED` (agent) → `VALIDATED` | `NEEDS_FIX` | `REJECTED` (admin)
- `NEEDS_FIX` → `SUBMITTED` (l'agent complète ; il peut ajouter des photos et refaire les étapes 4 et 6, mais pas le check-in ni la signature)
- `ACCEPTED` → `OPEN` (désistement ou absence, cf. 4.5)
- `OPEN` | `ACCEPTED` → `CANCELLED` (admin, ou le pro annule)

Suivi de la fiche après validation (`listingStatus`) : `PENDING_VERIFICATION` → `LIVE` | `VERIFICATION_FAILED`. Sur `VERIFICATION_FAILED`, l'admin peut créer une mission de type `RETURN_VISIT` pour le même pro.

Types de mission : `VISIT` (par défaut) et `RETURN_VISIT` (aider le pro à finir la vérification ; checklist réduite aux étapes 1, 6 et 7).

### 7.3 Pro
`TO_CALL` → `AGREED` (créneau convenu) → `MISSION_OPEN` → `VISITED` → `LISTING_LIVE` → `CLIENT`. `LOST` est possible depuis n'importe quel statut, avec un motif.

### 7.4 Gain (`Earning`)
Créé directement en `PAYABLE` → `PAID` (inclus dans un `Payout` réussi). `PAYABLE` → `VOID` (admin, motif).

## 8. Paiements

### 8.1 Stripe
Compte Stripe de la LLC US, Connect **Express**. Stripe gère la vérification d'identité, l'âge, le W-9 et les formulaires 1099.

### 8.2 Onboarding agent
L'app crée le compte connecté et redirige vers le lien d'onboarding Stripe. Le webhook `account.updated` met à jour `stripePayoutsEnabled`.

### 8.3 Contrat
Contrat d'agent indépendant en click-wrap (version + horodatage + IP). Il prévoit : statut de freelance, aucun quota ni horaire imposé, interdiction de se présenter comme Google, interdiction de toute action liée aux avis, interdiction de manipuler les mots de passe des pros. Le texte doit être relu par un avocat US avant le lancement (point d'attention : Californie, loi AB5).

### 8.4 Virements
Le vendredi, un admin clique sur « Lancer les virements ». Pour chaque agent `ACTIVE` avec `stripePayoutsEnabled` et un solde `PAYABLE` > 0 :
1. création d'un `Payout` `PENDING` qui regroupe ses gains ;
2. `stripe.transfers.create` avec la clé d'idempotence = `payout.id` ;
3. en cas de succès : `Payout` → `PAID`, gains → `PAID` ; en cas d'échec : `Payout` → `FAILED` avec l'erreur Stripe, les gains restent `PAYABLE` et une alerte apparaît dans le back-office.

Relancer le bouton ne repaie jamais un `Payout` déjà `PAID`. Pas de virement automatique en V1.

## 9. Architecture

### 9.1 Stack et déploiement
Next.js 16 (App Router), Prisma, Postgres, Auth.js, Tailwind : la même stack que gmb-tracker. Nouveau repo GitHub dans l'organisation allo-chantiers. Déploiement par GitHub → VPS → docker compose → Caddy, sur son propre domaine. Jamais de copie directe de fichiers sur le VPS. Côté agent : PWA installable (caméra, géolocalisation, hors-ligne). Photos sur Cloudflare R2, envoyées par URL signée.

### 9.2 Modules
Chaque module a un dossier `modules/<nom>/` qui expose une interface publique (`index.ts`). Les autres modules n'importent que cette interface.

| Module | Responsabilité | Interface publique (principales fonctions) | Dépend de |
|---|---|---|---|
| `recruitment` | Landing, candidature, vérif SMS | `apply(input)`, `verifyPhone(agentId, code)` | Twilio, géocodage |
| `academy` | Modules, quiz, certification | `submitAttempt(agentId, answers)`, `getProgress(agentId)` | — |
| `missions` | Pros, missions, dispatch, checklist | `listOpenMissionsFor(agentId)`, `accept(missionId, agentId)`, `saveStep(...)`, `submit(missionId)`, `transition(missionId, to, actor, reason?)` | `google`, Twilio |
| `review` | File de validation, alertes fraude | `listQueue()`, `validate(...)`, `requestFix(...)`, `reject(...)`, `computeFlags(missionId)` | `missions`, `ledger` |
| `ledger` | Calcul et enregistrement des gains | `award(missionId, tier, extra?)`, `voidEarning(id, reason)`, `balanceOf(agentId)` | réglages |
| `payouts` | Stripe Connect, virements | `startOnboarding(agentId)`, `runPayoutBatch(adminId)`, `handleStripeWebhook(event)` | Stripe, `ledger` |
| `google` | Compte gestionnaire Google dédié | `matchAndAcceptInvitation(proRef)`, `getVerificationState(locationName)` | API Google Business Profile |
| `bridge` | Seul code qui parle à gmb-tracker | `createClientSite(pro, location)`, `getFirstPaidAt(siteId)` | gmb-tracker (HTTP) |

`ledger.award` est le **seul** point d'entrée qui crée un gain. Les déclencheurs (validation admin, tâches planifiées) l'appellent ; ils ne calculent jamais de montant eux-mêmes.

### 9.3 Données (Prisma, résumé)
- `Agent` : identité, mobile vérifié, ZIP, lat/lng, rayon, véhicule, disponibilités, `status`, `stripeAccountId`, `stripePayoutsEnabled`, `contractVersion`, `contractSignedAt`
- `TrainingAttempt` : agentId, score, réponses, date
- `Pro` : nom de l'entreprise, contact, téléphone, adresse, lat/lng, métier, `status`, notes, `gmbTrackerSiteId?`
- `Mission` : proId, agentId?, `type`, `status`, créneau, catégorie suggérée, consignes, `listingStatus?`, `googleLocationName?`, `validatedAt?`
- `Submission` : missionId, check-in (lat, lng, précision, date), signature (clé R2, nom, version du texte, date), état des étapes, choix de vérification, note du pro, check-out
- `Photo` : submissionId, clé R2, catégorie, EXIF (date, lat/lng)
- `Earning` : agentId, missionId, `tier`, `baseAmount`, `levelBonusPct`, `amount`, `status`, payoutId?, motif d'annulation? — **unique (missionId, tier)**
- `Payout` : agentId, montant, `status`, `stripeTransferId?`, erreur?, date
- `FraudFlag` : missionId, agentId, `type`, détail, résolu (oui/non)
- `AdminUser`, `AuditLog`, `Setting` (clé/valeur)

Montants en cents (entiers).

### 9.4 Compte gestionnaire Google dédié (module `google`)
- Un compte Google dédié aux fiches créées par les agents, distinct du compte `GoogleConnection` de gmb-tracker. Son email est affiché à l'agent à l'étape 4.
- La nouvelle app stocke son propre jeton OAuth (scope `business.manage`), avec une connexion unique faite par un admin.
- **Rapprochement** : quand une mission passe `SUBMITTED`, `matchAndAcceptInvitation` liste les invitations en attente du compte dédié (API Account Management, `accounts.invitations.list`). Elle cherche celle dont la fiche cible correspond au pro (nom normalisé + code postal), l'accepte et enregistre `googleLocationName` sur la mission. Résultat affiché dans l'écran de validation : `MATCHED`, `NOT_FOUND` (motif typique de `NEEDS_FIX` : le pro doit renvoyer l'invitation) ou `AMBIGUOUS` (plusieurs candidates : l'admin choisit).
- **Suivi** : une tâche planifiée toutes les heures appelle `getVerificationState` pour les missions `VALIDATED` en `PENDING_VERIFICATION` (moins de 60 jours). Fiche vérifiée → `listingStatus = LIVE`, `ledger.award(missionId, 'LIVE')`, pro → `LISTING_LIVE`.

### 9.5 Pont avec gmb-tracker (module `bridge`)
Sens unique : la nouvelle app appelle gmb-tracker, jamais l'inverse. Authentification par en-tête `X-Bridge-Secret` (secret partagé, comparaison à temps constant). Les routes refusent tout si le secret n'est pas configuré.

**Changements dans gmb-tracker :**
1. `Site.firstPaidAt DateTime?` (migration). Le webhook `invoice.paid` existant (`app/api/stripe/webhook/route.ts`) le renseigne si le `Site` lié au `stripeCustomerId` n'en a pas encore.
2. `Site.agentProRef String? @unique` : l'id du `Pro` côté nouvelle app, pour rendre la création idempotente.
3. `POST /api/bridge/sites` : corps `{ proRef, businessName, phone, email, address, city, country: "US", nicheSlug, googleLocationName, mapsUrl? }`. Crée le `Site` et son `Gmb` ; si `agentProRef` existe déjà, renvoie le `Site` existant. Réponse `{ siteId }`.
4. `GET /api/bridge/sites/:siteId/billing` → `{ firstPaidAt: string | null }`.
5. Les deux routes sont ajoutées à l'allowlist de `proxy.ts`, avec la vérification du secret.

**Déroulé :**
- Pro `LISTING_LIVE` → l'équipe présente l'offre. Quand le pro accepte, un admin clique « Convertir en client » dans le back-office → `bridge.createClientSite` → `Pro.gmbTrackerSiteId`. La facturation suit ensuite le process actuel de gmb-tracker.
- Une tâche planifiée toutes les heures appelle `getFirstPaidAt` pour les pros convertis depuis moins de 90 jours. Date présente → `ledger.award(missionId, 'CLIENT')`, pro → `CLIENT`.

Les fiches de ces clients sont suivies dans gmb-tracker par le scraper de statut (comme les autres). Les signaux venant de l'API GBP (photos, posts) n'y remontent pas, car le compte gestionnaire est différent ; c'est accepté en V1.

### 9.6 Notifications
SMS via Twilio (vérification du mobile, confirmation et rappel de créneau, message au pro après la visite). Emails transactionnels (lien de connexion, statut de candidature, virement envoyé) via un fournisseur à brancher (Resend par défaut), derrière une interface `sendEmail` unique.

## 10. Anti-fraude (V1)

Des alertes, pas des blocages ; l'admin décide.

| `FraudFlag.type` | Règle |
|---|---|
| `CHECKIN_FAR` | Check-in à plus de 150 m de l'adresse du pro, ou précision GPS supérieure à 100 m |
| `DUPLICATE_PRO` | Même téléphone ou même adresse normalisée déjà présent sur une autre mission validée |
| `PHOTO_EXIF_MISMATCH` | Photo de type logo/véhicule/équipe prise plus de 2 h avant le check-in, ou à plus de 500 m (si EXIF GPS présent) |
| `PRO_DENIED` | Le pro répond « non » au SMS post-visite (« Did [Agent] visit you today? Reply YES or NO ») |
| `LOW_PRO_RATING` | Note du pro ≤ 2 |
| `NO_SHOW` | Mission non honorée (cf. 4.5) |

Une note de pro ≤ 2 ou un `PRO_DENIED` empêche le clic « Valider » sans confirmation explicite.

## 11. Erreurs et cas limites

- **Pas de réseau sur place** : checklist hors-ligne (4.6), envoi différé ; le check-in garde l'horodatage du moment où il a été fait.
- **Géolocalisation refusée** par le navigateur : le check-in est impossible, avec un écran d'aide pour activer la localisation.
- **Invitation Google introuvable** : `NOT_FOUND` → `NEEDS_FIX`, avec un message type pour l'agent (« ask the pro to resend the manager invite to … »).
- **Le pro n'a pas de compte Google** : l'agent l'aide à en créer un, sur l'appareil du pro, avec ses identifiants à lui (module 2 de la formation).
- **Vérification vidéo non proposée tout de suite** : `VIDEO_NOT_OFFERED` ; le suivi passe par `PENDING_VERIFICATION`, et une mission de retour est possible.
- **Vérification échouée** : `VERIFICATION_FAILED` → mission de retour, ou pro `LOST`.
- **Jeton Google expiré ou révoqué** : les tâches planifiées s'arrêtent sans rien modifier et une alerte apparaît dans le back-office.
- **gmb-tracker indisponible** : les appels du pont échouent proprement, et la tâche suivante réessaie. « Convertir en client » affiche l'erreur et peut être relancé (création idempotente via `agentProRef`).
- **Virement Stripe en échec** : cf. 8.4.
- **Agent suspendu avec des missions en cours** : cf. 7.1.

## 12. Tests

- **Unitaires** (`vitest`, comme gmb-tracker) :
  - `ledger` : montants par palier, bonus de niveau aux seuils (4/5, 14/15), unicité `(missionId, tier)`, gain figé après changement de réglage, refus de `LIVE`/`CLIENT` sans `VISIT` ;
  - machines d'état de la mission et de l'agent (transitions permises et refusées) ;
  - dispatch par rayon (aux bornes du rayon) ;
  - chaque règle anti-fraude ;
  - rapprochement d'invitation (nom normalisé, cas `AMBIGUOUS`).
- **Paiements** : `runPayoutBatch` avec un faux client Stripe (succès, échec, relance sans double paiement).
- **Pont** : tests des 2 routes gmb-tracker (secret absent ou faux → refus ; création idempotente) et du webhook `invoice.paid` qui renseigne `firstPaidAt` une seule fois.
- **Bout en bout** (Playwright) : candidature → certification → acceptation → checklist complète avec GPS et caméra simulés → validation admin → gain visible côté agent. Avec des données réalistes : noms d'entreprises longs, vraies adresses US, 15 photos.

## 13. Périmètre

**V1 :** landing (1 page EN), candidature + vérif SMS, formation (5 modules + quiz), contrat + Stripe Connect, missions + dispatch + checklist PWA, file de validation + anti-fraude V1, registre des gains + virements du vendredi, pipeline pros, compte Google dédié + rapprochement d'invitation + suivi de vérification, pont gmb-tracker, pilotage de base, journal des actions admin.

**V2 (hors périmètre) :** pages SEO par ville, parrainage d'agents, classement des agents, automatisation des missions de retour et du bonus urgence, détection de photos réutilisées (empreinte d'image), virements automatiques, signaux API GBP de ces fiches dans gmb-tracker.

## 14. Entrées business à fournir avant le lancement

Elles ne changent pas le design : ce sont des valeurs de configuration ou des contenus.

- Nom de marque et domaine de la plateforme.
- Fournisseur d'emails et sa clé (Resend par défaut).
- Compte Google gestionnaire dédié (à créer) et compte Stripe de la LLC US.
- Relecture du contrat d'agent par un avocat US.
- Montants définitifs des paliers (les défauts de la section 6.1 sont réglables).
- Les vidéos des 5 modules de formation (qui les tourne).
- Qui fait les appels de pré-qualification des pros.
