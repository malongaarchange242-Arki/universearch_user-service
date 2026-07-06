/**
 * Controllers pour la gestion des followers.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { FollowersService } from './followers.service';

export class FollowersController {
  constructor(private service: FollowersService) {}

  /**
   * POST /universites/:id/follow
   * Suivre une université
   */
  async followUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const { id: universiteId } = req.params as { id: string };

      const result = await this.service.followUniversite(userId, universiteId);

      reply.status(201).send({
        message: 'Successfully followed université',
        data: result,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * DELETE /universites/:id/follow
   * Arrêter de suivre une université
   */
  async unfollowUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const { id: universiteId } = req.params as { id: string };

      await this.service.unfollowUniversite(userId, universiteId);

      reply.status(200).send({
        message: 'Successfully unfollowed université',
      });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /universites/me/followed
   * Récupérer les universités suivies par l'utilisateur
   */
  async getFollowedUniversites(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;

      const data = await this.service.getFollowedUniversites(userId);

      reply.status(200).send({
        data,
        count: data.length,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /universites/:id/followers/count
   * Compter les followers d'une université
   */
  async countUniversiteFollowers(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: universiteId } = req.params as { id: string };
      req.log.info({ universiteId }, '[followers/count] universiteId received');

      const count = await this.service.countUniversiteFollowers(universiteId);
      req.log.info({ universiteId, count }, '[followers/count] universite count returned');

      reply.status(200).send({
        count,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * POST /centres-formation/:id/follow
   * Suivre un centre de formation
   */
  async followCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const { id: centreId } = req.params as { id: string };

      const result = await this.service.followCentre(userId, centreId);

      reply.status(201).send({
        message: 'Successfully followed centre de formation',
        data: result,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * DELETE /centres-formation/:id/follow
   * Arrêter de suivre un centre de formation
   */
  async unfollowCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const { id: centreId } = req.params as { id: string };

      await this.service.unfollowCentre(userId, centreId);

      reply.status(200).send({
        message: 'Successfully unfollowed centre de formation',
      });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /centres-formation/me/followed
   * Récupérer les centres de formation suivis par l'utilisateur
   */
  async getFollowedCentres(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;

      const data = await this.service.getFollowedCentres(userId);

      reply.status(200).send({
        data,
        count: data.length,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /centres-formation/:id/followers/count
   * Compter les followers d'un centre de formation
   */
  async countCentreFollowers(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id: centreId } = req.params as { id: string };
      req.log.info({ centreId }, '[followers/count] centreId received');

      const count = await this.service.countCentreFollowers(centreId);
      req.log.info({ centreId, count }, '[followers/count] centre count returned');

      reply.status(200).send({
        count,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }
}
