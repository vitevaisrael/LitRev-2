# The Scientist — Parent App (Foundation Release)

**Engineering Specification v1.2**

## 0) Summary

A desktop-first web app that delivers an end-to-end medical literature workflow:

**Intake → Search/Dedupe → Screening (Decision Cards) → Evidence Ledger → DIY Draft → Exports**, plus an **AI Explorer Draft (Unverified)** that can run in parallel or standalone, generating complete systematic reviews from topics/findings and feeding **citations** (not text) into the normal screening flow.

**Hard guardrails:**
- Models reason over **parsed text only**.
- **Locator-or-block**: no Support without `{page, sentence}`.
- Draft can cite **Ledger items only**.
- **Version everything** (queries, prompts, model/version, decisions).

---

## 1) System Architecture

### 1.1 Monorepo Structure

packages/
web/                 React + TS + Vite
server/              Node + TS + Fastify
shared/schemas/      Zod validators + shared types

### 1.2 Services (Docker Compose)

- **PostgreSQL 15** (primary database)
- **Redis 7** (BullMQ job queues)
- **MinIO** (S3-compatible for PDFs/exports) - console on :9001

### 1.3 Technology Stack

**Backend:**
- Fastify server with Pino logging
- Prisma ORM with PostgreSQL
- Zod validation (strict schemas)
- BullMQ for background jobs

**Frontend:**
- React 18 + TypeScript + Vite
- TanStack Query for server state
- Tailwind CSS + Radix/shadcn components
- Lucide icons

**LLM Integration:**
- OpenAI GPT-5 Thinking (with Tools) via provider interface
<<<<<<< HEAD
- Mock provider fallback when OPENAI_API_KEY missing; model and temperature can be configured via OPENAI_MODEL and OPENAI_TEMPERATURE
=======
- Mock provider fallback when OPENAI_API_KEY missing; model and temperature configurable via OPENAI_MODEL and OPENAI_TEMPERATURE
>>>>>>> origin/main
- Temperature 0 for screening decisions

**PDF Processing:**
- pdfjs-dist (Node legacy build) + sentence splitter
- Output format: `{ pages:[{page, sentences:[{idx,text}]}] }`

### 1.4 Ports & Environment

**Default Ports:**
- API: 3000 (BASE_URL=http://localhost:3000/api/v1)
- Web: Vite dev server (typically 5173)
- MinIO: 9000 (console: 9001)

**Environment Variables:**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/thescientist
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_me
COOKIE_SECRET=change_me_cookie
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=thescientist
OPENAI_API_KEY= (optional; mock if empty)
OPENAI_MODEL=
OPENAI_TEMPERATURE=
UNPAYWALL_EMAIL=you@example.com
FEATURE_EXPLORER=true


⸻

2) Data Model (Prisma Schema)

2.1 Core Tables

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  projects     Project[]
}

model Project {
  id           String   @id @default(uuid())
  ownerId      String
  owner        User     @relation(fields: [ownerId], references: [id])
  title        String
  settings     Json     // { preferOA: boolean }
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  prisma       Prisma?  @relation(fields: [id], references: [projectId])
  problemProfile ProblemProfile?
  candidates   Candidate[]
  decisions    Decision[]
  parsedDocs   ParsedDoc[]
  claims       Claim[]
  supports     Support[]
  drafts       Draft[]
  explorerRuns ExplorerRun[]
  auditLogs    AuditLog[]
  jobStatuses  JobStatus[]
}

model ProblemProfile {
  id         String   @id @default(uuid())
  projectId  String   @unique
  project    Project  @relation(fields: [projectId], references: [id])
  version    String
  population Json
  exposure   Json
  comparator Json
  outcomes   Json
  timeframe  Json     // { from:int, to:int }
  mesh       Json
  include    Json
  exclude    Json
  notes      String?
  createdAt  DateTime @default(now())
}

