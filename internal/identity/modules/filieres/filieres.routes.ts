import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { FilieresController } from './filieres.controller';
import { FilieresService } from './filieres.service';
import { supabaseAdmin } from '../../plugins/supabase';
import { listFilieresSchema, domainesWithFilieresSchema } from './filieres.schema';

export const filieresRoutes = async (app: FastifyInstance, _opts: FastifyPluginOptions) => {
  const service = new FilieresService(supabaseAdmin);
  const controller = new FilieresController(service);

  // GET /filieres  -> list all filieres sorted by name
  app.get('/', { schema: listFilieresSchema }, (req, reply) => controller.listAll(req, reply));

  // Note: domain grouping endpoint is also exposed at top-level /domaines-with-filieres in app.ts
  app.get('/domaines-with-filieres', { schema: domainesWithFilieresSchema }, (req, reply) => controller.listDomainesWithFilieres(req, reply));
};
