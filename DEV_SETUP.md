# Development Setup

## Quick Start
```bash
pnpm setup  # Install dependencies and show next steps
```

## Clean Start Sequence

1. Check versions: `pnpm doctor`
2. Check Docker services: `pnpm docker:check`
3. Kill existing processes: `pnpm ports:kill`
4. Clean install: `pnpm install`
5. Start services: `pnpm docker:up` (if using Docker for DB/Redis/MinIO)
6. Start backend: `pnpm -C packages/server dev`
7. Start frontend: `pnpm -C packages/web dev`

## Verification

- Web loads at http://127.0.0.1:5173
- Frontend calls `/api/...` (Vite proxy) and succeed against 127.0.0.1:3000
- No CORS errors in devtools
- `pnpm ports:check` shows expected listeners
- `pnpm ports:kill` frees them
- Node/pnpm versions pass `pnpm doctor`
- Existing Vitest still passes

## Troubleshooting

If curl requests hang, test IPv4 explicitly:
```bash
curl -4 http://127.0.0.1:5173
```

If you need to clean cache without full reinstall:
```bash
pnpm clean:cache
```

## Install Profiles: Full vs Light Mode

Some environments (CI, remote sandboxes, certain IDE agents) restrict network or filesystem writes. Use the appropriate mode:

- Full mode (local dev):
  - Requires Node 20 (see `.nvmrc`), pnpm 9 (corepack), and full network access.
  - Standard steps:
    - `pnpm install`
    - `pnpm -C packages/server dev` and `pnpm -C packages/web dev`

- Light mode (CI/sandboxes):
  - Skips heavy install scripts (Prisma generate, native builds) and avoids workspace-wide installs.
  - Recommended environment variables:
    - `export CI=1`
    - `export PRISMA_SKIP_POSTINSTALL_GENERATE=1`
    - If the runner’s Node is not 20: `export npm_config_engine_strict=false`
  - Scoped web-only flow:
    - `pnpm install:web` (equivalent to `pnpm -r -F @the-scientist/web install`)
    - `pnpm typecheck:web`
    - `pnpm build:web` (optional if the environment supports builds)

### Why this helps
- CI-safe preinstall: the root `preinstall` skips `npx only-allow pnpm` when `CI=1`.
- Prisma: use `PRISMA_SKIP_POSTINSTALL_GENERATE=1` during install; generate explicitly only when needed for server runs.
- Smaller blast radius: filter installs to `@the-scientist/web` for frontend-only tasks.
