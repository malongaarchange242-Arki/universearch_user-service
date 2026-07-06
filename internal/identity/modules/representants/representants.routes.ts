import { FastifyInstance } from 'fastify';
import { RepresentantService } from './representants.service';
import { RepresentantController } from './representants.controller';
import { RepresentantSchemas } from './representants.schema';
import { authenticate } from '../../middleware';

export async function registerRepresentantRoutes(
  fastify: FastifyInstance,
  opts?: any,
) {
  const representantService = new RepresentantService((fastify as any).supabase);
  const representantController = new RepresentantController(representantService);

  // POST /centres/representants - Create a new representant (only for centres)
  fastify.post<{ Body: any }>(
    '/centres/representants',
    {
      schema: RepresentantSchemas.createRepresentant,
      preHandler: [authenticate], // Require authentication
    },
    (request, reply) => representantController.createRepresentant(request, reply),
  );

  // GET /centres/:centre_id/representants - Get all representants for a centre
  fastify.get<{ Params: { centre_id: string } }>(
    '/centres/:centre_id/representants',
    {
      schema: RepresentantSchemas.getCentreRepresentants,
    },
    (request, reply) => representantController.getRepresentantsByCentreId(request, reply),
  );

  // GET /representants/:id - Get representant by ID
  fastify.get<{ Params: { id: string } }>(
    '/representants/:id',
    {
      schema: RepresentantSchemas.getRepresentantById,
    },
    (request, reply) => representantController.getRepresentantById(request, reply),
  );

  // PUT /representants/:id - Update representant
  fastify.put<{ Params: { id: string }; Body: any }>(
    '/representants/:id',
    {
      schema: RepresentantSchemas.updateRepresentant,
      preHandler: [authenticate], // Require authentication
    },
    (request, reply) => representantController.updateRepresentant(request, reply),
  );

  // DELETE /representants/:id - Delete representant
  fastify.delete<{ Params: { id: string } }>(
    '/representants/:id',
    {
      schema: RepresentantSchemas.deleteRepresentant,
      preHandler: [authenticate], // Require authentication
    },
    (request, reply) => representantController.deleteRepresentant(request, reply),
  );
}
