# LitRev-2 File Index

This document provides a comprehensive index of all files in the LitRev-2 project, organized by package and functionality. This will be updated as we add or modify files.

## 📁 Root Level Files

```
/Users/yaacovcorcos/LitRev-2/
├── API.md                           # API documentation
├── CODEX_CHAT_APPROACH.md          # Chat implementation approach
├── DEV_SETUP.md                    # Development setup instructions
├── FILE_INDEX.md                   # This file - comprehensive file index
├── PROGRESS.md                     # Development progress tracking
├── README.md                       # Project README
├── docker-compose.yml              # Docker services configuration
├── package.json                    # Root package.json
├── pnpm-lock.yaml                  # Package lock file
├── pnpm-workspace.yaml             # Workspace configuration
└── run_logs.zip                    # Log files archive
```

## 📁 Documentation (`docs/`)

```
docs/
├── EXPLORER-ARCHITECTURE.md        # Explorer system architecture
├── security/
│   ├── SECURITY_CHECKLIST.md      # Security best practices
│   └── THREAT_MODEL.md            # STRIDE threat model
├── specs/
│   └── parent-app-spec-v1.2.md    # Application specification
└── writing/
    ├── alignment-packet.template.md
    ├── evidence-decision-card.template.md
    ├── prisma-record.template.md
    └── style-guide.md
```

## 📁 Shared Schemas (`packages/shared/schemas/`)

```
packages/shared/schemas/
├── package.json                    # Schema package configuration
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.tsbuildinfo           # Build cache
├── src/
│   ├── index.ts                   # Main export file
│   ├── chat.ts                    # Chat-related schemas
│   ├── common.ts                  # Common schemas
│   ├── draft.ts                   # Draft schemas
│   ├── explorer.ts                # Explorer schemas
│   ├── exports.ts                 # Export schemas (enhanced with DOCX)
│   ├── intake.ts                  # Intake schemas
│   ├── ledger.ts                  # Ledger schemas
│   ├── pdf.ts                     # PDF schemas
│   ├── prisma.ts                  # Prisma schemas
│   ├── screen.ts                  # Screening schemas
│   └── search.ts                  # Search schemas
└── dist/                          # Built schemas
    ├── *.d.ts                     # Type definitions
    ├── *.d.ts.map                 # Source maps
    ├── *.js                       # Compiled JavaScript
    └── *.js.map                   # Source maps
```

## 📁 Server (`packages/server/`)

### Configuration & Setup
```
packages/server/
├── package.json                    # Server dependencies
├── tsconfig.json                   # TypeScript configuration
├── vitest.config.ts               # Test configuration
├── env.example                     # Environment variables template
└── .env                           # Environment variables (local)
```

### Database
```
packages/server/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── migrations/                # Database migrations
│   │   ├── 20250914111302_init/
│   │   ├── 20250914111425_init/
│   │   ├── 20250914154621_add_user_name/
│   │   ├── 20250914174009_add_chat_models/
│   │   ├── 20250915134400_enable_uuid_extension/
│   │   ├── 20250915134500_add_integrity_models/
│   │   ├── 20250915152000_add_project_description_and_candidate_status/
│   │   ├── 20250915160556_clean_baseline/
│   │   └── migration_lock.toml
│   └── seed.ts                    # Database seeding script
└── scripts/
    └── seed.ts                    # Seed script
```

