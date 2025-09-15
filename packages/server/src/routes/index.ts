import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { authRoutes } from './auth';
import { projectsRoutes } from './projects';
import { intakeRoutes } from './intake';
import { screenRoutes } from './screen';
import { candidatesRoutes } from './candidates';
import { explorerRoutes } from './explorer';
import { ledgerRoutes } from './ledger';
import { pdfRoutes } from './pdf';
import { scoringRoutes } from './scoring';
import { draftRoutes } from './draft';
import { exportsRoutes } from './exports';
import { importRoutes } from './import';
import { chatRoutes } from './chat';
import { savedSearchesRoutes } from './saved-searches';
import { searchRunsRoutes } from './search-runs';
import { resultsRoutes } from './results';
import { adminRoutes } from './admin';
import { env } from '../config/env';

export async function routes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(projectsRoutes);
  await fastify.register(intakeRoutes);
  await fastify.register(screenRoutes);
  await fastify.register(candidatesRoutes);
  await fastify.register(ledgerRoutes);
  await fastify.register(pdfRoutes);
  await fastify.register(scoringRoutes);
  await fastify.register(draftRoutes);
  await fastify.register(exportsRoutes);
  await fastify.register(importRoutes);
  await fastify.register(savedSearchesRoutes);
  await fastify.register(searchRunsRoutes);
  await fastify.register(resultsRoutes);
  await fastify.register(adminRoutes);
  
  // Register explorer routes only if feature is enabled
  if (env.FEATURE_EXPLORER) {
    await fastify.register(explorerRoutes);
  }
  
  // Register chat routes only if feature is enabled
  if (env.FEATURE_CHAT_REVIEW) {
    await fastify.register(chatRoutes);
  }
}