model Candidate {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  doi         String?  @db.VarChar(255)
  pmid        String?  @db.VarChar(32)
  title       String
  journal     String
  year        Int
  authors     Json?
  abstract    String?
  links       Json?    // { oaUrl?, publisherUrl?, pubmedUrl? }
  flags       Json?    // { retracted?:bool, predatory?:bool }
  score       Json?    // { design, directness, recency, journal, total }
  createdAt   DateTime @default(now())
  decisions   Decision[]
  parsedDoc   ParsedDoc?
  supports    Support[]
  @@index([projectId])
  @@index([doi])
  @@index([pmid])
  @@index([title, year])
  @@index([projectId, createdAt])
}

model Decision {
  id            String   @id @default(uuid())
  projectId     String
  candidateId   String
  action        String   // include|exclude|better|ask
  reason        String?
  justification String?
  stage         String   // title_abstract|full_text
  userId        String
  ts            DateTime @default(now())
  project       Project  @relation(fields: [projectId], references: [id])
  candidate     Candidate @relation(fields: [candidateId], references: [id])
  @@index([projectId])
  @@index([candidateId])
  @@index([projectId, ts])
}

model Prisma {
  projectId  String  @id
  identified Int     @default(0)
  duplicates Int     @default(0)
  screened   Int     @default(0)
  included   Int     @default(0)
  excluded   Int     @default(0)
  project    Project @relation(fields: [projectId], references: [id])
}

model ParsedDoc {
  id          String   @id @default(uuid())
  projectId   String
  candidateId String   @unique
  storageKey  String   // S3 key: projects/{id}/candidates/{id}.pdf
  textJson    Json     // [{page:int, sentences:[{idx:int, text:string}]}]
  createdAt   DateTime @default(now())
  project     Project  @relation(fields: [projectId], references: [id])
  candidate   Candidate @relation(fields: [candidateId], references: [id])
}

model Claim {
  id        String   @id @default(uuid())
  projectId String
  text      String
  section   String?
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id])
  supports  Support[]
  @@index([projectId])
}

model Support {
  id           String   @id @default(uuid())
  projectId    String
  claimId      String
  candidateId  String
  quote        String
  locator      Json     // { page:int≥1, sentence:int≥1 }
  evidenceType String?
  createdAt    DateTime @default(now())
  project      Project  @relation(fields: [projectId], references: [id])
  claim        Claim    @relation(fields: [claimId], references: [id])
  candidate    Candidate @relation(fields: [candidateId], references: [id])
  @@index([projectId])
  @@index([claimId])
  @@index([candidateId])
  @@index([projectId, candidateId])
}

model Draft {
  id         String   @id @default(uuid())
  projectId  String
  section    String
  content    String
  citations  Json?    // References to Ledger items only
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  project    Project  @relation(fields: [projectId], references: [id])
  @@index([projectId])
}

model ExplorerRun {
  runId     String   @id @default(uuid())
  projectId String
  prompt    String
  model     String   // GPT-5 with browsing
  output    Json     // { outline?, narrative?, refs[] }
  createdAt DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id])
}

2.2 New Tables (v1.2)

model AuditLog {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  action    String   // "project_created" | "decision_made" | "export_run" | ...
  details   Json     // Flexible audit details
  timestamp DateTime @default(now())
  project   Project  @relation(fields: [projectId], references: [id])
  @@index([projectId, timestamp])
}

model JobStatus {
  jobId     String   @id
  projectId String
  type      String   // "search" | "ingest" | "explorer"
  status    String   // "pending" | "running" | "completed" | "failed"
  progress  Json?    // { step, count, total }
  error     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  project   Project  @relation(fields: [projectId], references: [id])
  @@index([projectId, updatedAt])
}


⸻

3) Shared Validation (Zod Schemas)

3.1 Common Types

// packages/shared/schemas/src/common.ts
import { z } from 'zod';

export const UUIDSchema = z.string().uuid();
export const DOISchema = z.string().regex(/^10\.\S+$/);
export const PMIDSchema = z.string().regex(/^[0-9]+$/);

export const LocatorSchema = z.object({
  page: z.number().int().min(1),
  sentence: z.number().int().min(1)
}).strict();

