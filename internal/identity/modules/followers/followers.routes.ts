/**
 * Routes pour les followers (suivi des universités et centres de formation).
 *
 * Routes publiques:
 *   GET  /universites/:id/followers/count      (nombre de followers d'une université)
 *   GET  /centres/:id/followers/count          (nombre de followers d'un centre)
 *
 * Routes protégées (authentifiées):
 *   POST   /universites/:id/follow             (suivre une université)
 *   DELETE /universites/:id/follow             (arrêter de suivre une université)
 *   GET    /universites/me/followed            (mes universités suivies)
 *   POST   /centres/:id/follow                 (suivre un centre)
 *   DELETE /centres/:id/follow                 (arrêter de suivre un centre)
 *   GET    /centres/me/followed                (mes centres suivis)
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FollowersController } from './followers.controller';
import { FollowersService } from './followers.service';
import { supabaseAdmin } from '../../plugins/supabase';
import { authenticate } from '../../middleware';

export const followersRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  const service = new FollowersService(supabaseAdmin);
  const controller = new FollowersController(service);

  // ========== UNIVERSITÉS - Routes Publiques ==========
  app.get(
    '/universites/:id/followers/count',
    (req, reply) => controller.countUniversiteFollowers(req, reply)
  );

  // ========== UNIVERSITÉS - Routes Protégées ==========
  await app.register(
    async function (fastify) {
      fastify.addHook('preHandler', authenticate);

      // Suivre une université
      fastify.post(
        '/universites/:id/follow',
        (req, reply) => controller.followUniversite(req, reply)
      );

      // Arrêter de suivre une université
      fastify.delete(
        '/universites/:id/follow',
        (req, reply) => controller.unfollowUniversite(req, reply)
      );

      // Mes universités suivies
      fastify.get(
        '/universites/me/followed',
        (req, reply) => controller.getFollowedUniversites(req, reply)
      );
    }
  );

  // ========== CENTRES DE FORMATION - Routes Publiques ==========
  app.get(
    '/centres/:id/followers/count',
    (req, reply) => controller.countCentreFollowers(req, reply)
  );

  // ========== CENTRES DE FORMATION - Routes Protégées ==========
  await app.register(
    async function (fastify) {
      fastify.addHook('preHandler', authenticate);

      // Suivre un centre
      fastify.post(
        '/centres/:id/follow',
        (req, reply) => controller.followCentre(req, reply)
      );

      // Arrêter de suivre un centre
      fastify.delete(
        '/centres/:id/follow',
        (req, reply) => controller.unfollowCentre(req, reply)
      );

      // Mes centres suivis
      fastify.get(
        '/centres/me/followed',
        (req, reply) => controller.getFollowedCentres(req, reply)
      );
    }
  );
};
