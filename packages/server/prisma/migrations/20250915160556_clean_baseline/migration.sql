/*
  Warnings:

  - You are about to drop the `PrismaData` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PrismaData" DROP CONSTRAINT "PrismaData_projectId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "Candidate" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "ChatMessage" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "ChatSession" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "Claim" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "Decision" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "Draft" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "ParsedDoc" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "ProblemProfile" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "Support" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();

-- DropTable
DROP TABLE "PrismaData";

-- CreateTable
CREATE TABLE "Prisma" (
    "projectId" TEXT NOT NULL,
    "identified" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "screened" INTEGER NOT NULL DEFAULT 0,
    "included" INTEGER NOT NULL DEFAULT 0,
    "excluded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Prisma_pkey" PRIMARY KEY ("projectId")
);

-- CreateIndex
CREATE INDEX "JournalBlocklist_issn_idx" ON "JournalBlocklist"("issn");

-- CreateIndex
CREATE INDEX "SearchResult_flags_idx" ON "SearchResult" USING GIN ("flags");

-- AddForeignKey
ALTER TABLE "Prisma" ADD CONSTRAINT "Prisma_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
