import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const prisma = new PrismaClient();

// Problem Profile schema
const ProblemProfileSchema = z.object({
  version: z.string().default('1.0'),
  population: z.any(),
  exposure: z.any(),
  comparator: z.any(),
  outcomes: z.any(),
  timeframe: z.any(),
  mesh: z.any(),
  include: z.any(),
  exclude: z.any()
}).strict();

export async function intakeRoutes(fastify: FastifyInstance) {
  // GET /api/v1/projects/:id/intake/profile
  fastify.get('/projects/:id/intake/profile', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get problem profile
      const problemProfile = await prisma.problemProfile.findUnique({
        where: { projectId }
      });
      
      if (!problemProfile) {
        return sendSuccess(reply, null);
      }
      
      const result = {
        id: problemProfile.id,
        projectId: problemProfile.projectId,
        version: problemProfile.version,
        population: problemProfile.population,
        exposure: problemProfile.exposure,
        comparator: problemProfile.comparator,
        outcomes: problemProfile.outcomes,
        timeframe: problemProfile.timeframe,
        mesh: problemProfile.mesh,
        include: problemProfile.include,
        exclude: problemProfile.exclude,
        createdAt: problemProfile.createdAt.toISOString()
      };
      
      return sendSuccess(reply, result);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'INTAKE_ERROR', error.message, 500);
      }
      return sendError(reply, 'INTAKE_ERROR', 'Failed to fetch problem profile', 500);
    }
  });

  // POST /api/v1/projects/:id/intake/profile
  fastify.post('/projects/:id/intake/profile', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      const body = request.body as any;
      
      // Validate request body
      const validatedBody = ProblemProfileSchema.parse(body);
      
      // Upsert problem profile
      const problemProfile = await prisma.problemProfile.upsert({
        where: { projectId },
        update: {
          version: validatedBody.version,
          population: validatedBody.population,
          exposure: validatedBody.exposure,
          comparator: validatedBody.comparator,
          outcomes: validatedBody.outcomes,
          timeframe: validatedBody.timeframe,
          mesh: validatedBody.mesh,
          include: validatedBody.include,
          exclude: validatedBody.exclude
        },
        create: {
          projectId,
          version: validatedBody.version,
          population: validatedBody.population,
          exposure: validatedBody.exposure,
          comparator: validatedBody.comparator,
          outcomes: validatedBody.outcomes,
          timeframe: validatedBody.timeframe,
          mesh: validatedBody.mesh,
          include: validatedBody.include,
          exclude: validatedBody.exclude
        }
      });
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          projectId,
          userId: projectId, // Using projectId as userId for now
          action: 'intake_saved',
          details: {
            version: validatedBody.version
          }
        }
      });
      
      const result = {
        id: problemProfile.id,
        projectId: problemProfile.projectId,
        version: problemProfile.version,
        population: problemProfile.population,
        exposure: problemProfile.exposure,
        comparator: problemProfile.comparator,
        outcomes: problemProfile.outcomes,
        timeframe: problemProfile.timeframe,
        mesh: problemProfile.mesh,
        include: problemProfile.include,
        exclude: problemProfile.exclude,
        createdAt: problemProfile.createdAt.toISOString()
      };
      
      return sendSuccess(reply, result);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'INTAKE_ERROR', error.message, 500);
      }
      return sendError(reply, 'INTAKE_ERROR', 'Failed to save problem profile', 500);
    }
  });

  // POST /api/v1/projects/:id/intake/plan
  fastify.post('/projects/:id/intake/plan', async (request, reply) => {
    try {
      const { id: projectId } = request.params as { id: string };
      
      // Get saved problem profile
      const problemProfile = await prisma.problemProfile.findUnique({
        where: { projectId }
      });
      
      if (!problemProfile) {
        return sendError(reply, 'NOT_FOUND', 'Problem profile not found. Please save your profile first.', 404);
      }
      
      // Generate plan based on profile (canned plan for now)
      const plan = generatePlan(problemProfile);
      
      return sendSuccess(reply, plan);
    } catch (error) {
      if (error instanceof Error) {
        return sendError(reply, 'INTAKE_ERROR', error.message, 500);
      }
      return sendError(reply, 'INTAKE_ERROR', 'Failed to generate plan', 500);
    }
  });
}

// Helper function to generate plan
function generatePlan(profile: any) {
  const population = profile.population;
  const exposure = profile.exposure;
  const comparator = profile.comparator;
  const outcomes = profile.outcomes;
  
  // Generate mini-abstract
  const miniAbstract = `This systematic review will examine the effectiveness of ${exposure} compared to ${comparator} in ${population} for ${outcomes}. We will search multiple databases and include randomized controlled trials and observational studies that meet our inclusion criteria.`;
  
  // Generate anchors
  const anchors = [
    {
      id: 'pico-1',
      title: 'Population Definition',
      description: `Studies involving ${population}`,
      type: 'population'
    },
    {
      id: 'pico-2', 
      title: 'Exposure/Intervention',
      description: `Interventions involving ${exposure}`,
      type: 'exposure'
    },
    {
      id: 'pico-3',
      title: 'Comparator',
      description: `Comparison with ${comparator}`,
      type: 'comparator'
    },
    {
      id: 'pico-4',
      title: 'Outcomes',
      description: `Primary outcome: ${outcomes}`,
      type: 'outcome'
    }
  ];
  
  // Generate outline
  const outline = [
    {
      section: 'Introduction',
      description: 'Background and rationale for the review',
      status: 'pending'
    },
    {
      section: 'Methods',
      description: 'Search strategy, inclusion criteria, and data extraction',
      status: 'pending'
    },
    {
      section: 'Results',
      description: 'Study characteristics and findings',
      status: 'pending'
    },
    {
      section: 'Discussion',
      description: 'Interpretation and implications',
      status: 'pending'
    },
    {
      section: 'Conclusion',
      description: 'Summary and recommendations',
      status: 'pending'
    }
  ];
  
  return {
    anchors,
    miniAbstract,
    outline
  };
}