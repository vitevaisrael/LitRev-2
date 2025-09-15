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