### Source Code (`src/`)
```
packages/server/src/
├── index.ts                       # Main server entry point
├── config/
│   └── env.ts                     # Environment configuration
├── data/
│   └── journalSignal.json         # Journal impact scores
├── exports/
│   ├── docxExport.ts              # Original DOCX export
│   └── docxExport.test.ts         # DOCX export tests
├── jobs/
│   └── searchQueue.ts             # Search job queue
├── lib/
│   ├── dedupe.ts                  # Deduplication logic
│   ├── dedupe.test.ts             # Deduplication tests
│   ├── doiUtils.ts                # DOI utilities
│   ├── normalize.ts               # Data normalization
│   ├── normalize.test.ts          # Normalization tests
│   ├── prisma.ts                  # Prisma client
│   └── redis.ts                   # Redis client
├── middleware/
│   └── auth.ts                    # Authentication middleware
├── modules/
│   ├── chat/                      # Chat functionality
│   ├── explorer/                  # Explorer functionality
│   ├── exports/                   # Export modules
│   │   └── docx.ts                # Enhanced DOCX builder
│   ├── import/                    # Import functionality
│   ├── ingest/                    # Data ingestion
│   ├── llm/                       # LLM integration
│   ├── screen/                    # Screening functionality
│   ├── search/                    # Search functionality
│   └── storage/                   # Storage functionality
├── providers/
│   └── pubmed.ts                  # PubMed provider
├── routes/
│   ├── admin.ts                   # Admin routes
│   ├── admin.test.ts              # Admin tests
│   ├── auth.ts                    # Authentication routes
│   ├── candidates.ts              # Candidate routes
│   ├── chat.ts                    # Chat routes
│   ├── draft.ts                   # Draft routes
│   ├── explorer.ts                # Explorer routes
│   ├── exports.ts                 # Export routes (enhanced)
│   ├── exports.test.ts            # Export tests
│   ├── health.ts                  # Health check routes
│   ├── import.ts                  # Import routes
│   ├── index.ts                   # Route index
│   ├── intake.ts                  # Intake routes
│   ├── ledger.ts                  # Ledger routes
│   ├── pdf.ts                     # PDF routes
│   ├── projects.ts                # Project routes
│   ├── rateLimit.test.ts          # Rate limit tests
│   ├── results.ts                 # Results routes
│   ├── saved-searches.ts          # Saved search routes
│   ├── screen.ts                  # Screening routes
│   └── search-runs.ts             # Search run routes
├── services/
│   ├── integrity.ts               # Integrity checking
│   ├── integrity.test.ts          # Integrity tests
│   ├── signedUrls.ts              # Signed URL service
│   ├── signedUrls.test.ts         # Signed URL tests
│   ├── uploadValidation.ts        # Upload validation
│   └── uploadValidation.test.ts   # Upload validation tests
├── test/
│   └── setup.ts                   # Test setup
├── types/
│   ├── api.ts                     # API type definitions
│   └── citation-js.d.ts           # Citation.js types
└── utils/
    ├── response.ts                # Response utilities
    ├── scoreCalculator.ts         # Score calculation
    ├── tierLimits.ts              # Tier limits
    └── validation.ts              # Validation utilities
```

### Built Files (`dist/`)
```
packages/server/dist/
├── index.js                       # Compiled main file
├── index.d.ts                     # Type definitions
├── config/
│   └── env.js                     # Compiled environment config
├── data/
│   └── journalSignal.json         # Journal data
├── exports/
│   ├── docxExport.js              # Compiled DOCX export
│   └── docxExport.test.js         # Compiled tests
├── jobs/
│   └── searchQueue.js             # Compiled job queue
├── lib/
│   ├── dedupe.js                  # Compiled deduplication
│   ├── doiUtils.js                # Compiled DOI utils
│   ├── normalize.js               # Compiled normalization
│   ├── prisma.js                  # Compiled Prisma client
│   └── redis.js                   # Compiled Redis client
├── middleware/
│   └── auth.js                    # Compiled auth middleware
├── modules/
│   ├── chat/                      # Compiled chat modules
│   ├── explorer/                  # Compiled explorer modules
│   ├── exports/                   # Compiled export modules
│   │   └── docx.js                # Compiled DOCX builder
│   ├── import/                    # Compiled import modules
│   ├── ingest/                    # Compiled ingestion modules
│   ├── llm/                       # Compiled LLM modules
│   ├── screen/                    # Compiled screening modules
│   ├── search/                    # Compiled search modules
│   └── storage/                   # Compiled storage modules
├── providers/
│   └── pubmed.js                  # Compiled PubMed provider
├── routes/
│   ├── admin.js                   # Compiled admin routes
│   ├── auth.js                    # Compiled auth routes
│   ├── candidates.js              # Compiled candidate routes
│   ├── chat.js                    # Compiled chat routes
│   ├── draft.js                   # Compiled draft routes
│   ├── explorer.js                # Compiled explorer routes
│   ├── exports.js                 # Compiled export routes
│   ├── health.js                  # Compiled health routes
│   ├── import.js                  # Compiled import routes
│   ├── index.js                   # Compiled route index
│   ├── intake.js                  # Compiled intake routes
│   ├── ledger.js                  # Compiled ledger routes
│   ├── pdf.js                     # Compiled PDF routes
│   ├── projects.js                # Compiled project routes
│   ├── results.js                 # Compiled results routes
│   ├── saved-searches.js          # Compiled saved search routes
│   ├── screen.js                  # Compiled screening routes
│   └── search-runs.js             # Compiled search run routes
├── services/
│   ├── integrity.js               # Compiled integrity service
│   ├── signedUrls.js              # Compiled signed URL service
│   ├── uploadValidation.js        # Compiled upload validation
│   └── uploadValidation.test.js   # Compiled upload validation tests
├── test/
│   └── setup.js                   # Compiled test setup
├── types/
│   ├── api.js                     # Compiled API types
│   └── citation-js.js             # Compiled citation types
└── utils/
    ├── response.js                # Compiled response utils
    ├── scoreCalculator.js         # Compiled score calculator
    ├── tierLimits.js              # Compiled tier limits
    └── validation.js              # Compiled validation utils
```

