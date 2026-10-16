-- CreateEnum
CREATE TYPE "AgentLevel" AS ENUM ('STARTER', 'BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "TargetTier" AS ENUM ('SACRIFICIAL', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "QuickTaskStatus" AS ENUM ('ASSIGNED', 'SUBMITTED', 'VERIFIED', 'FAILED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "EarningTier" ADD VALUE 'QUICK_TASK';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FraudType" ADD VALUE 'REVIEW_REMOVED';
ALTER TYPE "FraudType" ADD VALUE 'REVIEW_SUSPICIOUS';

-- AlterEnum
ALTER TYPE "MissionType" ADD VALUE 'QUICK_TASK';

-- DropForeignKey
ALTER TABLE "Mission" DROP CONSTRAINT "Mission_proId_fkey";

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "level" "AgentLevel" NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "profileAnswers" JSONB,
ADD COLUMN     "selfieKey" TEXT,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Mission" ALTER COLUMN "proId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ReviewTarget" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "tier" "TargetTier" NOT NULL DEFAULT 'SACRIFICIAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxPerDay" INTEGER NOT NULL DEFAULT 1,
    "maxTotal" INTEGER NOT NULL DEFAULT 20,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickTaskResult" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "QuickTaskStatus" NOT NULL DEFAULT 'ASSIGNED',
    "reviewText" TEXT NOT NULL,
    "screenshotKey" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "survivedCheck" BOOLEAN,
    "survivedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickTaskResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewTarget_placeId_key" ON "ReviewTarget"("placeId");

-- CreateIndex
CREATE INDEX "ReviewTarget_active_tier_idx" ON "ReviewTarget"("active", "tier");

-- CreateIndex
CREATE INDEX "ReviewTarget_state_idx" ON "ReviewTarget"("state");

-- CreateIndex
CREATE UNIQUE INDEX "QuickTaskResult_missionId_key" ON "QuickTaskResult"("missionId");

-- CreateIndex
CREATE INDEX "QuickTaskResult_agentId_status_idx" ON "QuickTaskResult"("agentId", "status");

-- CreateIndex
CREATE INDEX "QuickTaskResult_targetId_createdAt_idx" ON "QuickTaskResult"("targetId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuickTaskResult_agentId_targetId_key" ON "QuickTaskResult"("agentId", "targetId");

-- CreateIndex
CREATE INDEX "Agent_level_idx" ON "Agent"("level");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_proId_fkey" FOREIGN KEY ("proId") REFERENCES "Pro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickTaskResult" ADD CONSTRAINT "QuickTaskResult_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickTaskResult" ADD CONSTRAINT "QuickTaskResult_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "ReviewTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickTaskResult" ADD CONSTRAINT "QuickTaskResult_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
