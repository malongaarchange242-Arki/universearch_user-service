// src/modules/users/users.routes.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { UsersController } from './users.controller';
import { supabaseAdmin } from '../../plugins/supabase'; // use exported admin client
import { authenticate, authorize } from '../../middleware';

export const usersRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  const controller = new UsersController(supabaseAdmin);

  // Public route for user count (for dashboard stats)
  app.get('/users/count', async (req, reply) =>
    controller.getUserCount(req as any, reply)
  );

  // Routes utilisateurs
  // - GET /users/:id -> authentifié (user lui-même, admin ou superviseur). Authorization fine-grained handled in controller/service.
  app.get('/users/:id', { preHandler: [authenticate] }, async (req, reply) =>
    controller.getUser(req as any, reply)
  );

  // - GET /users -> uniquement superviseur ou admin (temporairement ouvert pour développement)
  app.get('/users', { preHandler: [authenticate] }, async (req, reply) =>
    controller.listUsers(req as any, reply)
  );

  // - PUT /users/:id -> superviseur ou admin (ou l'utilisateur lui-même ; check in controller)
  app.put('/users/:id', { preHandler: [authenticate, authorize(['superviseur', 'admin'])] }, async (req, reply) =>
    controller.updateUser(req as any, reply)
  );

  // - DELETE /users/:id -> superviseur ou admin
  app.delete('/users/:id', { preHandler: [authenticate, authorize(['superviseur', 'admin'])] }, async (req, reply) =>
    controller.deleteUser(req as any, reply)
  );
};
