import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getEtablissements } from './etablissements.service';

export async function registerEtablissementsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/etablissements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const etablissements = await getEtablissements(fastify as any);
      reply.code(200).send(etablissements);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to fetch establishments',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
