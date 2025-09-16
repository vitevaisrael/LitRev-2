import type { FastifyInstance } from "fastify";
import { errorHandler } from "../utils/errorHandler";

export async function registerErrors(app: FastifyInstance) {
  app.setErrorHandler(errorHandler);
}

