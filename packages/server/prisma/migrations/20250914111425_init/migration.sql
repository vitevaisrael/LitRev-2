/*
  Warnings:

  - You are about to drop the `Prisma` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Prisma" DROP CONSTRAINT "Prisma_projectId_fkey";

-- DropTable
DROP TABLE "Prisma";

-- CreateTable
CREATE TABLE "PrismaData" (
    "projectId" TEXT NOT NULL,
    "identified" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "screened" INTEGER NOT NULL DEFAULT 0,
    "included" INTEGER NOT NULL DEFAULT 0,
    "excluded" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrismaData_pkey" PRIMARY KEY ("projectId")
);

-- AddForeignKey
ALTER TABLE "PrismaData" ADD CONSTRAINT "PrismaData_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
