/**
 * Routes for Frais de Scolarité (Tuition Fees)
 *
 * Protected endpoints (require authentication + UNIVERSITE/ADMIN role):
 *   GET    /universites/me/frais-scolarite              (list all frais)
 *   POST   /universites/me/frais-scolarite              (create or update frais)
 *   GET    /universites/me/frais-scolarite/:id          (get specific frais)
 *   PUT    /universites/me/frais-scolarite/:id          (update specific frais)
 *   DELETE /universites/me/frais-scolarite/:id          (delete specific frais)
 *   GET    /universites/me/frais-scolarite/stats        (get statistics)
 *
 * Public endpoints:
 *   GET    /universites/:id/frais-scolarite             (get public frais for university)
 */

import { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import { FraisScolariteController } from './frais-scolarite.controller';
import { FraisScolariteService } from './frais-scolarite.service';
import { supabaseAdmin } from '../../plugins/supabase';
import { authenticate, authorize } from '../../middleware';
import {
  createFraisSchema,
  listFraisSchema,
  getFraisByIdSchema,
} from './frais-scolarite.schema';

export const fraisScolariteRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  const service = new FraisScolariteService(supabaseAdmin);
  const controller = new FraisScolariteController(service);

  // ============================================
  // Protected routes (authenticated universités/admins)
  // ============================================
  await app.register(
    async function (fastify) {
      // Add authentication and authorization middleware
      fastify.addHook('preHandler', authenticate);
      fastify.addHook('preHandler', authorize(['universite', 'admin']));

      /**
       * GET /universites/me/frais-scolarite
       * List all tuition fees for authenticated university
       */
      fastify.get(
        '/me/frais-scolarite',
        { schema: listFraisSchema },
        (req, reply) => controller.getFraisForMyUniversite(req, reply)
      );

      /**
       * POST /universites/me/frais-scolarite
       * Create or update tuition fees (upsert operation)
       * Body: { records: [{ level, pole, monthly_price, yearly_price }, ...] }
       */
      fastify.post(
        '/me/frais-scolarite',
        { schema: createFraisSchema },
        (req, reply) => controller.createOrUpdateFraisForMyUniversite(req, reply)
      );

      /**
       * GET /universites/me/frais-scolarite/stats
       * Get statistics about fees (must be before :id route to avoid capture)
       */
      fastify.get(
        '/me/frais-scolarite/stats',
        (req, reply) => controller.getFraisStatistics(req, reply)
      );

      /**
       * GET /universites/me/frais-scolarite/:id
       * Get a specific frais entry by ID
       */
      fastify.get(
        '/me/frais-scolarite/:id',
        { schema: getFraisByIdSchema },
        (req, reply) => controller.getFraisById(req, reply)
      );

      /**
       * PUT /universites/me/frais-scolarite/:id
       * Update a specific frais entry
       */
      fastify.put(
        '/me/frais-scolarite/:id',
        (req, reply) => controller.updateFraisById(req, reply)
      );

      /**
       * DELETE /universites/me/frais-scolarite/:id
       * Delete a specific frais entry
       */
      fastify.delete(
        '/me/frais-scolarite/:id',
        (req, reply) => controller.deleteFraisById(req, reply)
      );
    }
  );

  // ============================================
  // Public routes (no authentication required)
  // ============================================

  /**
   * GET /universites/:id/frais-scolarite
   * Get public frais for a specific university
   * This endpoint can be called without authentication to fetch fees for a specific university
   */
  app.get(
    '/:id/frais-scolarite',
    async (req: any, reply: FastifyReply) => {
      try {
        const { id } = req.params;

        if (!id) {
          return reply.status(400).send({
            error: 'University ID is required',
          });
        }

        const frais = await service.getFraisByUniversiteId(id);

        reply.status(200).send({
          message: 'Frais retrieved successfully',
          data: frais,
        });
      } catch (err) {
        req.log.error(err);
        reply.status(500).send({
          error: (err as Error).message,
        });
      }
    }
  );
};
