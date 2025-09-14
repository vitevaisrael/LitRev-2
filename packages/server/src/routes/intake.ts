import { FastifyInstance } from 'fastify';
import { sendSuccess } from '../utils/response';

export async function intakeRoutes(fastify: FastifyInstance) {
  fastify.post('/projects/:id/intake/plan', async (request, reply) => {
    // Canned response for now
    return sendSuccess(reply, {
      profile: {
        population: "Adults with IgA nephropathy",
        exposure: "Corticosteroid therapy",
        comparator: "Placebo or standard care",
        outcomes: "Proteinuria reduction, eGFR preservation"
      },
      anchors: [
        {
          title: "Corticosteroids in IgA Nephropathy: A Systematic Review",
          journal: "JAMA",
          year: 2023,
          doi: "10.1001/jama.2023.12345",
          why: "Recent systematic review with comprehensive analysis"
        }
      ],
      miniAbstract: "This review examines the efficacy of corticosteroid therapy in IgA nephropathy...",
      outline: ["Introduction", "Methods", "Results", "Discussion", "Conclusion"]
    });
  });
}
