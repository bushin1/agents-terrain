-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('APPLICANT', 'TRAINING', 'LOCKED', 'REFUSED', 'CERTIFIED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProStatus" AS ENUM ('TO_CALL', 'AGREED', 'MISSION_OPEN', 'VISITED', 'LISTING_LIVE', 'CLIENT', 'LOST');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('VISIT', 'RETURN_VISIT');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('OPEN', 'ACCEPTED', 'SUBMITTED', 'NEEDS_FIX', 'VALIDATED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('LOGO', 'VEHICLE', 'TEAM', 'EQUIPMENT', 'JOB');

-- CreateEnum
CREATE TYPE "EarningTier" AS ENUM ('VISIT', 'LIVE', 'CLIENT', 'RETURN_VISIT', 'URGENCY');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PAYABLE', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "FraudType" AS ENUM ('CHECKIN_FAR', 'DUPLICATE_PRO', 'PHOTO_EXIF_MISMATCH', 'PRO_DENIED', 'LOW_PRO_RATING', 'NO_SHOW', 'LATE_SYNC');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'SETTER');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "zip" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMiles" INTEGER NOT NULL,
    "hasCar" BOOLEAN NOT NULL,
    "availability" TEXT[],
    "status" "AgentStatus" NOT NULL DEFAULT 'APPLICANT',
    "phoneVerifiedAt" TIMESTAMP(3),
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "contractVersion" TEXT,
    "contractSignedAt" TIMESTAMP(3),
    "contractSignedName" TEXT,
    "contractIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingAttempt" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pro" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "timeZone" TEXT NOT NULL,
    "trade" TEXT NOT NULL,
    "status" "ProStatus" NOT NULL DEFAULT 'TO_CALL',
    "notes" TEXT,
    "existingPlaceId" TEXT,
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "proId" TEXT NOT NULL,
    "agentId" TEXT,
    "type" "MissionType" NOT NULL DEFAULT 'VISIT',
    "parentMissionId" TEXT,
    "status" "MissionStatus" NOT NULL DEFAULT 'OPEN',
    "slotAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "needsFixAt" TIMESTAMP(3),
    "fixMessage" TEXT,
    "rejectReason" TEXT,
    "cancelReason" TEXT,
    "broadcastRadiusMiles" INTEGER,
    "urgencyBonusCents" INTEGER NOT NULL DEFAULT 0,
    "suggestedCategory" TEXT NOT NULL,
    "instructions" TEXT,
    "reminderSentAt" TIMESTAMP(3),
    "noShowSmsAt" TIMESTAMP(3),
    "postVisitSmsAt" TIMESTAMP(3),
    "proRating" INTEGER,
    "proDenied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" "PhotoCategory" NOT NULL,
    "exifTakenAt" TIMESTAMP(3),
    "exifLat" DOUBLE PRECISION,
    "exifLng" DOUBLE PRECISION,
    "clientAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "tier" "EarningTier" NOT NULL,
    "baseAmountCents" INTEGER NOT NULL,
    "levelBonusPct" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PAYABLE',
    "voidReason" TEXT,
    "voidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FraudFlag" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "type" "FraudType" NOT NULL,
    "detail" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundSms" (
    "id" TEXT NOT NULL,
    "fromPhone" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "missionId" TEXT,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundSms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "email" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_phone_key" ON "Agent"("phone");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "OtpCode_phone_createdAt_idx" ON "OtpCode"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "TrainingAttempt_agentId_createdAt_idx" ON "TrainingAttempt"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "Pro_status_idx" ON "Pro"("status");

-- CreateIndex
CREATE INDEX "Pro_phone_idx" ON "Pro"("phone");

-- CreateIndex
CREATE INDEX "Mission_status_slotAt_idx" ON "Mission"("status", "slotAt");

-- CreateIndex
CREATE INDEX "Mission_agentId_status_idx" ON "Mission"("agentId", "status");

-- CreateIndex
CREATE INDEX "Mission_proId_idx" ON "Mission"("proId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_missionId_key" ON "Submission"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_storageKey_key" ON "Photo"("storageKey");

-- CreateIndex
CREATE INDEX "Photo_submissionId_idx" ON "Photo"("submissionId");

-- CreateIndex
CREATE INDEX "Earning_agentId_status_idx" ON "Earning"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Earning_missionId_tier_key" ON "Earning"("missionId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "FraudFlag_missionId_agentId_type_key" ON "FraudFlag"("missionId", "agentId", "type");

-- CreateIndex
CREATE INDEX "InboundSms_handled_createdAt_idx" ON "InboundSms"("handled", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "TrainingAttempt" ADD CONSTRAINT "TrainingAttempt_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_proId_fkey" FOREIGN KEY ("proId") REFERENCES "Pro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_parentMissionId_fkey" FOREIGN KEY ("parentMissionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FraudFlag" ADD CONSTRAINT "FraudFlag_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
