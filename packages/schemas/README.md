@app/schemas

Purpose
- Baseline data contracts for The Scientist’s pipeline. These schemas describe the shapes passed between stages and provide Zod validators for runtime safety.

What’s Included (Phase 1)
- JSON Schema v2020-12: Alignment Packet, Evidence Decision Card, Source Citation (shared).
- Zod mirrors exporting parsers and TypeScript types.
- Minimal fixtures and Vitest specs to validate shape (by inspection; tests are not run here).

Usage
- Import Zod validators from `@app/schemas` (built output) and `z.infer<typeof ...>` for static types.
- If you wish to generate JSON Schema from Zod, use `zod-to-json-schema`. Example (not wired here):
  - `import { z } from 'zod'
     import { zodToJsonSchema } from 'zod-to-json-schema'`
  - `const schema = z.object({ ... })`
  - `const json = zodToJsonSchema(schema, { $refStrategy: 'relative' })`

Data Handling
- Do not commit any real patient or personal data.
- Fixtures use placeholders only and contain no external links.

Notes
- These contracts are intentionally conservative and may evolve as UI and pipeline integration progresses.

