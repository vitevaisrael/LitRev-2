import { FastifyInstance } from 'fastify';
import { sendSuccess, sendError } from '../utils/response';
import { prisma } from '../lib/prisma';
import { calculateScore } from '../utils/scoreCalculator';

export async function scoringRoutes(fastify: FastifyInstance) {
  // POST /api/v1/projects/:id/candidates/:cid/recompute-score
  fastify.post('/projects/:id/candidates/:cid/recompute-score', async (request, reply) => {
    try {
      const { id: projectId, cid: candidateId } = request.params as { id: string; cid: string };
      
      // Get candidate
      const candidate = await prisma.candidate.findFirst({
        where: { 
          id: candidateId,
          projectId 
        }
      });
      
      if (!candidate) {
        return sendError(reply, 'NOT_FOUND', 'Candidate not found', 404);
      }
      
      // Get problem profile for scoring
      const problemProfile = await prisma.problemProfile.findUnique({
        where: { projectId }
      });
      
      // Calculate new score
      const score = calculateScore(
        candidate.title,
        candidate.journal,
        candidate.year,
        candidate.abstract || undefined,
        problemProfile ? {
          population: problemProfile.population,
          exposure: problemProfile.exposure,
          comparator: problemProfile.comparator,
          outcomes: problemProfile.outcomes
        } : undefined
      );
      
      // Update candidate with new score
      const updatedCandidate = await prisma.candidate.update({
        where: { id: candidateId },
        data: { score: score as any }
      });
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: candidate.projectId, // Using projectId as userId for now
          action: 'score_recomputed',
          details: {
            candidateId,
            oldScore: candidate.score,
            newScore: score as any
          }
        }
      });
      
      return sendSuccess(reply, { 
        candidateId,
        score,
        message: 'Score recomputed successfully'
      });
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'SCORING_ERROR', error.message, 500);
      }
      return sendError(reply, 'SCORING_ERROR', 'Failed to recompute score', 500);
    }
  });
}
