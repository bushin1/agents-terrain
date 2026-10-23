-- CreateTable
CREATE TABLE "PendingReviewText" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "sourceRef" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingReviewText_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PendingReviewText_placeId_usedAt_idx" ON "PendingReviewText"("placeId", "usedAt");
