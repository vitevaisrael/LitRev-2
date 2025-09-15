-- CreateTable: JournalBlocklist
CREATE TABLE "JournalBlocklist" (
    "id" TEXT NOT NULL DEFAULT uuid(),
    "issn" TEXT,
    "note" TEXT,
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalBlocklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SavedSearch
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL DEFAULT uuid(),
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queryManifest" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SearchRun
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL DEFAULT uuid(),
    "savedSearchId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SearchResult
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL DEFAULT uuid(),
    "searchRunId" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "flags" JSONB NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PrismaLog
CREATE TABLE "PrismaLog" (
    "id" TEXT NOT NULL DEFAULT uuid(),
    "projectId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrismaLog_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "SavedSearch_projectId_idx" ON "SavedSearch"("projectId");
CREATE INDEX "SearchRun_savedSearchId_idx" ON "SearchRun"("savedSearchId");
CREATE INDEX "SearchResult_searchRunId_idx" ON "SearchResult"("searchRunId");
CREATE INDEX "SearchResult_canonicalHash_idx" ON "SearchResult"("canonicalHash");
CREATE INDEX "PrismaLog_projectId_createdAt_idx" ON "PrismaLog"("projectId", "createdAt");

-- Foreign keys
ALTER TABLE "SavedSearch"
  ADD CONSTRAINT "SavedSearch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SearchRun"
  ADD CONSTRAINT "SearchRun_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SearchResult"
  ADD CONSTRAINT "SearchResult_searchRunId_fkey" FOREIGN KEY ("searchRunId") REFERENCES "SearchRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PrismaLog"
  ADD CONSTRAINT "PrismaLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

