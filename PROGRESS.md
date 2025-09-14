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

## Task 9 - PDF Upload + Parse → ParsedDoc + Sentences Panel ✅
- Added S3 storage wrapper module for MinIO with automatic bucket creation
- Added PDF upload endpoint: POST /api/v1/projects/:id/candidates/:cid/pdf
- Added PDF parsing using existing pdfjs-dist + sentence splitter
- Added ParsedDoc read endpoint: GET /api/v1/projects/:id/candidates/:cid/parsed
- Added Zod validation schemas for PDF endpoints with proper error handling
- Added frontend PDF upload button and file picker in DecisionCard component
- Created Sentences panel with search functionality and real-time filtering
- Support PDF file upload to S3 with automatic parsing and storage
- Create audit log entries for PDF attachments with page/sentence counts
- Real-time UI updates after PDF upload with searchable sentence display

## Task 10 - Scoring Breakdown (0–65) + UI tooltips ✅
- Added scoreCalculator.ts utility with design, directness, recency, journal scoring
- Created journalSignal.json with journal impact scores (NEJM/Lancet/JAMA=5, etc.)
- Added score computation to candidate creation/import with problem profile integration
- Added recompute-score endpoint: POST /api/v1/projects/:id/candidates/:cid/recompute-score
- Include score in GET candidates response (already included in existing endpoint)
- Added score display to CandidateList showing 'Score NN/65'
- Added score tooltip to DecisionCard with 4-part breakdown and recompute button
- Design scoring: SR/MA=40, RCT=35, Prospective=28, Case-control=22, etc.
- Directness scoring: keyword overlap with ProblemProfile (exact=10, close=7, partial=3, off=0)
- Recency scoring: year-based (≤2y=5, ≤5y=3, older=1, very old=0)
- Journal scoring: impact factor mapping capped at 5
- Real-time score recomputation with audit logging

## Task 11 - Candidate Filters UI ✅
- Added FilterBar component with q, year_min, year_max, journal, status filters
- Wire filters to existing GET /api/v1/projects/:id/candidates endpoint
- Preserve filter state in component with reset functionality
- Ensure pagination works correctly with filters applied
- Reset to page 1 when filters change
- Compact filter bar above CandidateList with responsive layout
- Support text search, year range, journal filtering, and status filtering
- Real-time filtering with existing paginated endpoint

## Task 12 - Draft API + Editor Persistence ✅
- Add Zod schemas for draft endpoints in shared/schemas/draft.ts
- Add GET /api/v1/projects/:id/draft endpoint to fetch all draft sections
- Add POST /api/v1/projects/:id/draft endpoint with citation validation
- Validate citations are Support IDs in same project; reject otherwise
- Create audit log entries for draft saves with section and citation count
- Update DraftEditor to load on mount and autosave with 800ms debounce
- Add Insert citation panel listing Supports with quote and locator
- Insert inline citation chips [SUPPORT:xxxx] format
- Real-time autosave with visual feedback
- Citation validation ensures only valid Support IDs are accepted
- Draft persistence across reloads with proper error handling

## Task 13 - Exports v1 (Markdown, BibTeX, PRISMA.svg, Ledger.json) ✅
- Add POST /api/v1/projects/:id/exports/markdown endpoint with complete report generation
- Add POST /api/v1/projects/:id/exports/bibtex endpoint with included studies
- Add POST /api/v1/projects/:id/exports/prisma endpoint with SVG flow diagram
- Add POST /api/v1/projects/:id/exports/ledger endpoint with JSON evidence structure
- Create ExportCenter frontend component with 4 download buttons
- Generate markdown with problem profile, draft sections, and formatted references
- Generate BibTeX with DOI and PMID information for included studies
- Generate PRISMA SVG with current screening statistics and visual flow
- Generate ledger JSON with claims, supports, and candidate metadata
- Create audit log entries for each export type
- Automatic file download with proper headers and filenames
- User-friendly export interface with loading states and descriptions

## Task 14 - Intake (Problem Profile save + Plan stub) ✅
- Add GET /api/v1/projects/:id/intake/profile endpoint to fetch existing profile
- Add POST /api/v1/projects/:id/intake/profile endpoint for upsert with Zod validation
- Add POST /api/v1/projects/:id/intake/plan endpoint to generate plan from saved profile
- Update ProblemProfile.tsx to load existing profile on mount
- Add Save Profile functionality with loading states and error handling
- Add Generate Plan functionality with mini-abstract and PICO anchors
- Create audit log entries for profile saves
- Display generated plan in right context pane (C3) with mini-abstract, anchors, and outline
- Plan generation uses saved profile data to create structured review plan
- Real-time UI updates with proper loading states and user feedback

## Task 15 - Explorer polish: job status + run view + selective import ✅
- Added GET /api/v1/job-status/:jobId endpoint for job status tracking with 404 handling
- Updated POST /projects/:id/explorer/run with stepwise progress simulation (planning → browsing → drafting → finalizing)
- Created ExplorerRun with canned data including outline, narrative sections, and 5 references with DOI/PMID
- Added job status polling in frontend with 2-second intervals until completion/failure
- Added progress bar display showing current step, count/total, and error states
- Connected real ExplorerRun data to ExplorerPanel with selective import functionality
- Import selected refs calls existing POST /projects/:id/explorer/import with real runId
- Automatic refetch of candidates, PRISMA widget, and audit logs after import
- Visible stepwise progress with results appearing and selected refs importing as Candidates

