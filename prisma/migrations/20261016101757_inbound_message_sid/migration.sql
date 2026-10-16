/*
  Warnings:

  - A unique constraint covering the columns `[messageSid]` on the table `InboundSms` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "InboundSms" ADD COLUMN     "messageSid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InboundSms_messageSid_key" ON "InboundSms"("messageSid");
