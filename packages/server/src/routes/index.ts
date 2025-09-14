import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { projectsRoutes } from './projects';
import { intakeRoutes } from './intake';
import { screenRoutes } from './screen';
import { candidatesRoutes } from './candidates';
import { explorerRoutes } from './explorer';
import { env } from '../config/env';

export async function routes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(projectsRoutes);
  await fastify.register(intakeRoutes);
  await fastify.register(screenRoutes);
  await fastify.register(candidatesRoutes);
  
  // Register explorer routes only if feature is enabled
  if (env.FEATURE_EXPLORER) {
    await fastify.register(explorerRoutes);
  }
}