## 📁 Web Frontend (`packages/web/`)

### Configuration & Setup
```
packages/web/
├── package.json                    # Web dependencies
├── tsconfig.json                   # TypeScript configuration
├── tsconfig.node.json             # Node TypeScript configuration
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── postcss.config.js              # PostCSS configuration
├── vitest.config.ts               # Test configuration
└── index.html                     # Main HTML file
```

### Source Code (`src/`)
```
packages/web/src/
├── main.tsx                       # Main React entry point
├── App.tsx                        # Main App component
├── components/
│   ├── chat/                      # Chat components
│   ├── draft/                     # Draft components
│   ├── explorer/                  # Explorer components
│   ├── exports/                   # Export components
│   ├── import/                    # Import components
│   ├── intake/                    # Intake components
│   ├── layout/                    # Layout components
│   ├── ledger/                    # Ledger components
│   ├── projects/                  # Project components
│   ├── ProtectedRoute.tsx         # Route protection
│   ├── screen/                    # Screening components
│   ├── shared/                    # Shared components
│   └── ui/                        # UI components (shadcn/ui)
├── hooks/
│   ├── useApi.ts                  # API hook
│   ├── useAuth.tsx                # Authentication hook
│   ├── useKeyboard.ts             # Keyboard hook
│   ├── useKeyboardShortcuts.ts    # Keyboard shortcuts hook
│   ├── useTheme.test.tsx          # Theme test
│   ├── useTheme.tsx               # Theme hook
│   └── useToast.tsx               # Toast hook
├── lib/
│   ├── api.ts                     # API client
│   ├── chatApi.ts                 # Chat API client
│   ├── notify.ts                  # Notification system
│   ├── queryClient.ts             # React Query client
│   ├── queryKeys.ts               # Query keys
│   ├── utils.test.ts              # Utils tests
│   └── utils.ts                   # Utility functions
├── pages/
│   ├── ChatReview.tsx             # Chat review page
│   ├── Login.tsx                  # Login page
│   ├── Project.tsx                # Project page
│   └── Projects.tsx               # Projects page
├── sample.test.ts                 # Sample test
├── styles/
│   └── globals.css                # Global styles
└── test/
    └── setup.ts                   # Test setup
```

### Built Files (`dist/`)
```
packages/web/dist/
├── index.html                     # Built HTML
├── vite.svg                       # Vite logo
└── assets/                        # Built assets
    ├── *.css                      # Compiled CSS
    ├── *.js                       # Compiled JavaScript
    └── *.woff2                    # Font files
```

### Public Assets
```
packages/web/public/
└── vite.svg                       # Vite logo
```

## 📁 Node Modules

```
node_modules/                      # Root node modules
packages/server/node_modules/      # Server node modules
packages/shared/schemas/node_modules/ # Schema node modules
packages/web/node_modules/         # Web node modules
```

## 🔄 **Recent Changes (DOCX Export Implementation)**

### Files Created/Modified:
- ✅ `packages/shared/schemas/src/exports.ts` - Enhanced with DOCX export schemas
- ✅ `packages/server/src/modules/exports/docx.ts` - New comprehensive DOCX builder
- ✅ `packages/server/src/routes/exports.ts` - Enhanced with new DOCX endpoint
- ✅ `packages/server/src/routes/exports.test.ts` - Comprehensive test suite
- ✅ `PROGRESS.md` - Updated with implementation details
- ✅ `FILE_INDEX.md` - This file (new)

### Files Deleted:
- ❌ `packages/shared/schemas/exports.ts` - Duplicate file removed

---

## 📝 **How to Use This Index**

1. **Find Files**: Use Ctrl+F to search for specific files or functionality
2. **Update as We Go**: This document will be updated whenever we add, modify, or remove files
3. **Path Reference**: All paths are relative to the project root (`/Users/yaacovcorcos/LitRev-2/`)
4. **Status Indicators**: 
   - ✅ = Recently created/modified
   - ❌ = Recently deleted
   - 📁 = Directory
   - 📄 = File

## 🚀 **Quick Navigation**

- **API Routes**: `packages/server/src/routes/`
- **Frontend Components**: `packages/web/src/components/`
- **Database Schema**: `packages/server/prisma/schema.prisma`
- **Shared Types**: `packages/shared/schemas/src/`
- **Configuration**: Root level config files
- **Documentation**: `docs/` directory

---

## 📁 New Files Added (PDF & DOCX Bibliography Extraction)

**Task 5 - PDF Bibliography Extraction Implementation:**
**Task 6 - DOCX Bibliography Extraction Implementation:**

