/**
 * Controllers pour les opérations d'administration.
 * Gère les requêtes HTTP et appelle les services.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { AdminService } from './admin.service';

export class AdminController {
  private service: AdminService;

  constructor(service: AdminService) {
    this.service = service;
  }

  /**
   * Changer le statut d'une université
   * PATCH /admin/universites/:id/status
   */
  async updateUniversiteStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { statut, raison } = req.body as { 
        statut: 'PENDING' | 'APPROVED' | 'REJECTED'; 
        raison?: string;
      };

      if (!statut || !['PENDING', 'APPROVED', 'REJECTED'].includes(statut)) {
        return reply.status(400).send({
          error: 'Invalid statut. Must be PENDING, APPROVED, or REJECTED',
        });
      }

      const result = await this.service.updateUniversiteStatus(id, statut, raison);

      reply.status(200).send({
        message: `Université statut changed to ${statut}`,
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
   * Approuver une université
   * PATCH /admin/universites/:id/approve
   */
  async approveUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };

      const result = await this.service.approveUniversite(id);

      reply.status(200).send({
        message: 'Université approuvée avec succès',
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
   * Rejeter une université
   * PATCH /admin/universites/:id/reject
   */
  async rejectUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { raison } = req.body as { raison?: string };

      const result = await this.service.rejectUniversite(id, raison);

      reply.status(200).send({
        message: 'Université rejetée avec succès',
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
   * Lister les universités en attente
   * GET /admin/universites/pending
   */
  async listPendingUniversites(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit = 20, offset = 0 } = req.query as {
        limit?: number;
        offset?: number;
      };

      const data = await this.service.listPendingUniversites(limit, offset);

      reply.status(200).send({
        message: 'Universités en attente',
        count: data.length,
        data,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /admin/dashboard/stats
   * Retourne les statistiques agrégées pour le dashboard admin
   */
  async dashboardStats(req: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.service.getDashboardStats();
      reply.status(200).send(stats);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({ error: (err as Error).message });
    }
  }

  /**
   * Changer le statut d'un centre de formation
   * PATCH /admin/centres/:id/status
   */
  async updateCentreStatus(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { statut, raison } = req.body as { 
        statut: 'PENDING' | 'APPROVED' | 'REJECTED'; 
        raison?: string;
      };

      if (!statut || !['PENDING', 'APPROVED', 'REJECTED'].includes(statut)) {
        return reply.status(400).send({
          error: 'Invalid statut. Must be PENDING, APPROVED, or REJECTED',
        });
      }

      const result = await this.service.updateCentreStatus(id, statut, raison);

      reply.status(200).send({
        message: `Centre statut changed to ${statut}`,
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
   * Approuver un centre de formation
   * PATCH /admin/centres/:id/approve
   */
  async approveCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };

      const result = await this.service.approveCentre(id);

      reply.status(200).send({
        message: 'Centre de formation approuvé avec succès',
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
   * Rejeter un centre de formation
   * PATCH /admin/centres/:id/reject
   */
  async rejectCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };
      const { raison } = req.body as { raison?: string };

      const result = await this.service.rejectCentre(id, raison);

      reply.status(200).send({
        message: 'Centre de formation rejeté avec succès',
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
   * Lister les centres en attente
   * GET /admin/centres/pending
   */
  async listPendingCentres(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit = 20, offset = 0 } = req.query as {
        limit?: number;
        offset?: number;
      };

      const data = await this.service.listPendingCentres(limit, offset);

      reply.status(200).send({
        message: 'Centres en attente',
        count: data.length,
        data,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }
}