## Task 16 - Evidence Capture: quote picker from ParsedDoc → Support ✅
- Fixed POST /projects/:id/ledger/supports endpoint schema to match Prisma model (quote, locator, candidateId)
- Added candidate validation to ensure candidate belongs to project before creating support
- Added "Capture Quote" button in DecisionCard component with purple styling
- Created quote picker UI with claim selection dropdown and searchable sentence list
- Added sentence selection with visual highlighting and preview of selected quote
- Integrated with existing parsed document endpoint for fetching sentences
- Added support creation mutation with proper error handling and success feedback
- Automatic refetch of supports for active claim and audit logs after quote capture
- Quote picker shows page/sentence locator information and validates claim/candidate selection
- Selected sentences create Support records with correct locator and appear immediately in ClaimDetail

## Task 17 - PRISMA dashboard widget (trend & mini-flow) ✅
- Extended GET /api/v1/projects/:id/prisma to include history array of counters from audit logs
- Built history from decision_made, candidate_imported, and project_created audit log events
- Added mini flow display showing identified → duplicates → screened → included/excluded progression
- Created SVG sparkline showing "screened per day" trend with proper scaling and visualization
- Added history data to PrismaWidget component with optional history parameter
- Updated Project.tsx to pass history data to PrismaWidget in right context pane (C3)
- Widget shows current counts and basic trend curve that updates after new decisions/imports
- History synthesis creates single point from current totals if no audit log history exists

## Task 18 - Batch Screening Mode + keyboard helpers ✅
- Added Batch mode toggle in CandidateList with checkbox in header area
- Implemented auto-advance functionality that clears selected candidate after decisions
- Added progress bar (screened/total) above CandidateList with percentage display
- Enhanced keyboard shortcuts with proper 'ask' action (A key) and 'explorer' action (R key)
- Created HelpOverlay component showing all keyboard shortcuts with organized sections
- Added help overlay state management and keyboard shortcut (? key) to show/hide overlay
- Integrated help overlay into Project component with proper z-index and modal styling
- Batch mode enables rapid screening workflow with automatic progression to next candidate
- Progress bar updates in real-time as decisions are made and candidates are screened

## Task 19 - Retry/resume for jobs + robust error toasts ✅
- Added POST /api/v1/job-status/:jobId/retry endpoint for failed Explorer jobs
- Implemented job retry functionality that resets status to pending and restarts simulation
- Updated sendError utility to include requestId parameter for consistent error tracking
- Created centralized ToastProvider with useToast hook for error/success notifications
- Added retry action buttons in error toasts for JobStatus failures
- Integrated toast system into Project component with proper error handling
- Added retry button in job status display when Explorer jobs fail
- All API errors now include requestId and consistent error.code values
- Failed Explorer jobs can be retried and complete successfully with proper user feedback

## Task 20 - Help & Empty States + Quick Tour ✅
- Created EmptyState component with icons, descriptions, and action buttons
- Added friendly empty states for each step (Screening, Evidence, Exports) with explainers
- Created QuickTour component with 6-step guided tour of main features
- Added localStorage flag to show tour only on first visit
- Integrated empty states into Project component for better user guidance
- Added tour completion tracking and automatic tour display for new users
- Empty states include primary CTAs and secondary help actions
- Quick tour covers all major features: Problem Profile, Screening, Evidence, Drafting, Exports

## Task 21 - Explorer: Real Job + PubMed Adapter (In Progress)
- Implemented BullMQ-backed Explorer job with stepwise progress (planning → browsing → drafting → finalizing)
- Worker starts with the server (skips gracefully if Redis unavailable)
- PubMed adapter uses E-utilities (ESearch + EFetch) to retrieve refs; falls back to mock if offline
- POST /projects/:id/explorer/run enqueues a job and returns jobId
- JobStatus polling unchanged; retry endpoint supported
- GET /projects/:id/explorer/:runId serves artifact persisted by the worker
- Explorer import increments PRISMA.identified and writes AuditLog { action: "import_completed", details: { added, source: 'explorer' } }
- Web: Explorer UI accepts topic input (or uses Problem Profile) and shows progress/results

Next Up:
- Harden LLM output validation and switch to a production model when OPENAI_API_KEY is present
- Add explicit error toasts and run-time guardrails in Explorer UI
- Optional: coverage metrics for narrative vs. refs
- Each empty state provides contextual help and next steps for users

## Task 21 - JWT Authentication & Authorization System ✅
- Implemented complete JWT-based authentication system with bcryptjs password hashing
- Created auth routes: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/refresh
- Added authentication middleware to protect API routes and validate JWT tokens
- Implemented project ownership validation middleware for secure data access
- Updated User model in Prisma schema to include optional name field
- Added httpOnly cookie support for secure token storage with CORS configuration
- Created frontend AuthProvider with useAuth hook for authentication state management
- Updated Login component with registration/login toggle and proper error handling
- Added ProtectedRoute component to guard authenticated routes
- Implemented user menu in TopBar with logout functionality and user profile display
- Updated API client to include credentials for cookie-based authentication
- All API endpoints now require authentication except health and auth routes
- Projects are properly isolated by user ownership with secure access validation
- Authentication system supports token refresh and secure logout with cookie clearing
