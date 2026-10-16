#!/bin/sh
# Applique les migrations en attente puis démarre l'app. `migrate deploy` n'efface jamais de données.
set -e
npx prisma migrate deploy
exec npm start
