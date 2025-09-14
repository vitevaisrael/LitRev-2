# Development Progress

## Task 0 - Fix Prisma 1:1 relation and migrate ✅
- Fixed Prisma schema by renaming `model Prisma` to `model PrismaData` to avoid reserved keyword
- Updated Project.prisma relation to use PrismaData
- Fixed seed script to use prismaData instead of prisma
- Migration and seeding now work successfully
- Database is now in sync with schema and contains sample data

## Task 1 - Add missing API endpoints to match spec v1.2 ✅
- Added ledger routes: GET/POST /projects/:id/ledger/claims, POST /projects/:id/ledger/supports
- Added PRISMA endpoint: GET /projects/:id/prisma
- Fixed Prisma model references from 'prisma' to 'prismaData' in screen routes
- Added strict Zod validation for all new endpoints
- All endpoints return { ok: true, data } format with proper error handling
- Added requestId to error payloads via request logging hook

## Task 2 - Wire PRISMA widget & Candidate list to real data ✅
- Updated Project page to fetch PRISMA data from API
- Added decision mutation with automatic refetch of candidates and PRISMA data
- Connected DecisionCard buttons to real API calls for include/exclude/better/ask
- PrismaWidget now displays live data from backend
- CandidateList already had real data integration with pagination
- Fixed TypeScript errors in web components
- All components now use real API data instead of mock data

## Task 3 - Minimal Audit Log UI ✅
- Added GET /projects/:id/audit-logs API endpoint with limit parameter
- Updated AuditLog component to fetch real data from API
- Added auditLogs query key for React Query caching
- Updated Project page to use real audit log data
- Decision mutations now invalidate audit log queries for live updates
- Audit log shows latest 20 entries ordered by timestamp desc
- After decisions or project creation, new entries appear without page reload

## Task 4 - Seed improvements ✅
- Seed script already creates 'IgAN & Uveitis' project with 3 realistic candidates
- Each candidate has proper metadata: title, journal, year, DOI, PMID, authors, abstract
- Includes realistic scoring (design, directness, recency, journal impact)
- Creates ParsedDoc with 3 pages and 9 sentences total
- PRISMA counters initialized with identified=3, others=0
- All data is properly linked and ready for testing the application

## Task 5 - Explorer (stub) UX ✅
- Added explorer run mutation to start AI Explorer jobs
- Added import refs mutation to import selected references as candidates
- Updated ExplorerPanel with 'Run Explorer' button and mock data
- Shows outline, narrative sections, and reference table
- Import selected refs calls POST /projects/:id/explorer/import
- On success, shows how many candidates were created and refetches CandidateList
- Can run stub Explorer job and import 1-2 refs as new Candidates
- All functionality is wired to real API endpoints

## Task 6 - Quality & DX polish ✅
- Health endpoint already exists and is used in Projects page
- Health indicator shows 'Connected' status with green/red dot
- All server routes use shared sendSuccess/sendError helpers with uniform shape
- Added ESLint configuration for server package (basic setup)
- TypeScript compilation passes for all packages
- All API endpoints return consistent { ok: true, data } format
- Error handling includes requestId via logging hook

## Task 7 - Docs ✅
- Updated README.md with Quick Start reflecting real steps (Docker up, migrate, seed, dev)
- Added URLs for all services (Web: 5173, API health: 3000, MinIO: 9001)
- Created API.md documenting all v1 endpoints with request/response examples
- Documented all endpoints: health, projects, candidates, decisions, ledger, explorer
- Included query parameters, request bodies, and response formats
- Added error codes and rate limiting information
- Both files are readable and match current behavior

## Task 8 - Import (RIS/BibTeX → Candidates) ✅
- Added import API route: POST /api/v1/projects/:id/import (multipart/form-data)
- Implemented RIS and BibTeX parsers with normalization to common format
- Added deduplication logic: exact DOI/PMID match, fuzzy title + year matching
- Create Candidate records and update PrismaData.identified counters
- Added Import button to TopBar and ImportModal component
- Frontend import flow with file picker, validation, and success handling
- Automatic refetch of candidates, PRISMA widget, and audit logs after import
- Support for .ris, .bib, .bibtex file formats with proper validation