export const ActionSchema = z.enum(["include", "exclude", "better", "ask"]);
export const StageSchema = z.enum(["title_abstract", "full_text"]);

export const TimestampSchema = z.string().datetime();

3.2 Pagination

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional()
}).strict();

export const PaginatedResponseSchema = <T>(itemSchema: z.ZodType<T>) =>
  z.object({
    ok: z.literal(true),
    data: z.object({
      items: z.array(itemSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number()
    })
  });

3.3 Request Validation

// packages/shared/schemas/src/screen.ts
export const DecideBodySchema = z.object({
  candidateId: UUIDSchema,
  action: ActionSchema,
  reason: z.string().optional(),
  justification: z.string().optional(),
  stage: StageSchema.optional()
}).refine((data) => {
  // Exclude requires reason
  if (data.action === "exclude" && !data.reason) {
    return false;
  }
  return true;
}, {
  message: "Reason is required when action is 'exclude'",
  path: ["reason"]
}).strict();

export const SupportCreateSchema = z.object({
  claimId: UUIDSchema,
  candidateId: UUIDSchema,
  quote: z.string().min(1),
  locator: LocatorSchema, // REQUIRED
  evidenceType: z.string().optional()
}).strict();


⸻

4) API Specification (v1)

4.1 Response Format

Uniform Response Shape:

// Success
{ ok: true, data: any }

// Error  
{ 
  ok: false, 
  error: { 
    code: string,        // "VALIDATION_ERROR", "NOT_FOUND", etc.
    message: string, 
    details?: any,       // Field-level errors
    requestId: string    // For tracing
  }
}

Rate Limit Headers (stub):

X-RateLimit-Limit: 100
X-RateLimit-Remaining: 100  
X-RateLimit-Reset: <epoch+60s>

4.2 Core Routes

Health & Projects:
	•	GET /api/v1/health → { status: "healthy", timestamp }
	•	GET /api/v1/projects → List projects (recent first)
	•	POST /api/v1/projects { title } → Create project + AuditLog

Intake (stub):
	•	POST /api/v1/projects/:id/intake/plan { note? } → { profile, anchors[], miniAbstract, outline[] }

Candidates (paginated):
	•	GET /api/v1/projects/:id/candidates?q&year_min&year_max&journal&status&page&pageSize → PaginatedResponse

4.3 Screening
	•	POST /api/v1/projects/:id/screen/propose { candidateId } → LLM/mock proposal (no DB write)
	•	POST /api/v1/projects/:id/decide { candidateId, action, reason?, justification?, stage? } → Persist decision + update PRISMA + AuditLog
	•	POST /api/v1/projects/:id/decide/bulk { decisions: DecideBody[] } → Bulk decisions in transaction

4.4 Evidence Ledger
	•	GET /api/v1/projects/:id/ledger/claims → List claims
	•	POST /api/v1/projects/:id/ledger/claims { text, section? } → Create claim
	•	POST /api/v1/projects/:id/ledger/supports { claimId, candidateId, quote, locator, evidenceType? } → Create support (reject if locator missing)

4.5 Draft
	•	GET /api/v1/projects/:id/draft → Current sections
	•	POST /api/v1/projects/:id/draft { section, content, citations? } → Upsert draft section
	•	POST /api/v1/projects/:id/draft/suggest-citations { section, text } → Citation suggestions (stub)
	•	POST /api/v1/projects/:id/draft/tighten { section, text } → LLM text improvement (stub)
	•	POST /api/v1/projects/:id/draft/coverage { section, text } → Citation coverage analysis (stub)

4.6 Exports
	•	POST /api/v1/projects/:id/exports/docx → Generate DOCX file
	•	POST /api/v1/projects/:id/exports/bibtex → Generate BibTeX file
	•	POST /api/v1/projects/:id/exports/prisma → Generate PRISMA flow SVG
	•	POST /api/v1/projects/:id/exports/ledger → Export evidence ledger JSON

