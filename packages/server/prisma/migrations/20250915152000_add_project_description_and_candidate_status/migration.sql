-- Add missing columns to align schema with application
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "description" TEXT;

ALTER TABLE "Candidate" ADD COLUMN IF NOT EXISTS "status" TEXT;

