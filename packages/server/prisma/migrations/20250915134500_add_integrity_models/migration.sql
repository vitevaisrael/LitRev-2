-- CreateTable: JournalBlocklist
CREATE TABLE "JournalBlocklist" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "issn" TEXT NOT NULL,
    "note" TEXT,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JournalBlocklist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "JournalBlocklist_issn_key" ON "JournalBlocklist"("issn");

-- CreateTable: SavedSearch
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manifest" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SavedSearch_projectId_idx" ON "SavedSearch"("projectId");
CREATE INDEX "SavedSearch_createdBy_idx" ON "SavedSearch"("createdBy");

-- CreateTable: SearchRun
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "savedSearchId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchRun_savedSearchId_idx" ON "SearchRun"("savedSearchId");
CREATE INDEX "SearchRun_status_idx" ON "SearchRun"("status");
CREATE INDEX "SearchRun_createdAt_idx" ON "SearchRun"("createdAt");

-- CreateTable: SearchResult
CREATE TABLE "SearchResult" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "searchRunId" TEXT NOT NULL,
    "canonicalHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "doi" TEXT,
    "pmid" TEXT,
    "pmcid" TEXT,
    "source" TEXT NOT NULL,
    "authors" JSONB NOT NULL DEFAULT '[]',
    "journal" TEXT,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "abstract" TEXT,
    "meshTerms" JSONB NOT NULL DEFAULT '[]',
    "flags" JSONB NOT NULL DEFAULT '{}',
    "rawPayload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SearchResult_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SearchResult_searchRunId_idx" ON "SearchResult"("searchRunId");
CREATE INDEX "SearchResult_canonicalHash_idx" ON "SearchResult"("canonicalHash");
CREATE INDEX "SearchResult_doi_idx" ON "SearchResult"("doi");
CREATE INDEX "SearchResult_pmid_idx" ON "SearchResult"("pmid");
CREATE INDEX "SearchResult_title_year_idx" ON "SearchResult"("title","year");

-- Foreign keys
ALTER TABLE "SavedSearch"
  ADD CONSTRAINT "SavedSearch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SearchRun"
  ADD CONSTRAINT "SearchRun_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SearchResult"
  ADD CONSTRAINT "SearchResult_searchRunId_fkey" FOREIGN KEY ("searchRunId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key for JournalBlocklist.addedBy -> User.id
ALTER TABLE "JournalBlocklist"
  ADD CONSTRAINT "JournalBlocklist_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
