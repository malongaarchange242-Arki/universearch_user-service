/**
 * Routes pour les centres de formation.
 *
 * Routes publiques:
 *   GET  /centres        (lister approuvés)
 *   GET  /centres/:id    (voir détails approuvés)
 *
 * Routes protégées (rôle CENTRE_FORMATION + APPROVED):
 *   GET  /centres/me     (mes infos)
 *   PUT  /centres/me     (modifier mes infos)
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { CentresController } from './centres.controller';
import { CentresService } from './centres.service';
import { supabaseAdmin } from '../../plugins/supabase';
import { authenticate, authorize } from '../../middleware';
import {
  getMyCentreSchema,
  updateMyCentreSchema,
  getCentreByIdSchema,
  listCentresSchema,
} from './centres.schema';

export const centresRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  const service = new CentresService(supabaseAdmin);
  const controller = new CentresController(service);

  // Routes publiques (sans authentification)
  app.post('/', (req, reply) => controller.createCentre(req, reply));

  app.get(
    '/',
    { schema: listCentresSchema },
    (req, reply) => controller.listApprovedCentres(req, reply)
  );

  app.get(
    '/filieres',
    (req, reply) => controller.listFilieresCentre(req, reply)
  );

  app.get(
    '/:id',
    { schema: getCentreByIdSchema },
    (req, reply) => controller.getCentreById(req, reply)
  );

  // Routes protégées (authentification + autorisation CENTRE_FORMATION + vérification APPROVED)
  await app.register(
    async function (fastify) {
      fastify.addHook('preHandler', authenticate);
      fastify.addHook('preHandler', authorize(['centre_formation', 'admin']));

      fastify.get(
        '/me',
        { schema: getMyCentreSchema },
        (req, reply) => controller.getMyCentre(req, reply)
      );

      fastify.put(
        '/me',
        { schema: updateMyCentreSchema },
        (req, reply) => controller.updateMyCentre(req, reply)
      );

      // Upload logo for caller's centre
      fastify.post('/me/logo', (req, reply) => controller.uploadMyLogo(req, reply));

      // Attach filieres to caller's centre
      fastify.post('/me/filieres', (req, reply) => controller.attachFilieresToMyCentre(req, reply));
    }
  );
};
