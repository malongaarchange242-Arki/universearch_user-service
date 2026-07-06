/**
 * Controller for Frais de Scolarité endpoints
 * Handles HTTP requests and delegates to service
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateFraisRequest,
  ListFraisQuery,
} from './frais-scolarite.schema';
import { FraisScolariteService } from './frais-scolarite.service';
import { UniversitesService } from '../universites/universites.service';
import { supabaseAdmin } from '../../plugins/supabase';

export class FraisScolariteController {
  private universitesService: UniversitesService;

  constructor(private service: FraisScolariteService) {
    this.universitesService = new UniversitesService(supabaseAdmin);
  }

  /**
   * GET /universites/me/frais-scolarite
   * Get all tuition fees for the authenticated university
   */
  async getFraisForMyUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any)?.id;
      const query = (req.query as any) || {};

      if (!userId) {
        return reply.status(401).send({
          error: 'User not authenticated',
        });
      }

      // Get the university for this user
      const universite = await this.universitesService.getMyUniversite(userId);

      if (!universite) {
        return reply.status(404).send({
          error: 'University not found for your account',
        });
      }

      // Parse query parameters
      const filters: { level?: string; pole?: string } = {};
      if (query.level) filters.level = String(query.level);
      if (query.pole) filters.pole = String(query.pole);

      const frais = await this.service.getFraisByUniversiteId(
        universite.id,
        filters
      );

      reply.status(200).send({
        message: 'Frais de scolarité retrieved successfully',
        data: frais,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * POST /universites/me/frais-scolarite
   * Create or update tuition fees for the authenticated university with upsert logic
   */
  async createOrUpdateFraisForMyUniversite(
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const userId = (req.user as any)?.id;
      const body = (req.body as CreateFraisRequest) || {};

      if (!userId) {
        return reply.status(401).send({
          error: 'User not authenticated',
        });
      }

      // Get the university for this user
      const universite = await this.universitesService.getMyUniversite(userId);

      if (!universite) {
        return reply.status(404).send({
          error: 'University not found for your account',
        });
      }

      if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
        return reply.status(400).send({
          error: 'records field is required and must be a non-empty array',
        });
      }

      // Upsert frais (insert if new, update if exists based on level+pole)
      const frais = await this.service.upsertFrais(
        universite.id,
        body.records
      );

      reply.status(200).send({
        message: 'Frais de scolarité saved successfully',
        data: frais,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /universites/me/frais-scolarite/:id
   * Get a specific tuition fee entry
   */
  async getFraisById(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = (req.params as any) || {};

      if (!id) {
        return reply.status(400).send({
          error: 'Frais ID is required',
        });
      }

      const frais = await this.service.getFraisById(id);

      if (!frais) {
        return reply.status(404).send({
          error: 'Frais entry not found',
        });
      }

      reply.status(200).send(frais);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * PUT /universites/me/frais-scolarite/:id
   * Update a specific tuition fee entry
   */
  async updateFraisById(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = (req.params as any) || {};
      const body = (req.body as any) || {};

      if (!id) {
        return reply.status(400).send({
          error: 'Frais ID is required',
        });
      }

      const frais = await this.service.updateFrais(id, body);

      reply.status(200).send({
        message: 'Frais updated successfully',
        data: frais,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * DELETE /universites/me/frais-scolarite/:id
   * Delete a specific tuition fee entry
   */
  async deleteFraisById(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = (req.params as any) || {};

      if (!id) {
        return reply.status(400).send({
          error: 'Frais ID is required',
        });
      }

      await this.service.deleteFrais(id);

      reply.status(200).send({
        message: 'Frais deleted successfully',
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /universites/me/frais-scolarite/stats
   * Get statistics about tuition fees
   */
  async getFraisStatistics(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any)?.id;
      const universite_id = (req.user as any)?.universite_id || userId;

      if (!universite_id) {
        return reply.status(400).send({
          error: 'Unable to determine university ID',
        });
      }

      const stats = await this.service.getFraisStatistics(universite_id);

      reply.status(200).send({
        message: 'Statistics retrieved successfully',
        data: stats,
      });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }
}