4.7 AI Explorer (Unverified)
	•	POST /api/v1/projects/:id/explorer/run { prompt?, model? } → Create JobStatus, return jobId
	•	GET /api/v1/projects/:id/explorer/:runId → Get explorer artifact
	•	POST /api/v1/projects/:id/explorer/import { runId, refs[] } → Import citations as Candidates (no Draft writes)
	•	POST /api/v1/explorer/standalone { topic, findings?, model? } → Create standalone review (no project required)
	•	GET /api/v1/explorer/standalone/:runId → Get standalone review artifact

⸻

5) Background Jobs

5.1 Job Queues
	•	searchQueue: PubMed search → enrich → dedupe → update PRISMA
	•	ingestQueue: PDF fetch/upload → parse → store S3 + ParsedDoc
	•	explorerQueue: LLM browsing → generate draft → store artifact
	•	standaloneExplorerQueue: LLM browsing → generate standalone review → store artifact

5.2 Job Status Tracking

All jobs create JobStatus records with progress updates:

{
  step: string,    // "searching", "enriching", "deduplicating"
  count: number,   // Items processed  
  total: number    // Total items
}


⸻

6) Frontend Architecture

6.1 Routes
	•	/login - Authentication
	•	/projects - Project list
	•	/project/:id/intake - Problem profile setup
	•	/project/:id/screen - Decision cards
	•	/project/:id/ledger - Evidence management
	•	/project/:id/draft - Document editor
	•	/project/:id/exports - Export center
	•	/project/:id/explorer - AI explorer

6.2 Layout System

Desktop 3-Pane Shell:
	•	C1: List/Queue (candidates, claims, etc.)
	•	C2: Main step view (active workflow)
	•	C3: Context pane (PRISMA, audit log, details)

6.3 Key Components

interface DecisionCardProps {
  candidate: Candidate;
  parsedDoc?: ParsedDoc;
  score: ScoreBreakdown;
  onInclude: (reason?: string, justification?: string) => void;
  onExclude: (reason: string, justification?: string) => void;  
  onBetter: (reason?: string) => void;
  onAsk: (question?: string) => void;
}

interface CandidateListProps {
  items: Candidate[];
  filters: CandidateFilters;
  pagination: PaginationState;
  onSelect: (candidate: Candidate) => void;
  onFilterChange: (filters: CandidateFilters) => void;
}

interface ClaimDetailProps {
  claim: Claim;
  supports: Support[];
  onAddSupport: (support: CreateSupportRequest) => void;
}

6.4 Keyboard Shortcuts
	•	1-5: Navigate workflow steps
	•	I: Include current candidate
	•	X: Exclude current candidate
	•	B: Mark for better screening
	•	A: Open AI Explorer
	•	E: Export options
	•	?: Help overlay

6.5 TanStack Query Keys

export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: string) => ['project', id] as const,
  profile: (id: string) => ['profile', id] as const,
  candidates: (id: string, filters?: any) => ['candidates', id, filters] as const,
  parsed: (candidateId: string) => ['parsed', candidateId] as const,
  prisma: (id: string) => ['prisma', id] as const,
  'ledger-claims': (id: string) => ['ledger-claims', id] as const,
  supports: (claimId: string) => ['supports', claimId] as const,
  draft: (id: string) => ['draft', id] as const,
  'explorer-runs': (id: string) => ['explorer-runs', id] as const,
  'explorer-run': (id: string, runId: string) => ['explorer-run', id, runId] as const,
} as const;


⸻

7) LLM Integration

7.1 Screening System Prompt

Screen this study for the systematic review profile: {ProblemProfile JSON}.

Use only the provided parsed text for supporting quotes. Do not invent or paraphrase quotes.

Output valid JSON only:
{
  "action": "include|exclude|better|ask",
  "justification": "Brief explanation of decision",
  "supports": [{"quote": "exact text", "locator": {"page": int, "sentence": int}}],
  "quickRob": {
    "selection": "Low/High/Unclear risk", 
    "performance": "Low/High/Unclear risk",
    "reporting": "Low/High/Unclear risk"
  },
  "confidence": 0.85
}

