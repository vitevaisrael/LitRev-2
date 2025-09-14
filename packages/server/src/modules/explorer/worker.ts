import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { PubMedAdapter } from '../search/pubmedAdapter';
import { OpenAIProvider } from '../llm/openai';
import { MockProvider } from '../llm/mock';

interface ExplorerJobData {
  projectId: string;
  prompt?: string; // Topic / user prompt
  model?: string;
}

export function startExplorerWorker() {
  const connection = new IORedis(env.REDIS_URL);

  const worker = new Worker<ExplorerJobData>(
    'explorer',
    async (job: Job<ExplorerJobData>) => {
      const { projectId, prompt, model } = job.data;

      const updateStatus = async (data: any) => {
        await prisma.jobStatus.update({
          where: { jobId: job.id as string },
          data: { status: 'running', progress: data }
        });
      };

      // Step 1: planning
      await updateStatus({ step: 'planning', count: 1, total: 4 });

      const problemProfile = await prisma.problemProfile.findUnique({ where: { projectId } });
      const topic = prompt || (problemProfile ? `${problemProfile.population} — ${problemProfile.exposure} vs ${problemProfile.comparator} for ${problemProfile.outcomes}` : 'systematic review topic');

      // Step 2: browsing (PubMed)
      await updateStatus({ step: 'browsing', count: 2, total: 4 });
      const pubmed = new PubMedAdapter();
      let refs = [] as any[];
      try {
        refs = await pubmed.search(String(topic), 10);
      } catch (e) {
        // Fallback to mock refs
        refs = [
          { pmid: '12345678', title: `Mock result for ${topic}`, journal: 'Mock Journal', year: new Date().getFullYear(), authors: ['Author A'], abstract: 'Mock abstract.' }
        ];
      }

      // Step 3: drafting (LLM)
      await updateStatus({ step: 'drafting', count: 3, total: 4 });
      const provider = env.OPENAI_API_KEY ? new OpenAIProvider() : new MockProvider();
      const profileForLLM = problemProfile ? {
        topic,
        population: problemProfile.population,
        exposure: problemProfile.exposure,
        comparator: problemProfile.comparator,
        outcomes: problemProfile.outcomes
      } : { topic };
      const explorerOutput = await provider.generateExplorer(profileForLLM);

      // Step 4: finalizing — persist ExplorerRun
      await updateStatus({ step: 'finalizing', count: 4, total: 4 });
      const runId = crypto.randomUUID();
      await prisma.explorerRun.create({
        data: {
          runId,
          projectId,
          prompt: String(topic),
          model: model || (env.OPENAI_API_KEY ? 'openai' : 'mock'),
          output: explorerOutput
        }
      });

      await prisma.jobStatus.update({
        where: { jobId: job.id as string },
        data: { status: 'completed', progress: { step: 'completed', count: 4, total: 4, runId } }
      });

      return { runId };
    },
    { connection }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    try {
      await prisma.jobStatus.update({
        where: { jobId: job.id as string },
        data: { status: 'failed', error: err.message }
      });
    } catch {}
  });

  return worker;
}

