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

