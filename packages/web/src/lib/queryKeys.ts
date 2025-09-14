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
