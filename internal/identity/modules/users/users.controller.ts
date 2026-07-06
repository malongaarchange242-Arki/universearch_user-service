// src/modules/users/users.controller.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { incCounter } from '../../middleware/metrics';
import { UsersService } from './users.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { UserRecord } from './users.repository';

// Controller: gestion des routes utilisateur
// Fournit des handlers propres, typés et documentés pour l'API /users

export class UsersController {
  private service: UsersService;

  constructor(private supabase: SupabaseClient) {
    this.service = new UsersService(supabase);
  }

  /**
   * GET /users/:id
   * Récupère un utilisateur par ID
   */
  getUser = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    // RBAC: permettre à l'utilisateur lui-même, ou aux 'superviseur'/'admin'
    if (!request.user) {
      incCounter('controller.users.getUser.unauthenticated');
      return reply.status(401).send({ success: false, error: 'Unauthenticated' });
    }

    const requesterId = (request.user as any).id as string;
    const requesterRole = (request.user as any).role as string | undefined;

    if (requesterId !== request.params.id && requesterRole !== 'superviseur' && requesterRole !== 'admin') {
      incCounter('controller.users.getUser.forbidden');
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }

    try {
      const user = await this.service.getUserById(request.params.id);
      reply.status(200).send({ success: true, data: user });
    } catch (error) {
      request.log.error(error);
      // 404 si non trouvé ou erreur spécifique
      reply.status(404).send({ success: false, error: (error as Error).message });
    }
  };

  /**
   * GET /users
   * Liste tous les utilisateurs avec pagination et filtre optionnel
   */
  listUsers = async (
    request: FastifyRequest<{ Querystring: { profileType?: string; limit?: number; offset?: number } }>,
    reply: FastifyReply
  ) => {
    try {
      const { profileType, limit = 20, offset = 0 } = request.query;
      const users = await this.service.listUsers(profileType, limit, offset);
      reply.status(200).send({ success: true, data: users });
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ success: false, error: (error as Error).message });
    }
  };

  /**
   * PUT /users/:id
   * Met à jour un utilisateur
   */
  updateUser = async (
    request: FastifyRequest<{ Params: { id: string }; Body: Partial<UserRecord> }>,
    reply: FastifyReply
  ) => {
    // RBAC: allow self update or superviseur/admin
    if (!request.user) {
      incCounter('controller.users.updateUser.unauthenticated');
      return reply.status(401).send({ success: false, error: 'Unauthenticated' });
    }

    const requesterId = (request.user as any).id as string;
    const requesterRole = (request.user as any).role as string | undefined;

    if (requesterId !== request.params.id && requesterRole !== 'superviseur' && requesterRole !== 'admin') {
      incCounter('controller.users.updateUser.forbidden');
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }

    try {
      const updatedUser = await this.service.updateUser(request.params.id, request.body);
      reply.status(200).send({ success: true, data: updatedUser });
    } catch (error) {
      request.log.error(error);
      reply.status(400).send({ success: false, error: (error as Error).message });
    }
  };

  /**
   * GET /users/count
   * Retourne le nombre total d'utilisateurs
   */
  getUserCount = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const count = await this.service.getUserCount();
      reply.status(200).send({ success: true, count });
    } catch (error) {
      request.log.error(error);
      reply.status(500).send({ success: false, error: (error as Error).message });
    }
  };

  /**
   * DELETE /users/:id
   * Supprime un utilisateur
   */
  deleteUser = async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    // RBAC: allow self delete or superviseur/admin
    if (!request.user) {
      incCounter('controller.users.deleteUser.unauthenticated');
      return reply.status(401).send({ success: false, error: 'Unauthenticated' });
    }

    const requesterId = (request.user as any).id as string;
    const requesterRole = (request.user as any).role as string | undefined;

    if (requesterId !== request.params.id && requesterRole !== 'superviseur' && requesterRole !== 'admin') {
      incCounter('controller.users.deleteUser.forbidden');
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }

    try {
      await this.service.deleteUser(request.params.id);
      reply.status(200).send({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      request.log.error(error);
      reply.status(400).send({ success: false, error: (error as Error).message });
    }
  };
}
