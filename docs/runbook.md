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
