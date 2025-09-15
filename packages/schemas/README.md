@app/schemas

Purpose
- Baseline contracts + Zod validators for The Scientist’s pipeline.

Included (Phase 1)
- JSON Schema (2020-12): Evidence Decision Card, Source Citation.
- Zod parsers + types, fixtures, and minimal tests.

Usage
- Import validators and types from built output; `z.infer<typeof parser>` yields types.
- JSON Schema can be derived from Zod with `zod-to-json-schema` if needed.

Data Handling
- No real patient/PII data; fixtures are placeholder-only.
