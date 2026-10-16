-- Trace de l'acceptation de la charte par l'agent avant révélation de la cible
ALTER TABLE "Mission" ADD COLUMN "charteAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Mission" ADD COLUMN "charteAcceptedIp" TEXT;