### Server Package New Files:
- `packages/server/src/config/importConfig.ts` - PDF/DOCX import configuration with multilingual headers
- `packages/server/src/services/fileValidation.ts` - Magic number file validation service
- `packages/server/src/services/fileValidation.test.ts` - File validation tests
- `packages/server/src/modules/import/bibCore.ts` - Shared bibliography parsing logic
- `packages/server/src/modules/import/bibCore.test.ts` - Shared bibliography logic tests
- `packages/server/src/modules/import/extractors/pdfBibExtractor.ts` - PDF bibliography extractor
- `packages/server/src/modules/import/extractors/pdfBibExtractor.test.ts` - PDF extractor tests
- `packages/server/src/modules/import/extractors/docxBibExtractor.ts` - DOCX bibliography extractor
- `packages/server/src/modules/import/extractors/docxBibExtractor.test.ts` - DOCX extractor tests
- `packages/server/src/routes/import.test.ts` - Import route tests with PDF/DOCX support

### Updated Files:
- `packages/server/src/modules/import/parser.ts` - Enhanced with PDF/DOCX parsing support
- `packages/server/src/routes/import.ts` - Updated with PDF/DOCX import functionality
- `packages/server/env.example` - Added FEATURE_IMPORT_PDF_BIB and FEATURE_IMPORT_DOCX_BIB flags
- `packages/web/src/components/import/ImportModal.tsx` - Updated to accept PDF/DOCX files

### Dependencies Added:
- `pdf-parse` - PDF text extraction library
- `file-type` - Magic number file type detection
- `@types/pdf-parse` - TypeScript types for pdf-parse
- `mammoth` - DOCX text extraction library

## 📁 New Files Added (Auth v2 Implementation)

**Task: Auth v2 - Solid Cookie-based Auth, Dev-bypass, Ownership Guards, and Consistent Error Contract**

### Server Package New Files:
- `packages/server/src/app.ts` - Main application setup with plugin registration
- `packages/server/src/auth/` - Authentication system directory
  - `packages/server/src/auth/middleware.ts` - Authentication and ownership middleware
  - `packages/server/src/auth/jwt.ts` - JWT token management
  - `packages/server/src/auth/cookies.ts` - Cookie management utilities
- `packages/server/src/config/auth.ts` - Authentication configuration
- `packages/server/src/db/` - Database repository layer
  - `packages/server/src/db/userRepository.ts` - User database operations
  - `packages/server/src/db/projectRepository.ts` - Project database operations
- `packages/server/src/plugins/` - Security and utility plugins
  - `packages/server/src/plugins/cors.ts` - CORS configuration plugin
  - `packages/server/src/plugins/helmet.ts` - Security headers plugin
  - `packages/server/src/plugins/cookie.ts` - Cookie support plugin
  - `packages/server/src/plugins/errorHandler.ts` - Global error handler plugin
- `packages/server/src/routes/auth-v2.ts` - New authentication routes
- `packages/server/src/config/pubmed.ts` - PubMed configuration and feature flags
- `packages/server/src/modules/pubmed/` - PubMed search system
  - `packages/server/src/modules/pubmed/adapter.ts` - PubMed API integration
  - `packages/server/src/modules/pubmed/cache.ts` - Redis caching system
  - `packages/server/src/modules/pubmed/search.queue.ts` - BullMQ job system
  - `packages/server/src/modules/pubmed/routes.ts` - API routes and endpoints
- `packages/web/src/components/search/` - Search components
  - `packages/web/src/components/search/PubMedSearchPanel.tsx` - PubMed search interface

### Updated Files:
- `packages/server/src/config/env.ts` - Enhanced environment configuration with auth settings
- `packages/server/src/index.ts` - Updated with new authentication system and PubMed worker
- `packages/server/src/routes/*.ts` - All routes updated with new middleware and error handling
- `packages/shared/schemas/src/index.ts` - Export PubMed schemas
- `packages/shared/schemas/src/pubmed.ts` - PubMed API schemas and types
- `packages/web/src/hooks/useAuth.tsx` - Updated for new authentication system
- `packages/web/src/lib/api.ts` - Updated error handling and cookie support
- `packages/web/src/pages/Login.tsx` - Enhanced with dev bypass functionality

### Dependencies Added:
- `@fastify/cors` - CORS support
- `@fastify/helmet` - Security headers
- `@fastify/cookie` - Cookie support
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token handling
- `undici` - Modern HTTP client for PubMed API requests
- `p-retry` - Retry logic for robust API calls
- `p-limit` - Concurrency control for rate limiting

---

*Last Updated: 2025-01-15 - Auth v2 Implementation Complete*