If no supporting quotes found in parsed text, set supports:[] and consider "ask" or "better" action.

7.2 Explorer System Prompt

Generate an unverified systematic review outline and draft paragraphs for: {topic from ProblemProfile}.

Browse scholarly sources (NIH, PubMed, PMC, major publishers only).

Output valid JSON:
{
  "outline": ["Introduction", "Methods", "Results", "Discussion"],
  "narrative": [
    {
      "section": "Introduction", 
      "text": "...", 
      "refs": [{"doi": "10.1001/...", "pmid": "12345"}]
    }
  ],
  "refs": [
    {
      "title": "...",
      "doi": "10.1001/...",
      "pmid": "12345", 
      "journal": "...",
      "year": 2023
    }
  ]
}

Provide DOI or PMID for each reference. Do not fabricate identifiers.


⸻

8) Scoring Rubric

Decision Card Scoring (0-65 total):
	•	Design (0-40): SR/MA(40), RCT(35), Prospective cohort(28), Case-control(22), Retrospective cohort(20), Case series(8), Case report(4)
	•	Directness (0-10): Exact PICO match(10) → off-topic(0)
	•	Recency (0-5): ≤2 years(5), ≤5 years(3), older(1), very old(0)
	•	Journal (0-5): Reputable journal signal (capped at 5)

Display breakdown with tooltips explaining each component.

⸻

9) Deduplication Rules

Processing Order:
	1.	Exact DOI match → merge records
	2.	Exact PMID match → merge records
	3.	Fuzzy title match (Levenshtein ≤ 0.1×length) + same year → merge records

PRISMA Updates:
	•	After search: identified += fetched, duplicates += merged
	•	On decision: screened += 1, then included += 1 OR excluded += 1

⸻

10) Security & Observability

10.1 Logging
	•	Request Context: Include requestId in all responses
	•	Audit Context: Log projectId/userId when available
	•	Error Tracking: Structured error logging with Pino

10.2 Audit Trail

Write AuditLog entries for:
	•	Project creation/updates
	•	Screening decisions (individual and bulk)
	•	Evidence ledger changes
	•	Export operations
	•	Explorer runs

10.3 Security
	•	Authentication: JWT with httpOnly cookies
	•	Authorization: Project ownership validation
	•	CORS: Restrict to application origin
	•	Secrets: Server-side only, never exposed to client
	•	File Storage: S3-compatible with signed URLs

⸻

11) Seed Data

Test Project: "IgAN & Uveitis"

const seedData = {
  project: {
    title: "IgAN & Uveitis", 
    settings: { preferOA: true }
  },
  candidates: [
    {
      title: "Corticosteroids in IgA Nephropathy: A Systematic Review",
      journal: "JAMA",
      year: 2023,
      doi: "10.1001/jama.2023.12345",
      pmid: "37123456",
      abstract: "Background: The role of corticosteroids in IgA nephropathy remains controversial..."
    },
    {
      title: "Adalimumab for Non-Infectious Uveitis: Long-term Outcomes",  
      journal: "New England Journal of Medicine",
      year: 2024,
      doi: "10.1056/NEJMoa2023.45678", 
      pmid: "38234567",
      abstract: "Background: TNF-alpha inhibitors show promise in treating uveitis..."
    },
    {
      title: "IgA Nephropathy: Pathogenesis and Treatment Updates",
      journal: "Nature Reviews Nephrology", 
      year: 2023,
      doi: "10.1038/s41581-023-00123",
      pmid: "37345678",
      abstract: "IgA nephropathy is the most common primary glomerulonephritis worldwide..."
    }
  ],
  parsedDoc: {
    candidateId: "[first candidate ID]",
    pages: [
      {
        page: 1,
        sentences: [
          { idx: 1, text: "IgA nephropathy is the most common primary glomerulonephritis worldwide." },
          { idx: 2, text: "The role of corticosteroids in treating IgA nephropathy remains controversial." },
          { idx: 3, text: "Recent randomized controlled trials have shown mixed results for steroid therapy." }
        ]
      },
      {
        page: 2, 
        sentences: [
          { idx: 1, text: "Proteinuria reduction is a key outcome measure in IgA nephropathy studies." },
          { idx: 2, text: "Long-term kidney function preservation should be the primary endpoint." }
        ]
      }
    ]
  }
};


