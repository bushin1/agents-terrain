# Agents terrain GBP — Design

- **Date :** 2026-10-16
- **Statut :** design validé par Marvin (blocs 1, 2 et 3), révisé après deux relectures (v3)
- **Projet :** nouvelle app autonome (ce repo). Aucune modification de gmb-tracker en V1.

## 1. Objectif

Recruter partout aux US des agents indépendants (étudiants, parents au foyer, gens qui veulent un revenu d'appoint) qui se déplacent chez de **vrais artisans**, pré-qualifiés par l'équipe, pour les aider à créer et faire vérifier **leur propre** fiche Google Business Profile. Le pro reste propriétaire de sa fiche, Allo-Chantiers en devient gestionnaire, puis le pro est proposé en abonnement mensuel (gestion de fiche + site + leads) via le process commercial actuel.

L'agent est payé en 3 paliers : visite validée → fiche en ligne → pro devenu client.

**Mesure du succès :** coût par fiche en ligne, coût par client signé, délai visite → fiche en ligne, conversion pro → client.

## 2. Règles non négociables

Ces règles sont enseignées en formation, rappelées dans l'app et imposées par le code quand c'est possible.

1. **La fiche est celle du pro** : son nom réel (enseigne ou licence), son adresse réelle ou sa zone desservie, créée depuis **son** compte Google. Jamais une marque Allo-Chantiers posée sur son adresse.
2. **Le pro vérifie lui-même** sa fiche, avec sa vraie entreprise et ses propres documents ou sa propre vidéo. Ce produit n'a aucune dépendance au docgen de gmb-tracker et n'en aura jamais.
3. **L'agent ne se présente jamais comme Google** (cf. le procès Google contre G Verifier). Script de présentation imposé : « I'm a field agent with [marque], helping local contractors set up their free Google profile ».
4. **L'agent ne demande ni ne note jamais un mot de passe** du pro. Le pro tape ses identifiants lui-même.
5. **Aucun lien avec les avis.** Aucune mission, aucun bonus, aucun texte ne parle d'avis Google. Le contrat d'agent l'interdit expressément.
6. **Agents de 18 ans et plus uniquement** : date de naissance contrôlée à la candidature, puis vérification d'identité par Stripe.
7. **Compte gestionnaire Google dédié** : les fiches des pros sont rattachées à un compte gestionnaire séparé du parc existant, pour qu'un incident sur le parc ne puisse jamais toucher la vraie fiche d'un client.

## 3. Acteurs

| Acteur | Où | Ce qu'il fait |
|---|---|---|
| Agent | App mobile (PWA) | Candidature, formation, missions, visites, suivi des gains |
| Pro | Sur place, et par SMS | Crée et vérifie sa fiche, signe son accord, note la visite par SMS |
| Équipe (setter) | Back-office | Pré-qualifie les pros par téléphone, crée et replanifie les missions |
| Admin (Marvin, équipe) | Back-office | Valide les visites, confirme les fiches en ligne, convertit les clients, lance les virements |

## 4. Parcours agent

### 4.1 Landing (EN)
Une page : la promesse (« Get paid to help local contractors get on Google Maps »), le fonctionnement en 3 étapes, les montants par palier, un exemple de « up to $X/month », une FAQ qui commence par « When do I get paid? », un bouton « Apply ».

### 4.2 Candidature
Champs : prénom, nom, email, mobile US, date de naissance (18 ans révolus exigés, sinon refus immédiat), ZIP, rayon de déplacement (5 / 10 / 25 / 50 miles), véhicule (oui/non), disponibilités (créneaux de la semaine). Vérification du mobile par code SMS. Connexion par lien magique envoyé par email (Auth.js). Le ZIP est géocodé en lat/lng pour le dispatch.

### 4.3 Formation (`academy`)
5 modules, chacun = une vidéo de 3 à 5 min + 3 à 5 questions :
1. À quoi sert une fiche Google pour un artisan
2. Le déroulé d'une visite (la checklist, écran par écran), y compris aider un pro sans compte Google à en créer un sur son propre appareil
3. Les photos qui passent (règles de contenu Google)
4. La vérification vidéo : ce que fait le pro, ce que fait l'agent
5. Les règles (section 2)

Score global ≥ 80 % → `CERTIFIED`. En cas d'échec, nouvel essai possible après 24 h. Après 3 échecs → `LOCKED` (cf. 7.1).

### 4.4 Activation
Avant d'accepter sa première mission, l'agent doit :
- accepter le contrat d'agent indépendant (case + horodatage + IP + version du contrat enregistrés) ;
- terminer l'onboarding Stripe Connect Express (identité, W-9, compte bancaire).

Quand le webhook Stripe `account.updated` indique `payouts_enabled = true` et que le contrat est signé → `ACTIVE`.

### 4.5 Missions
L'agent `ACTIVE` voit les missions `OPEN` à venir (créneau dans le futur) dont le pro est dans son rayon de déplacement **ou** dans le rayon de diffusion de la mission. La distance est calculée à vol d'oiseau entre la lat/lng de l'agent et celle du pro. Affichage en liste et sur une carte : métier du pro, ville, distance, créneau, gains possibles (paliers + éventuel bonus urgence). Le nom et l'adresse exacts du pro ne s'affichent qu'une fois la mission acceptée.

Accepter une mission la passe en `ACCEPTED` et envoie un SMS de confirmation au pro (prénom de l'agent, créneau). Rappel SMS au pro et à l'agent la veille.

Un agent a au maximum 3 missions `ACCEPTED` en même temps.

- **Désistement** : possible jusqu'à 24 h avant le créneau ; la mission repasse `OPEN`.
- **Pas de check-in reçu 2 h après le créneau** : SMS à l'agent (« Did you visit? Open the app to sync your visit ») et la mission apparaît dans l'encart « Visites sans nouvelles » du back-office.
- **Pas de check-in reçu 24 h après le créneau** : la mission repasse `OPEN` et un `FraudFlag` `NO_SHOW` est créé. Un check-in synchronisé après ce moment est refusé par le serveur, avec un message invitant l'agent à contacter le support.

### 4.6 La visite (checklist)
Écrans successifs. Le bouton « Submit » n'apparaît que quand toutes les étapes obligatoires sont faites. Chaque étape enregistre l'horodatage du téléphone **et** l'heure de réception par le serveur (`receivedAt`).

| # | Étape | Obligatoire | Donnée enregistrée |
|---|---|---|---|
| 1 | Check-in | Oui | lat/lng + précision + horodatage (géoloc du navigateur) |
| 2 | Accord du pro | Oui | signature (image), nom du signataire, version du texte, horodatage |
| 3 | Création de la fiche depuis le compte Google du pro, ou revendication de sa fiche publique existante si la mission l'indique | Oui | nom exact de la fiche, catégorie utilisée, ville, code postal, `CREATED` ou `CLAIMED` |
| 4 | Invitation de l'email gestionnaire dédié (affiché à l'écran) | Oui (un choix) | `INVITE_SENT` ou `INVITE_NOT_ALLOWED_YET` (Google ne propose pas encore l'ajout d'utilisateurs) |
| 5 | Photos | Oui, 10 minimum | fichiers + EXIF (date, GPS si présent) + catégorie (logo, véhicule, équipe, matériel, chantier) |
| 6 | Vérification | Oui (un choix) | `VIDEO_DONE` / `VIDEO_NOT_OFFERED` / `OTHER_METHOD_STARTED` (+ méthode) |
| 7 | Check-out | Oui | horodatage |

Le texte d'accord (étape 2) dit que le pro : est propriétaire de la fiche ; autorise [marque] / Allo-Chantiers comme gestionnaire ; accepte d'être recontacté pour une offre de gestion ; peut retirer l'accès gestionnaire à tout moment ; recevra un SMS pour noter la visite.

**Hors-ligne** : les étapes sont enregistrées localement (IndexedDB) et envoyées dès que le réseau revient. Les photos sont envoyées directement au stockage objet par URL signée.

**Après la soumission** : SMS automatique au pro : « Did [prénom de l'agent] visit you today? Reply 1–5 to rate the visit, or NO if no one came. »

### 4.7 Suivi et gains
Chaque mission affiche ses 3 paliers avec leur état (à venir / gagné / payé). Écran « Earnings » : solde payable, date du prochain virement (vendredi), historique des virements, niveau actuel et missions restantes avant le niveau suivant.

## 5. Back-office

Accès par compte `AdminUser` (email + mot de passe + TOTP). Deux rôles : `ADMIN` (tout) et `SETTER` (pros et missions uniquement).

1. **Pros** : liste avec filtres (statut, ville, métier) ; fiche pro avec notes d'appel ; import CSV (nom, contact, téléphone, adresse, métier). Statuts en section 7.3. Lors de la pré-qualification, le setter vérifie sur Maps si le pro a déjà une fiche publique et l'enregistre (`existingPlaceId`) ; la mission demande alors de la revendiquer plutôt que d'en créer une.
2. **Missions** : création depuis un pro `AGREED` (créneau, catégorie suggérée, consignes) ; `publishedAt` = création.
   - Encart **Non prises** : missions `OPEN` publiées depuis plus de 48 h. Actions : élargir le rayon de diffusion (`broadcastRadiusMiles`), ajouter un bonus urgence (`urgencyBonusCents`).
   - Encart **À replanifier** : missions `OPEN` dont le créneau est passé (invisibles pour les agents). Actions : nouveau créneau (reste `OPEN`) ou annulation.
   - Encart **Visites sans nouvelles** : cf. 4.5.
3. **Validation** : file des missions `SUBMITTED`, la plus ancienne en premier. Pour chacune : photos, carte du check-in avec la distance à l'adresse du pro, signature, horodatages téléphone et serveur, état de l'invitation gestionnaire (section 9.4), réponse SMS du pro, alertes fraude.
   - **Valider** : → `VALIDATED`, crée le gain du palier `VISIT` (ou `RETURN_VISIT` pour une mission de retour). La validation ne dépend pas de l'invitation gestionnaire.
   - **Demander une correction** : → `NEEDS_FIX`, message obligatoire.
   - **Rejeter** : → `REJECTED`, motif obligatoire.
4. **Fiches à confirmer** : propositions de la tâche de détection (section 9.4) pour les pros dont on n'a pas encore l'accès gestionnaire. L'admin ouvre le lien Maps proposé et clique **Confirmer en ligne** ou **Ce n'est pas la bonne fiche**.
5. **Conversion** : sur un pro `LISTING_LIVE`, bouton **Convertir en client**. L'admin choisit le compte Stripe de facturation (liste configurée) et saisit l'identifiant du client (`cus_…`) créé par le process commercial actuel ; l'app vérifie qu'il existe dans ce compte (section 9.5). Exige que l'accès gestionnaire soit obtenu.
6. **Agents** : liste et fiche agent (statut, niveau, missions par statut, taux de validation, note moyenne des pros, alertes). Actions : suspendre / réactiver, débloquer un agent `LOCKED` ou refuser sa candidature.
7. **SMS reçus** : réponses des pros qui ne sont ni une note ni « NO » (annulation, question…), à traiter à la main.
8. **Paiements** : gains `PAYABLE` regroupés par agent, bouton « Lancer les virements » (section 8.4), `Payout` en attente ou en échec avec bouton « Réessayer », historique, export CSV.
9. **Pilotage** : coût par fiche en ligne, coût par client signé, délai médian visite → en ligne, conversion pro → client par ville et par agent, missions non prises.
10. **Réglages** : montants des paliers, pourcentages et seuils des niveaux, rayon de diffusion par défaut.

Tous les changements de statut faits par un admin sont journalisés (`AuditLog` : qui, quoi, quand, motif).

## 6. Rémunération

### 6.1 Paliers (montants par défaut, réglables)

| Palier (`tier`) | Rattaché à | Déclencheur | Défaut |
|---|---|---|---|
| `VISIT` | la mission `VISIT` | Admin valide la mission | $40 |
| `LIVE` | la mission `VISIT` d'origine du pro | La fiche du pro est en ligne (section 9.4) | $25 |
| `CLIENT` | la mission `VISIT` d'origine du pro | Premier paiement > 0 du pro (section 9.5) | $50 |
| `RETURN_VISIT` | la mission `RETURN_VISIT` | Admin valide la mission de retour | $20 |
| `URGENCY` | la mission concernée | Mission validée avec un `urgencyBonusCents` > 0 | montant fixé par l'admin |

Les paliers `LIVE` et `CLIENT` reviennent toujours à l'agent de la mission `VISIT` d'origine, même si une mission de retour a été faite par un autre agent. La **mission `VISIT` d'origine** d'un pro est sa seule mission `VISIT` `VALIDATED` : un pro `VISITED` ne revient jamais en `AGREED`, il ne peut donc pas en avoir une seconde.

### 6.2 Niveaux
Le niveau dépend du nombre de missions `VALIDATED` de l'agent **au moment où le gain est créé** :

| Niveau | Missions validées | Bonus |
|---|---|---|
| Bronze | 0 à 4 | 0 % |
| Silver | 5 à 14 | +10 % |
| Gold | 15 et plus | +20 % |

Le bonus s'applique à tous les paliers sauf `URGENCY`. Il est calculé et **figé** sur la ligne `Earning` (`baseAmountCents`, `levelBonusPct`, `amountCents`). Un changement de niveau ou de réglage ne modifie jamais un gain déjà créé.

### 6.3 Règles
- Un seul gain par `(missionId, tier)`, garanti par une contrainte d'unicité en base. Rejouer un déclencheur ne paie jamais deux fois.
- Un palier gagné reste acquis : pas de reprise si le pro résilie plus tard.
- Un admin peut annuler (`VOID`) un gain non encore payé, avec un motif obligatoire (fraude avérée).
- `LIVE` et `CLIENT` n'existent que si la mission `VISIT` d'origine est `VALIDATED`.
- Délais, comptés depuis `validatedAt` de la mission `VISIT` d'origine : `LIVE` dans les 60 jours, `CLIENT` dans les 90 jours. Au-delà, plus de suivi ni de gain.

## 7. États

### 7.1 Agent
- `APPLICANT` → (mobile vérifié) `TRAINING` → (quiz ≥ 80 %) `CERTIFIED` → (contrat + Stripe `payouts_enabled`) `ACTIVE`
- `TRAINING` → (3 échecs) `LOCKED` → (admin) `TRAINING` (essais remis à zéro) ou `REFUSED`
- `ACTIVE` ↔ `SUSPENDED` (admin). Un agent `SUSPENDED` ne voit plus de missions ; ses missions `ACCEPTED` repassent `OPEN` ; ses gains `PAYABLE` restent payables et sont inclus dans les virements (8.4), sauf annulation par un admin.

### 7.2 Mission
Types : `VISIT` (par défaut) et `RETURN_VISIT` (aider le pro à finir la vérification ; checklist réduite aux étapes 1, 4, 6 et 7 ; porte `parentMissionId` = la mission `VISIT` d'origine).

- `OPEN` → `ACCEPTED` (agent) → `SUBMITTED` (agent) → `VALIDATED` | `NEEDS_FIX` | `REJECTED` (admin)
- `NEEDS_FIX` → `SUBMITTED` (l'agent complète : il peut ajouter des photos et refaire les étapes 4 et 6, mais pas le check-in ni la signature)
- `NEEDS_FIX` → `REJECTED` automatiquement après 7 jours sans nouvelle soumission ; un admin peut aussi rejeter ou annuler à tout moment
- `ACCEPTED` → `OPEN` (désistement, suspension de l'agent, absence : cf. 4.5)
- `OPEN` | `ACCEPTED` | `NEEDS_FIX` → `CANCELLED` (admin, par exemple si le pro annule)
- `VALIDATED`, `REJECTED` et `CANCELLED` sont finaux.

### 7.3 Pro

| Statut | Entrée |
|---|---|
| `TO_CALL` | Création ou import |
| `AGREED` | Le setter note l'accord et un créneau ; ou retour après une mission **`VISIT`** `REJECTED` / `CANCELLED` |
| `MISSION_OPEN` | Une mission `VISIT` est créée pour ce pro (y compris quand la mission repasse `OPEN`) |
| `VISITED` | La mission `VISIT` passe `VALIDATED` |
| `LISTING_LIVE` | La fiche est détectée ou confirmée en ligne (section 9.4) |
| `CLIENT` | Le palier `CLIENT` est déclenché |
| `LOST` | Admin, depuis n'importe quel statut, motif obligatoire |

Après une mission `VISIT` `REJECTED` ou `CANCELLED`, le pro repasse `AGREED` par défaut, ou `LOST` si l'admin le choisit au même moment. Une mission `RETURN_VISIT` ne change jamais le statut du pro (cf. ci-dessous pour son effet sur le suivi de la fiche). Passer un pro `LOST` annule ses missions `OPEN`, `ACCEPTED` et `NEEDS_FIX`.

Suivi de la fiche (`Pro.listingStatus`, à partir de `VISITED`) : `PENDING_VERIFICATION` → `LIVE` | `VERIFICATION_FAILED`.
- **Échéance de suivi** `Pro.listingDeadlineAt` : posée à `validatedAt` de la visite + 60 jours. Une tâche quotidienne passe en `VERIFICATION_FAILED` les pros `PENDING_VERIFICATION` dont l'échéance est dépassée. Un admin peut aussi le faire à tout moment.
- **Mission de retour** : depuis `VERIFICATION_FAILED`, l'admin peut créer une `RETURN_VISIT`. À sa création : `listingStatus` → `PENDING_VERIFICATION` et `listingDeadlineAt` → créneau de la mission + 60 jours. Si elle finit `REJECTED` ou `CANCELLED` : `listingStatus` → `VERIFICATION_FAILED` immédiatement.
- L'échéance de suivi ne touche pas le délai du palier `LIVE`, qui reste compté depuis la visite d'origine (6.3). Une fiche mise en ligne après ce délai fait passer le pro `LISTING_LIVE` (il reste convertible en client) sans créer de gain `LIVE`.

### 7.4 Gain (`Earning`)
Créé directement en `PAYABLE` → `PAID` (inclus dans un `Payout` réussi). `PAYABLE` → `VOID` (admin, motif). Un gain rattaché à un `Payout` `PENDING` n'est pas annulable et ne peut pas entrer dans un autre `Payout`.

### 7.5 Virement (`Payout`)
`PENDING` → `PAID` | `FAILED`. `FAILED` est final : ses gains sont détachés et redeviennent `PAYABLE`.

## 8. Paiements

### 8.1 Stripe
Compte Stripe de la LLC US, Connect **Express**. Stripe gère la vérification d'identité, le W-9 et les formulaires 1099.

### 8.2 Onboarding agent
L'app crée le compte connecté et redirige vers le lien d'onboarding Stripe. Le webhook `account.updated` met à jour `stripePayoutsEnabled`.

### 8.3 Contrat
Contrat d'agent indépendant en click-wrap (version + horodatage + IP). Il prévoit : statut de freelance, aucun quota ni horaire imposé, interdiction de se présenter comme Google, interdiction de toute action liée aux avis, interdiction de manipuler les mots de passe des pros.

### 8.4 Virements
Le vendredi, un admin clique sur « Lancer les virements ».

Chaque transfert Stripe est créé avec `transfer_group = payout.id`, `metadata.payoutId = payout.id` et la clé d'idempotence `payout.id`. La clé ne protège que pendant 24 h (Stripe peut l'effacer ensuite) ; le `transfer_group` sert de garde durable.

Le lot :
1. **Reprend d'abord chaque `Payout` `PENDING`** existant (lot précédent interrompu, ou bouton « Réessayer ») : `stripe.transfers.list({ transfer_group: payout.id })`. Un transfert existe → `Payout` `PAID` avec cet identifiant, gains `PAID`. Aucun transfert → nouvel appel `stripe.transfers.create` avec les mêmes paramètres.
2. Puis, pour chaque agent `ACTIVE` ou `SUSPENDED` avec `stripePayoutsEnabled` et des gains `PAYABLE` non rattachés : crée un `Payout` `PENDING`, y rattache ses gains, appelle `stripe.transfers.create`.
3. Résultat de chaque appel de création :
   - succès → `Payout` `PAID` (avec `stripeTransferId`), gains `PAID` ;
   - erreur définitive de Stripe (requête refusée, compte non payable) → `Payout` `FAILED` avec l'erreur, gains détachés et de nouveau `PAYABLE`, alerte dans le back-office ;
   - délai dépassé, erreur réseau ou erreur 5xx → le `Payout` reste `PENDING` ; il sera repris par le point 1 (bouton « Réessayer » ou lot suivant).

Un gain n'est jamais rattaché à deux `Payout` non finaux à la fois. Pas de virement automatique en V1.

## 9. Architecture

### 9.1 Stack et déploiement
Next.js 16 (App Router), Prisma, Postgres, Auth.js, Tailwind : la même stack que gmb-tracker. Nouveau repo GitHub dans l'organisation allo-chantiers. Déploiement par GitHub → VPS → docker compose → Caddy, sur son propre domaine. Jamais de copie directe de fichiers sur le VPS. Côté agent : PWA installable (caméra, géolocalisation, hors-ligne). Photos sur Cloudflare R2, envoyées par URL signée. Tâches planifiées : une route par tâche, protégée par un secret, appelée par cron.

### 9.2 Modules
Chaque module a un dossier `modules/<nom>/` qui expose une interface publique (`index.ts`). Les autres modules n'importent que cette interface.

| Module | Responsabilité | Interface publique (principales fonctions) | Dépend de |
|---|---|---|---|
| `recruitment` | Landing, candidature, contrôle d'âge | `apply(input)` | `sms`, géocodage |
| `academy` | Modules, quiz, certification | `submitAttempt(agentId, answers)`, `getProgress(agentId)`, `unlock(agentId, adminId)` | — |
| `missions` | Pros, missions, dispatch, checklist, états du pro et de la mission | `listOpenMissionsFor(agentId)`, `accept(missionId, agentId)`, `saveStep(missionId, step, data)`, `submit(missionId)`, `transition(missionId, to, actor, reason?)`, `setProStatus(proId, to, actor, reason?)`, `setListingStatus(proId, to, data?)`, `runNoShowSweep()`, `runNeedsFixSweep()`, `runListingDeadlineSweep()` | `sms` |
| `review` | File de validation, alertes fraude | `listQueue()`, `validate(missionId, adminId)`, `requestFix(...)`, `reject(...)`, `computeFlags(missionId)` | `missions`, `ledger` |
| `ledger` | Seul point de création et d'annulation des gains | `award(missionId, tier)`, `voidEarning(id, reason, adminId)`, `balanceOf(agentId)` | réglages |
| `payouts` | Stripe Connect, virements | `startOnboarding(agentId)`, `runPayoutBatch(adminId)`, `retryPayout(payoutId)`, `handleConnectWebhook(event)` | Stripe (compte LLC US), `ledger` |
| `listing` | Accès gestionnaire et détection « fiche en ligne » | `matchInvitations()`, `checkVerification()`, `detectPublicListings()`, `confirmLive(proId, placeId, adminId)` | API Google Business Profile (compte dédié), API Places, `missions`, `ledger` |
| `billing` | Lecture seule des comptes Stripe de facturation des clients, conversion, palier `CLIENT` | `listAccounts()`, `customerExists(account, cusId)`, `convert(proId, account, cusId, adminId)`, `runFirstPaymentSweep()` | Stripe (clés restreintes en lecture), `missions`, `ledger` |
| `sms` | Envoi et réception de SMS | `send(to, template, vars)`, `handleInbound(from, body)` | Twilio |

`ledger.award` est le **seul** point d'entrée qui crée un gain. Il applique les règles de la section 6 (montant, bonus de niveau, unicité, rattachement à la mission d'origine, délais) ; les déclencheurs ne calculent jamais de montant.

`sms.handleInbound` reconnaît « 1 » à « 5 » et « NO » quand un SMS post-visite est en attente pour ce numéro, et les enregistre sur la mission. Tout autre message va dans « SMS reçus ». « STOP » est géré par Twilio.

### 9.3 Données (Prisma, résumé)
- `Agent` : identité, date de naissance, mobile vérifié, ZIP, lat/lng, rayon, véhicule, disponibilités, `status`, `failedAttempts`, `stripeAccountId`, `stripePayoutsEnabled`, `contractVersion`, `contractSignedAt`, `contractIp`
- `TrainingAttempt` : agentId, score, réponses, date
- `Pro` : nom de l'entreprise, contact, téléphone, adresse, ville, code postal, lat/lng, métier, `status`, notes, `existingPlaceId?` (fiche publique déjà existante avant la visite), `listingStatus?`, `listingDeadlineAt?`, `googleLocationName?` (accès gestionnaire obtenu), `placeId?`, `mapsUrl?`, `liveAt?`, `billingAccount?`, `stripeCustomerId?`, `convertedAt?`, `lostReason?`
- `Mission` : proId, agentId?, `type`, `parentMissionId?`, `status`, `slotAt`, `publishedAt`, `broadcastRadiusMiles?`, `urgencyBonusCents`, catégorie suggérée, consignes, `validatedAt?`, `needsFixAt?`, `proRating?`, `proDenied`
- `Submission` : missionId, check-in (lat, lng, précision, horodatage téléphone, `receivedAt`), signature (clé R2, nom, version du texte, horodatages), données de chaque étape avec horodatages, choix d'invitation, choix de vérification, check-out
- `Photo` : submissionId, clé R2, catégorie, EXIF (date, lat/lng), `receivedAt`
- `Earning` : agentId, missionId, `tier`, `baseAmountCents`, `levelBonusPct`, `amountCents`, `status`, payoutId?, motif d'annulation? — **unique (missionId, tier)**
- `Payout` : agentId, `amountCents`, `status`, `stripeTransferId?`, erreur?, dates
- `ListingCandidate` : proId, placeId, nom, adresse, lien Maps, statut (`PROPOSED`, `CONFIRMED`, `DISMISSED`)
- `InboundSms` : numéro, texte, date, missionId?, traité (oui/non)
- `FraudFlag` : missionId, agentId, `type`, détail, résolu (oui/non)
- `AdminUser`, `AuditLog`, `Setting` (clé/valeur)

Montants en cents (entiers).

### 9.4 Fiche en ligne et accès gestionnaire (module `listing`)
**Pourquoi deux mécanismes :** on ne sait pas si Google laisse ajouter un gestionnaire avant que la fiche soit vérifiée (cf. section 14, test terrain). Le palier `LIVE` ne doit donc pas dépendre de l'accès gestionnaire.

- **Compte dédié** : un compte Google réservé aux fiches créées par les agents, distinct du compte `GoogleConnection` de gmb-tracker. Son email est affiché à l'étape 4. L'app garde son propre jeton OAuth (scope `business.manage`), avec une connexion unique faite par un admin.
- **`matchInvitations`** (toutes les heures) : liste les invitations en attente du compte dédié (API Account Management, `accounts.invitations.list`). Pour chaque pro `VISITED` ou `LISTING_LIVE` sans `googleLocationName`, cherche l'invitation dont la fiche cible correspond (nom normalisé + code postal), l'accepte et enregistre `googleLocationName`. Plusieurs candidates : aucune n'est acceptée, l'admin choisit dans la fiche pro.
- **`checkVerification`** (toutes les heures) : pour les pros avec `googleLocationName` et `listingStatus = PENDING_VERIFICATION`, lit l'état de vérification. Fiche vérifiée → `LIVE`.
- **`detectPublicListings`** (toutes les 6 heures) : pour les pros `PENDING_VERIFICATION` sans `googleLocationName` **et sans `existingPlaceId`**, fait une recherche Places (nom de la fiche + ville). Un résultat devient un `ListingCandidate` `PROPOSED` (un seul par placeId) si son nom normalisé correspond **et** si son code postal **ou** son numéro de téléphone correspond à ceux du pro (les fiches à zone desservie n'exposent pas d'adresse). L'admin le confirme dans « Fiches à confirmer » (`confirmLive`) → `LIVE`.
- **Pro qui avait déjà une fiche publique** (`existingPlaceId`) : Places ne distingue pas une fiche revendiquée d'une fiche qui ne l'est pas, donc pas de détection publique. Son passage à `LIVE` passe uniquement par l'accès gestionnaire et `checkVerification` ; c'est pourquoi le SMS d'instructions d'invitation (ci-dessous) lui est envoyé dès que la visite est validée sans `googleLocationName`, avec un rappel à J+3 et J+10.
- **Passage à `LIVE`** (par l'un ou l'autre chemin) : `Pro.listingStatus = LIVE`, `liveAt`, `placeId`/`mapsUrl` quand ils sont connus, pro → `LISTING_LIVE`, `ledger.award(missionVisitId, 'LIVE')`.
- **Accès gestionnaire manquant une fois la fiche en ligne** : si le pro est `LISTING_LIVE` sans `googleLocationName`, un SMS lui est envoyé avec les 3 étapes pour inviter l'email gestionnaire, puis un rappel à J+3. La conversion en client exige l'accès gestionnaire.
- **Jeton Google expiré ou révoqué** : les tâches s'arrêtent sans rien modifier et une alerte apparaît dans le back-office.

### 9.5 Conversion et palier `CLIENT` (module `billing`)
Le lien entre un client et Stripe vit dans le système commercial actuel (base leadgen, `core.site.stripe_customer_id`), pas dans gmb-tracker. Ce système utilise plusieurs comptes Stripe (`core.stripe_client.compte`, par exemple `WLS`). La nouvelle app ne s'y branche pas : elle lit directement les comptes Stripe qui facturent les clients.

- **Comptes configurés** : une liste `code de compte → clé restreinte en lecture seule` (clients et factures), dans les variables d'environnement. Les codes reprennent ceux de la base leadgen.
- **Convertir en client** (`billing.convert`, admin, cf. 5.5) : choix du compte + saisie du `cus_…` → `customerExists(account, cusId)` le vérifie → `Pro.billingAccount`, `Pro.stripeCustomerId`, `convertedAt` = maintenant. Le client est créé et facturé par le process commercial habituel ; la nouvelle app n'écrit rien ailleurs.
- **Premier paiement** : la plus ancienne facture du client, dans ce compte, avec le statut `paid`, `amount_paid > 0` et une date de paiement (`status_transitions.paid_at`) **postérieure ou égale à `convertedAt`**. Les factures à 0 $ (essai, coupon de 100 %) et celles d'un abonnement antérieur ne comptent pas.
- **`runFirstPaymentSweep`** (toutes les heures) : pour les pros convertis sans palier `CLIENT` dont la visite d'origine a été validée il y a moins de 90 jours, cherche ce premier paiement. Trouvé → `ledger.award(missionVisitId, 'CLIENT')`, pro → `CLIENT`.

Les fiches de ces clients sont ajoutées au suivi de gmb-tracker par le process habituel de l'équipe. Les signaux de l'API GBP (photos, posts) n'y remontent pas, car le compte gestionnaire est différent ; c'est accepté en V1.

### 9.6 Notifications
SMS via Twilio (vérification du mobile, confirmation et rappel de créneau, relance d'agent sans check-in, SMS post-visite au pro, instructions d'invitation gestionnaire). Emails transactionnels (lien de connexion, statut de candidature, virement envoyé) via un fournisseur à brancher (Resend par défaut), derrière une interface `sendEmail` unique.

## 10. Anti-fraude (V1)

Des alertes, pas des blocages ; l'admin décide.

| `FraudFlag.type` | Règle |
|---|---|
| `CHECKIN_FAR` | Check-in à plus de 150 m de l'adresse du pro, ou précision GPS supérieure à 100 m |
| `DUPLICATE_PRO` | Même téléphone ou même adresse normalisée déjà présent sur une autre mission validée |
| `PHOTO_EXIF_MISMATCH` | Photo de type logo/véhicule/équipe prise plus de 2 h avant le check-in, ou à plus de 500 m (si EXIF GPS présent) |
| `PRO_DENIED` | Le pro répond « NO » au SMS post-visite |
| `LOW_PRO_RATING` | Note du pro ≤ 2 |
| `NO_SHOW` | Mission non honorée (cf. 4.5) |
| `LATE_SYNC` | Check-in reçu par le serveur plus de 12 h après son horodatage téléphone |

Un `PRO_DENIED` ou un `LOW_PRO_RATING` impose une confirmation explicite avant « Valider ». La note vient uniquement du SMS du pro, jamais de l'écran de l'agent.

## 11. Erreurs et cas limites

- **Pas de réseau sur place** : checklist hors-ligne (4.6), envoi différé ; règles d'absence en 4.5.
- **Géolocalisation refusée** par le navigateur : le check-in est impossible, avec un écran d'aide pour activer la localisation.
- **Le pro n'a pas de compte Google** : l'agent l'aide à en créer un, sur l'appareil du pro, avec ses identifiants à lui (module 2 de la formation).
- **Google ne propose pas encore l'ajout d'utilisateurs** : `INVITE_NOT_ALLOWED_YET` ; la visite reste validable, l'accès est demandé après la mise en ligne (9.4).
- **Vérification vidéo non proposée tout de suite** : `VIDEO_NOT_OFFERED` ; suivi par `PENDING_VERIFICATION`, mission de retour possible.
- **Vérification échouée ou fiche jamais détectée** : `VERIFICATION_FAILED` (7.3) → mission de retour, ou pro `LOST`.
- **Le pro annule par SMS** : le message arrive dans « SMS reçus », l'admin annule la mission.
- **`cus_…` inconnu** à la conversion : refusé avec un message ; rien n'est enregistré.
- **Jeton Google ou clé Stripe de lecture invalides** : les tâches concernées s'arrêtent sans rien modifier et une alerte apparaît dans le back-office.
- **Virement Stripe en échec ou sans réponse** : cf. 8.4.
- **Agent suspendu avec des missions en cours** : cf. 7.1.

## 12. Tests

- **Unitaires** (`vitest`, comme gmb-tracker) :
  - `ledger` : montants par palier, bonus de niveau aux seuils (4/5, 14/15), `URGENCY` sans bonus, unicité `(missionId, tier)`, gain figé après changement de réglage, `LIVE`/`CLIENT` refusés sans `VISIT` validé, refusés après 60/90 jours, rattachés à la mission d'origine quand une mission de retour existe ;
  - machines d'état de l'agent, de la mission et du pro (transitions permises et refusées, `NEEDS_FIX` → `REJECTED` à 7 jours, retour du pro en `AGREED` seulement après une mission `VISIT`, pro `LOST` qui annule ses missions en cours) ;
  - suivi de la fiche : échéance à 60 jours, remise à zéro par une mission de retour, retour en `VERIFICATION_FAILED` si elle est rejetée, fiche en ligne après le délai du palier `LIVE` (pro `LISTING_LIVE`, aucun gain) ;
  - dispatch : rayon de l'agent, rayon de diffusion, créneau passé masqué ;
  - absence : SMS à +2 h, remise en `OPEN` à +24 h, check-in tardif refusé ;
  - chaque règle anti-fraude ;
  - rapprochement d'invitation et de fiche Places (nom normalisé, correspondance par code postal ou par téléphone, fiche à zone desservie sans adresse, pro avec `existingPlaceId` exclu, cas à plusieurs candidates) ;
  - `sms.handleInbound` (1–5, NO, autre texte, pas de SMS en attente).
- **Paiements** : `runPayoutBatch` avec un faux client Stripe : succès, erreur définitive, délai dépassé puis reprise (transfert déjà créé retrouvé par `transfer_group` → aucun second transfert ; aucun transfert → recréation), agent `SUSPENDED` payé, lot relancé sans double paiement.
- **Facturation** : le premier paiement ignore les factures à 0 $ et celles payées avant `convertedAt`, cherche dans le bon compte, et prend la plus ancienne restante.
- **Bout en bout** (Playwright) : candidature → certification → acceptation → checklist complète avec GPS et caméra simulés → validation admin → gain visible côté agent. Avec des données réalistes : noms d'entreprises longs, vraies adresses US, 15 photos.

## 13. Périmètre et découpage

**V1**, en 3 phases livrables séparément :
1. **Cœur** : landing, candidature, formation, contrat, pros, missions + dispatch + checklist PWA + absence, file de validation + anti-fraude, `ledger`, SMS, journal des actions admin.
2. **Paiements** : Stripe Connect Express, virements du vendredi, écran « Earnings ».
3. **Fiche en ligne et client** : module `listing` (compte dédié, invitations, vérification, détection Places, « Fiches à confirmer »), conversion et module `billing`, pilotage.

**V2 (hors périmètre)** : pages SEO par ville, parrainage d'agents, classement des agents, accès anticipé aux missions pour le niveau Gold, compteur « $X paid » sur la landing, création automatique des missions de retour et du bonus urgence, détection de photos réutilisées (empreinte d'image), virements automatiques, signaux API GBP de ces fiches dans gmb-tracker.

## 14. À faire avant le lancement (hors code)

Elles ne changent pas le design : ce sont des comptes, des contenus ou des valeurs de configuration.

- **Test terrain avant la phase 3** : sur une fiche non vérifiée, Google laisse-t-il ajouter un gestionnaire ? Le résultat change seulement la formation et le texte de l'étape 4, pas le code.
- Nom de marque et domaine de la plateforme.
- Fournisseur d'emails et sa clé (Resend par défaut).
- Twilio : enregistrement A2P 10DLC (obligatoire pour envoyer des SMS aux US) et numéro dédié.
- Compte Google gestionnaire dédié (à créer) et client OAuth avec accès à l'API Business Profile (le projet GCP de gmb-tracker y a déjà accès) ; clé API Places.
- Compte Stripe de la LLC US (Connect activé) et clé restreinte en lecture sur chaque compte Stripe de facturation des clients (codes de la base leadgen, par exemple `WLS`).
- Relecture du contrat d'agent par un avocat US (point d'attention : Californie, loi AB5).
- Montants définitifs des paliers (les défauts de la section 6.1 sont réglables).
- Les vidéos des 5 modules de formation (qui les tourne).
- Qui fait les appels de pré-qualification des pros.
