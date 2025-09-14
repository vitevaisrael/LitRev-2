# Explorer Architecture (Developer Notes)

This document explains how the Explorer feature is implemented so contributors can extend it (e.g., for the future Chat interface) without modifying public APIs.

## Goals
- Generate an unverified, sectioned draft (outline + paragraphs + refs) from a topic or ProblemProfile.
- Never write directly to Draft; only allow importing citations as Candidates into the normal screening flow.
- Run as a background job with clear progress, retries, and audit logs.

## High-Level Flow
1) Client calls `POST /api/v1/projects/:id/explorer/run { prompt?, model? }`.
2) `ExplorerService.launch` enqueues a job and creates `JobStatus` with `{ step: 'initializing' }`.
3) Background worker processes steps:
   - planning → browsing → drafting → finalizing
4) Worker persists `ExplorerRun { runId, output }` and sets `JobStatus: completed`.
5) Client polls `GET /api/v1/job-status/:jobId` and, once complete, fetches `GET /api/v1/projects/:id/explorer/:runId`.
6) Client may import citations via `POST /api/v1/projects/:id/explorer/import` (creates Candidates, updates PRISMA, writes AuditLog).

## Components
- Routes
  - `packages/server/src/routes/explorer.ts`
    - `POST /projects/:id/explorer/run` → `explorerService.launch(...)`
    - `GET /projects/:id/explorer/:runId` → `explorerService.getRun(...)`
    - `POST /projects/:id/explorer/import` → creates Candidates; updates `PrismaData.identified`; writes `AuditLog { action: 'import_completed' }`
- Service
  - `packages/server/src/modules/explorer/service.ts`
    - `launch({ projectId, prompt?, model?, context? })` → enqueue job + create JobStatus, return `{ jobId }`
    - `getRun(projectId, runId)` → fetches persisted `ExplorerRun`
- Queue + Worker
  - `packages/server/src/modules/explorer/queue.ts` → BullMQ queue factory
  - `packages/server/src/modules/explorer/worker.ts` → Background worker (started in `server/src/index.ts`)
    - Steps (updates `JobStatus.progress`):
      - planning: derive topic from prompt or `ProblemProfile`
      - browsing: fetch references via PubMed (E-utilities)
      - drafting: call LLM provider (OpenAI or Mock) to produce outline/narrative/refs
      - finalizing: persist `ExplorerRun`, mark job `completed { runId }`
- Providers
  - `packages/server/src/modules/llm/openai.ts` and `mock.ts` (mock used when `OPENAI_API_KEY` unset)
  - `packages/server/src/modules/search/pubmedAdapter.ts` (ESearch/EFetch)

## Data & Models
- `ExplorerRun { runId, projectId, prompt, model, output, createdAt }`
- `JobStatus { jobId, projectId, type: 'explorer', status, progress, error }`
- `PrismaData` updated by import flow (identified++)
- `AuditLog` entries for explorer/import actions

## Guardrails
- No Draft writes from Explorer.
- Only citations (refs) can be imported; screening remains the gate for evidence capture.
- Locator-or-block is enforced when creating Supports; Explorer never bypasses it.

## Configuration & Ops
- Redis required for BullMQ (`REDIS_URL`). Worker start is attempted at server boot; logs a warning if Redis is unavailable (server still runs).
- OpenAI is optional (`OPENAI_API_KEY`); mock provider is used if missing.
- PubMed E-utilities are accessed over HTTPS (no key required); failures degrade gracefully to empty refs.

## Failure Modes & Retries
- Worker marks `JobStatus` as `failed` with `error` message on exceptions.
- A retry endpoint exists for jobs (`POST /api/v1/job-status/:jobId/retry`); UI can trigger retries.
- Explorer import dedupes and is idempotent with respect to existing candidates.

## Future: Chat Integration (per CODEX_CHAT_APPROACH.md)
- The service layer allows a Chat orchestrator to call `ExplorerService.launch` without changing routes.
- Optional future `context` can be added to launch without breaking the surface API.
- `JobStatus` can support a new status like `waiting_user` (or embed a `progress.step = 'waiting_user'`).
- Full chat tables (e.g., `ChatSession`, `ChatMessage`) can be added independently and reference `ExplorerRun` artifacts.

## Testing Tips
- Launch a run with and without `prompt` to verify ProblemProfile fallback.
- Verify JobStatus progression and finalization; confirm artifact via `GET /explorer/:runId`.
- Import a subset of refs; ensure Candidates are created, PRISMA.identified increments, AuditLog written.

