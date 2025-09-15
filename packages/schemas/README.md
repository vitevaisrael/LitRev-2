@app/schemas

Purpose
- Baseline contracts + Zod validators for The Scientist’s pipeline.

Included (Phase 2 complete)
- JSON Schema (2020-12): Alignment Packet, Evidence Decision Card, Source Citation, PRISMA Record, Search Plan, Model Routing.
- Zod parsers + types (one file per schema, with index barrel), fixtures, and tests (fixtures validate + failing guardrails).

Usage
- Import validators and types from built output; `z.infer<typeof parser>` yields types.
- JSON Schema can be derived from Zod with `zod-to-json-schema` if needed.

Data Handling
- No real patient/PII data; fixtures use placeholders only.