⸻

12) Acceptance Criteria

Foundation Release "Done" Requirements:
	1.	Infrastructure: API health endpoint responds; database connects; basic auth works
	2.	Projects: Create/list projects functions; project settings persist
	3.	Candidates: Paginated candidate list with basic filters (q, year, journal, status)
	4.	Screening: Decision Card shows parsed quotes with page/sentence locators; Include/Exclude updates PRISMA counters and writes AuditLog entries
	5.	Evidence Ledger: Create claims and supports; enforce locator requirement; reject invalid locators
	6.	Draft: Insert citation chips referencing Ledger items only; basic text editing
	7.	Exports: Generate minimal DOCX, BibTeX, PRISMA SVG, and Ledger JSON files
	8.	Explorer: Run generates artifact with refs; import creates Candidates for screening; no direct Draft writes
	9.	Standalone Explorer: Generate complete systematic reviews from topics without requiring existing project

Quality Gates:
	•	All API requests validate with Zod schemas
	•	All database operations use Prisma with proper error handling
	•	All LLM calls include model version tracking
	•	All user actions create appropriate audit log entries

⸻

13) AI Review Chat Interface (Future Enhancement)

13.1 Chat Mode Overview

A conversational interface that allows users to generate complete systematic reviews through an AI chat assistant. The assistant can:
- Ask clarifying questions about the research topic
- Generate research plans and outlines
- Browse scholarly sources automatically
- Create structured review content
- Offer import/export actions

13.2 Chat Data Model

```prisma
model ChatSession {
  id         String   @id @default(uuid())
  projectId  String?  // Assigned once review is generated
  topic      String
  findings   String?
  status     String   @default("pending") // pending|waiting_user|running|completed|failed
  runId      String?  // ExplorerRun.runId for the artifact
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  messages   ChatMessage[]
  @@index([createdAt])
}

model ChatMessage {
  id          String   @id @default(uuid())
  sessionId   String
  role        String   // user|assistant|tool|system
  content     String   // markdown/plaintext
  payload     Json?    // tool results, artifacts, etc.
  createdAt   DateTime @default(now())
  session     ChatSession @relation(fields: [sessionId], references: [id])
  @@index([sessionId, createdAt])
}
```

13.3 Chat API Endpoints

- POST /api/v1/chat/sessions { topic, findings? } → Create chat session
- GET /api/v1/chat/sessions/:id → Get session with messages
- POST /api/v1/chat/sessions/:id/messages { message } → Send user message
- POST /api/v1/chat/sessions/:id/import → Import generated review to project

13.4 Implementation Strategy

**Phase 1: Backend Foundation (Current)**
- Real PubMed integration with ESearch/EFetch
- BullMQ job queues for explorer workflow
- Enhanced ExplorerRun model with proper artifact storage
- Real LLM integration with structured prompts

**Phase 2: Chat Interface (Future)**
- Conversational UI for topic refinement
- AI assistant that can ask clarifying questions
- Integration with existing Explorer backend
- Seamless import to project workflow

⸻

14) Development Scripts

{
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build", 
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "db:migrate": "cd packages/server && pnpm prisma migrate dev",
    "db:seed": "cd packages/server && pnpm prisma db seed",
    "db:reset": "cd packages/server && pnpm prisma migrate reset",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down"
  }
}

Setup Sequence:
	1.	pnpm install - Install dependencies
	2.	pnpm docker:up - Start infrastructure
	3.	pnpm db:migrate - Run database migrations
	4.	pnpm db:seed - Load test data
	5.	pnpm dev - Start development servers
