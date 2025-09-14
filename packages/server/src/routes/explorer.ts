import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { JobStatusSchema } from '@the-scientist/schemas';

const ExplorerRunSchema = z.object({
  prompt: z.string().optional(),
  model: z.string().optional()
}).strict();

const ImportRefsSchema = z.object({
  runId: z.string().uuid(),
  refs: z.array(z.object({
    doi: z.string().optional(),
    pmid: z.string().optional(),
    title: z.string().optional(),
    journal: z.string().optional(),
    year: z.number().int().optional()
  }))
}).strict();

export async function explorerRoutes(fastify: FastifyInstance) {
  // GET /api/v1/job-status/:jobId
  fastify.get('/job-status/:jobId', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      
      const jobStatus = await prisma.jobStatus.findUnique({
        where: { jobId }
      });

      if (!jobStatus) {
        return sendError(reply, 'NOT_FOUND', 'Job not found', 404);
      }

      return sendSuccess(reply, { jobStatus });
    } catch (error) {
      return sendError(reply, 'JOB_STATUS_ERROR', 'Failed to fetch job status', 500);
    }
  });

  // POST /api/v1/job-status/:jobId/retry
  fastify.post('/job-status/:jobId/retry', async (request, reply) => {
    try {
      const { jobId } = request.params as { jobId: string };
      
      const jobStatus = await prisma.jobStatus.findUnique({
        where: { jobId }
      });

      if (!jobStatus) {
        return sendError(reply, 'NOT_FOUND', 'Job not found', 404);
      }

      if (jobStatus.status !== 'failed') {
        return sendError(reply, 'INVALID_STATE', 'Job is not in failed state', 400);
      }

      // Reset job status to pending and restart simulation
      await prisma.jobStatus.update({
        where: { jobId },
        data: {
          status: 'pending',
          progress: { step: 'initializing', count: 0, total: 4 },
          error: null,
          updatedAt: new Date()
        }
      });

      // Restart the simulation process
      const simulateProgress = async () => {
        const steps = [
          { step: 'planning', count: 1, total: 4 },
          { step: 'browsing', count: 2, total: 4 },
          { step: 'drafting', count: 3, total: 4 },
          { step: 'finalizing', count: 4, total: 4 }
        ];

        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
          
          await prisma.jobStatus.update({
            where: { jobId },
            data: {
              status: 'running',
              progress: step,
              updatedAt: new Date()
            }
          });
        }

        // Create ExplorerRun with canned data (same as original)
        const runId = randomUUID();
        const explorerRun = await prisma.explorerRun.create({
          data: {
            runId,
            projectId: jobStatus.projectId,
            prompt: 'Generate systematic review outline',
            model: 'gpt-4',
            output: {
              outline: [
                'Introduction and Background',
                'Methods and Search Strategy',
                'Results and Analysis',
                'Discussion and Conclusions'
              ],
              narrative: [
                {
                  section: 'Introduction',
                  text: 'This systematic review examines the effectiveness of treatment interventions for the specified condition. The review follows PRISMA guidelines and includes comprehensive analysis of available evidence.',
                  refs: [{ doi: '10.1000/example1' }]
                },
                {
                  section: 'Methods',
                  text: 'A comprehensive search strategy was developed using multiple databases including PubMed, Embase, and Cochrane Library. Studies were screened according to predefined inclusion and exclusion criteria.',
                  refs: [{ doi: '10.1000/example2' }]
                }
              ],
              refs: [
                {
                  title: 'Effectiveness of Treatment A in Clinical Practice',
                  journal: 'New England Journal of Medicine',
                  year: 2023,
                  doi: '10.1000/example1',
                  pmid: '12345678'
                },
                {
                  title: 'Systematic Review Methodology Best Practices',
                  journal: 'Cochrane Database of Systematic Reviews',
                  year: 2022,
                  doi: '10.1000/example2',
                  pmid: '87654321'
                },
                {
                  title: 'Meta-analysis of Treatment Outcomes',
                  journal: 'The Lancet',
                  year: 2023,
                  doi: '10.1000/example3',
                  pmid: '11223344'
                },
                {
                  title: 'Clinical Guidelines for Treatment Selection',
                  journal: 'JAMA',
                  year: 2022,
                  doi: '10.1000/example4',
                  pmid: '44332211'
                },
                {
                  title: 'Patient-Reported Outcomes in Treatment Studies',
                  journal: 'BMJ',
                  year: 2023,
                  doi: '10.1000/example5',
                  pmid: '55667788'
                }
              ]
            }
          }
        });

        // Mark job as completed with runId
        await prisma.jobStatus.update({
          where: { jobId },
          data: {
            status: 'completed',
            progress: { step: 'completed', count: 4, total: 4, runId },
            updatedAt: new Date()
          }
        });
      };

      // Start simulation in background
      simulateProgress().catch(async (error) => {
        await prisma.jobStatus.update({
          where: { jobId },
          data: {
            status: 'failed',
            error: error.message,
            updatedAt: new Date()
          }
        });
      });

      return sendSuccess(reply, { message: 'Job retry initiated' });
    } catch (error) {
      return sendError(reply, 'JOB_RETRY_ERROR', 'Failed to retry job', 500);
    }
  });

  // POST /api/v1/projects/:id/explorer/run
  fastify.post('/projects/:id/explorer/run', {
    preHandler: async (request, reply) => {
      try {
        request.body = ExplorerRunSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { prompt, model } = request.body as { prompt?: string; model?: string };
      
      // Create job status
      const jobId = randomUUID();
      const jobStatus = await prisma.jobStatus.create({
        data: {
          jobId,
          projectId,
          type: 'explorer',
          status: 'pending',
          progress: { step: 'initializing', count: 0, total: 4 }
        }
      });

      // Simulate progress steps
      const simulateProgress = async () => {
        const steps = [
          { step: 'planning', count: 1, total: 4 },
          { step: 'browsing', count: 2, total: 4 },
          { step: 'drafting', count: 3, total: 4 },
          { step: 'finalizing', count: 4, total: 4 }
        ];

        for (const step of steps) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5s delay
          
          await prisma.jobStatus.update({
            where: { jobId },
            data: {
              status: 'running',
              progress: step,
              updatedAt: new Date()
            }
          });
        }

        // Create ExplorerRun with canned data
        const runId = randomUUID();
        const explorerRun = await prisma.explorerRun.create({
          data: {
            runId,
            projectId,
            prompt: prompt || 'Generate systematic review outline',
            model: model || 'gpt-4',
            output: {
              outline: [
                'Introduction and Background',
                'Methods and Search Strategy',
                'Results and Analysis',
                'Discussion and Conclusions'
              ],
              narrative: [
                {
                  section: 'Introduction',
                  text: 'This systematic review examines the effectiveness of treatment interventions for the specified condition. The review follows PRISMA guidelines and includes comprehensive analysis of available evidence.',
                  refs: [{ doi: '10.1000/example1' }]
                },
                {
                  section: 'Methods',
                  text: 'A comprehensive search strategy was developed using multiple databases including PubMed, Embase, and Cochrane Library. Studies were screened according to predefined inclusion and exclusion criteria.',
                  refs: [{ doi: '10.1000/example2' }]
                }
              ],
              refs: [
                {
                  title: 'Effectiveness of Treatment A in Clinical Practice',
                  journal: 'New England Journal of Medicine',
                  year: 2023,
                  doi: '10.1000/example1',
                  pmid: '12345678'
                },
                {
                  title: 'Systematic Review Methodology Best Practices',
                  journal: 'Cochrane Database of Systematic Reviews',
                  year: 2022,
                  doi: '10.1000/example2',
                  pmid: '87654321'
                },
                {
                  title: 'Meta-analysis of Treatment Outcomes',
                  journal: 'The Lancet',
                  year: 2023,
                  doi: '10.1000/example3',
                  pmid: '11223344'
                },
                {
                  title: 'Clinical Guidelines for Treatment Selection',
                  journal: 'JAMA',
                  year: 2022,
                  doi: '10.1000/example4',
                  pmid: '44332211'
                },
                {
                  title: 'Patient-Reported Outcomes in Treatment Studies',
                  journal: 'BMJ',
                  year: 2023,
                  doi: '10.1000/example5',
                  pmid: '55667788'
                }
              ]
            }
          }
        });

        // Mark job as completed with runId
        await prisma.jobStatus.update({
          where: { jobId },
          data: {
            status: 'completed',
            progress: { step: 'completed', count: 4, total: 4, runId },
            updatedAt: new Date()
          }
        });
      };

      // Start simulation in background
      simulateProgress().catch(async (error) => {
        await prisma.jobStatus.update({
          where: { jobId },
          data: {
            status: 'failed',
            error: error.message,
            updatedAt: new Date()
          }
        });
      });
      
      return sendSuccess(reply, { jobId });
    } catch (error) {
      return sendError(reply, 'EXPLORER_ERROR', 'Failed to start explorer run', 500);
    }
  });

  // GET /api/v1/projects/:id/explorer/:runId
  fastify.get('/projects/:id/explorer/:runId', async (request, reply) => {
    try {
      const { id: projectId, runId } = request.params as { id: string; runId: string };
      
      const explorerRun = await prisma.explorerRun.findFirst({
        where: { runId, projectId }
      });

      if (!explorerRun) {
        return sendError(reply, 'NOT_FOUND', 'Explorer run not found', 404);
      }

      return sendSuccess(reply, { explorer: explorerRun });
    } catch (error) {
      return sendError(reply, 'EXPLORER_ERROR', 'Failed to fetch explorer run', 500);
    }
  });

  // POST /api/v1/projects/:id/explorer/import
  fastify.post('/projects/:id/explorer/import', {
    preHandler: async (request, reply) => {
      try {
        request.body = ImportRefsSchema.parse(request.body);
      } catch (error) {
        return sendError(reply, 'VALIDATION_ERROR', 'Invalid request body', 422);
      }
    }
  }, async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const { runId, refs } = request.body as { runId: string; refs: any[] };
      
      const imported = await prisma.$transaction(async (tx) => {
        const candidates = [];
        
        for (const ref of refs) {
          // Check if candidate already exists
          const existing = await tx.candidate.findFirst({
            where: {
              projectId,
              OR: [
                ref.doi ? { doi: ref.doi } : undefined,
                ref.pmid ? { pmid: ref.pmid } : undefined
              ].filter(Boolean) as any[]
            }
          });

          if (!existing && (ref.doi || ref.pmid)) {
            const candidate = await tx.candidate.create({
              data: {
                projectId,
                doi: ref.doi,
                pmid: ref.pmid,
                title: ref.title || 'Unknown Title',
                journal: ref.journal || 'Unknown Journal',
                year: ref.year || new Date().getFullYear()
              }
            });
            candidates.push(candidate);
          }
        }

        return candidates;
      });

      return sendSuccess(reply, { imported });
    } catch (error) {
      return sendError(reply, 'IMPORT_ERROR', 'Failed to import references', 500);
    }
  });
}
