# The Scientist - Medical Literature Review Platform

A desktop-first web application for comprehensive medical literature reviews with AI-assisted screening and evidence synthesis.

## Architecture

- **Monorepo**: 3 packages (`web`, `server`, `shared/schemas`)
- **Frontend**: React 18 + TypeScript + Vite, 3-pane desktop layout
- **Backend**: Node.js + TypeScript + Fastify, PostgreSQL + Redis + MinIO
- **AI Integration**: OpenAI GPT-5 with fallback mock provider

## Quick Start

1. **Start infrastructure**:
   ```bash
   docker-compose up -d
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Setup database**:
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Start development**:
   ```bash
   pnpm dev
   ```

## Features

- **Intake**: Problem Profile (PICO/MeSH) with AI-generated anchors
- **Search**: PubMed integration with deduplication and PRISMA tracking
- **Screening**: Decision Cards with 65-point scoring rubric
- **Evidence Ledger**: Claims and Supports with page/sentence locators
- **Draft System**: IMRaD sections with citation management
- **AI Explorer**: Unverified narrative generation (screening-first guardrails)
- **Exports**: DOCX, BibTeX, PRISMA.svg, Ledger.json

## Guardrails

- Parsed-text-only quotes with page/sentence locators
- Draft cites Ledger items only
- AI Explorer imports citations only (no direct draft writes)
- Version everything (queries, prompts, model/version, decisions)

## Development

- **Health Check**: http://localhost:3000/api/v1/health
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)
- **Database**: PostgreSQL on localhost:5432
- **Redis**: localhost:6379
