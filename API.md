# API Documentation

This document describes the REST API endpoints for The Scientist platform.

## Base URL

All API endpoints are prefixed with `/api/v1`.

## Response Format

All successful responses follow this format:
```json
{
  "ok": true,
  "data": { ... }
}
```

Error responses follow this format:
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Authentication

Currently, the API uses a default user ID for all operations. In a production environment, this would be replaced with JWT-based authentication.

## Endpoints

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "ok": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### Projects

#### GET /projects
List all projects.

**Response:**
```json
{
  "ok": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "title": "Project Title",
        "ownerId": "uuid",
        "settings": { "preferOA": true },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "prisma": {
          "projectId": "uuid",
          "identified": 10,
          "duplicates": 2,
          "screened": 5,
          "included": 3,
          "excluded": 2
        }
      }
    ]
  }
}
```

#### POST /projects
Create a new project.

**Request:**
```json
{
  "title": "Project Title"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "project": { ... }
  }
}
```

#### GET /projects/:id/prisma
Get PRISMA flow data for a project.

**Response:**
```json
{
  "ok": true,
  "data": {
    "prisma": {
      "projectId": "uuid",
      "identified": 10,
      "duplicates": 2,
      "screened": 5,
      "included": 3,
      "excluded": 2
    }
  }
}
```

#### GET /projects/:id/audit-logs
Get audit log entries for a project.

**Query Parameters:**
- `limit` (optional): Maximum number of entries to return (default: 20, max: 100)

**Response:**
```json
{
  "ok": true,
  "data": {
    "auditLogs": [
      {
        "id": "uuid",
        "projectId": "uuid",
        "userId": "uuid",
        "action": "project_created",
        "details": { "title": "Project Title" },
        "ts": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### Candidates

#### GET /projects/:id/candidates
List candidates for a project with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Items per page (default: 20)
- `q` (optional): Search query for title/abstract
- `year_min` (optional): Minimum publication year
- `year_max` (optional): Maximum publication year
- `journal` (optional): Journal name filter
- `status` (optional): Decision status (`included`, `excluded`, `undecided`)

**Response:**
```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Paper Title",
        "journal": "Journal Name",
        "year": 2023,
        "doi": "10.1000/example",
        "pmid": "12345678",
        "authors": ["Author 1", "Author 2"],
        "abstract": "Paper abstract...",
        "score": {
          "design": 35,
          "directness": 10,
          "recency": 5,
          "journal": 5,
          "total": 55
        },
        "decisions": [
          {
            "id": "uuid",
            "action": "include",
            "reason": "Meets inclusion criteria",
            "ts": "2024-01-01T00:00:00.000Z"
          }
        ]
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### Decisions

#### POST /projects/:id/decide
Record a single decision for a candidate.

**Request:**
```json
{
  "candidateId": "uuid",
  "action": "include",
  "reason": "Meets inclusion criteria",
  "justification": "Detailed justification...",
  "stage": "title_abstract"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "decision": {
      "id": "uuid",
      "candidateId": "uuid",
      "action": "include",
      "reason": "Meets inclusion criteria",
      "justification": "Detailed justification...",
      "stage": "title_abstract",
      "projectId": "uuid",
      "userId": "uuid",
      "ts": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### POST /projects/:id/decide/bulk
Record multiple decisions in a single transaction.

**Request:**
```json
{
  "decisions": [
    {
      "candidateId": "uuid",
      "action": "include",
      "reason": "Meets inclusion criteria",
      "stage": "title_abstract"
    },
    {
      "candidateId": "uuid",
      "action": "exclude",
      "reason": "Does not meet criteria",
      "stage": "title_abstract"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "decisions": [
      { ... },
      { ... }
    ]
  }
}
```

### Ledger

#### GET /projects/:id/ledger/claims
List all claims for a project.

**Response:**
```json
{
  "ok": true,
  "data": {
    "claims": [
      {
        "id": "uuid",
        "title": "Claim Title",
        "description": "Claim description",
        "source": "Source information",
        "projectId": "uuid",
        "userId": "uuid",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "supports": [
          {
            "id": "uuid",
            "claimId": "uuid",
            "page": 3,
            "sentence": 2,
            "text": "Supporting text quote"
          }
        ]
      }
    ]
  }
}
```

#### POST /projects/:id/ledger/claims
Create a new claim.

**Request:**
```json
{
  "title": "Claim Title",
  "description": "Claim description",
  "source": "Source information"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "claim": {
      "id": "uuid",
      "title": "Claim Title",
      "description": "Claim description",
      "source": "Source information",
      "projectId": "uuid",
      "userId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### POST /projects/:id/ledger/supports
Create a new support for a claim.

**Request:**
```json
{
  "claimId": "uuid",
  "candidateId": "uuid",
  "quote": "Supporting text quote",
  "locator": {
    "page": 3,
    "sentence": 2
  }
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "support": {
      "id": "uuid",
      "claimId": "uuid",
      "candidateId": "uuid",
      "quote": "Supporting text quote",
      "locator": {
        "page": 3,
        "sentence": 2
      },
      "evidenceType": null,
      "projectId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### Explorer (Feature Flag: FEATURE_EXPLORER=true)

#### POST /projects/:id/explorer/run
Start an AI Explorer run.

**Request:**
```json
{
  "prompt": "Generate a systematic review outline",
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "jobId": "uuid"
  }
}
```

#### GET /projects/:id/explorer/:runId
Get the results of an Explorer run.

**Response:**
```json
{
  "ok": true,
  "data": {
    "explorer": {
      "runId": "uuid",
      "projectId": "uuid",
      "status": "completed",
      "outline": ["Section 1", "Section 2"],
      "narrative": [
        {
          "section": "Introduction",
          "text": "Generated text...",
          "refs": [{ "doi": "10.1000/example" }]
        }
      ],
      "refs": [
        {
          "title": "Paper Title",
          "journal": "Journal Name",
          "year": 2023,
          "doi": "10.1000/example"
        }
      ]
    }
  }
}
```

#### POST /projects/:id/explorer/import
Import selected references as candidates.

**Request:**
```json
{
  "runId": "uuid",
  "refs": [
    {
      "title": "Paper Title",
      "journal": "Journal Name",
      "year": 2023,
      "doi": "10.1000/example",
      "pmid": "12345678"
    }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "data": {
    "imported": [
      {
        "id": "uuid",
        "title": "Paper Title",
        "journal": "Journal Name",
        "year": 2023,
        "doi": "10.1000/example",
        "pmid": "12345678",
        "projectId": "uuid"
      }
    ]
  }
}
```

## Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `NOT_FOUND`: Resource not found
- `DATABASE_ERROR`: Database operation failed
- `DECISION_ERROR`: Decision recording failed
- `BULK_DECISION_ERROR`: Bulk decision recording failed
- `LEDGER_ERROR`: Ledger operation failed
- `EXPLORER_ERROR`: Explorer operation failed
- `IMPORT_ERROR`: Import operation failed
- `SCREENING_ERROR`: Screening operation failed

## Rate Limiting

All endpoints include rate limiting headers in responses:
- `X-RateLimit-Limit`: Request limit per window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
