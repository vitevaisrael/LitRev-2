import { prisma } from '../../lib/prisma';
import { getExplorerQueue } from './queue';

export interface LaunchExplorerInput {
  projectId: string;
  prompt?: string;
  model?: string;
  context?: any; // reserved for future chat context; unused for now
}

export interface LaunchExplorerResult {
  jobId: string;
}

export class ExplorerService {
  async launch(input: LaunchExplorerInput): Promise<LaunchExplorerResult> {
    const { projectId, prompt, model } = input;

    const queue = getExplorerQueue();
    const job = await queue.add('run', { projectId, prompt, model });

    await prisma.jobStatus.create({
      data: {
        jobId: String(job.id),
        projectId,
        type: 'explorer',
        status: 'pending',
        progress: { step: 'initializing', count: 0, total: 4 }
      }
    });

    return { jobId: String(job.id) };
  }

  async getRun(projectId: string, runId: string) {
    const explorerRun = await prisma.explorerRun.findFirst({
      where: { runId, projectId }
    });
    return explorerRun;
  }
}

export const explorerService = new ExplorerService();

