import { FastifyInstance } from 'fastify';
import { BdeService } from './bde.service';
import { BdeController } from './bde.controller';
import { BdeSchemas } from './bde.schema';
import { authenticate } from '../../middleware';

export async function registerBdeRoutes(
  fastify: FastifyInstance,
  opts?: any,
) {
  const bdeService = new BdeService((fastify as any).supabase);
  const bdeController = new BdeController(bdeService);

  // POST /universites/bde - Create a new BDE (only for universities)
  fastify.post<{ Body: any }>(
    '/universites/bde',
    {
      schema: BdeSchemas.createBde,
      preHandler: [authenticate], // Require authentication
    },
    (request, reply) => bdeController.createBde(request, reply),
  );

  fastify.get(
    '/universites/me/bde',
    {
      preHandler: [authenticate],
    },
    (request, reply) => bdeController.getMyBde(request, reply),
  );

  // GET /universites/:universite_id/bde - Get BDE for a university
  fastify.get<{ Params: { universite_id: string } }>(
    '/universites/:universite_id/bde',
    {
      schema: BdeSchemas.getUniversiteBde,
    },
    (request, reply) => bdeController.getBdeByUniversiteId(request, reply),
  );

  // GET /bde/:id - Get BDE by ID
  fastify.get<{ Params: { id: string } }>(
    '/bde/:id',
    {
      schema: BdeSchemas.getBdeById,
    },
    (request, reply) => bdeController.getBdeById(request, reply),
  );

  // PUT /bde/:id - Update BDE
  fastify.put<{ Params: { id: string }; Body: any }>(
    '/bde/:id',
    {
      schema: BdeSchemas.updateBde,
      preHandler: [authenticate], // Require authentication
    },
    (request, reply) => bdeController.updateBde(request, reply),
  );

  // DELETE /bde/:id - Delete BDE
  fastify.delete<{ Params: { id: string } }>(
    '/bde/:id',
    {
      schema: BdeSchemas.deleteBde,
      preHandler: [authenticate], // Require authentication
    },
    (request, reply) => bdeController.deleteBde(request, reply),
  );
}
