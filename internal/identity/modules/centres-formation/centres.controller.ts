/**
 * Controllers pour la gestion des centres de formation.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { CentresService } from './centres.service';

export class CentresController {
  constructor(private service: CentresService) {}

  /**
   * GET /centres/filieres
   * Lister toutes les filières centre
   */
  async listFilieresCentre(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const filieres = await this.service.listFilieresCentre();
      return reply.status(200).send(filieres);
    } catch (err) {
      _req.log.error(err);
      return reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /centres/me
   * Récupérer mes infos centre
   */
  async getMyCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;

      const centre = await this.service.getMyCentre(userId);

      if (!centre) {
        return reply.status(404).send({
          error: 'Centre not found for your account',
        });
      }

      return reply.status(200).send(centre);
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({
        error: (err as Error).message,
      });
    }
  } // ✅ ACCOLADE AJOUTÉE ICI

  /**
   * PUT /centres/me
   * Mettre à jour mes infos centre
   */
  async updateMyCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const payload = req.body as any;

      const result = await this.service.updateMyCentre(userId, payload);

      return reply.status(200).send({
        message: 'Centre updated successfully',
        data: result,
      });
    } catch (err) {
      req.log.error(err);
      return reply.status(400).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /centres/:id
   * Récupérer les infos publiques d'un centre (approuvé)
   */
  async getCentreById(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };

      const centre = await this.service.getCentreById(id);

      if (!centre) {
        return reply.status(404).send({
          error: 'Centre not found',
        });
      }

      return reply.status(200).send(centre);
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /centres
   * Lister tous les centres approuvés
   */
  async listApprovedCentres(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit = 20, offset = 0 } = req.query as {
        limit?: number;
        offset?: number;
      };

      const data = await this.service.listApprovedCentres(limit, offset);

      return reply.status(200).send(data);
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * POST /centres
   * Create a new centre de formation (public)
   */
  async createCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = req.body as any;
      const result = await this.service.createCentre(payload);

      return reply.status(201).send({ success: true, data: result });
    } catch (err) {
      req.log.error(err);
      return reply.status(400).send({
        success: false,
        error: (err as Error).message,
      });
    }
  }

  /**
   * POST /centres/me/logo
   */
  async uploadMyLogo(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;

      let buffer: Buffer | null = null;
      let filename = `logo_${Date.now()}.png`;
      let contentType = 'image/png';

      try {
        const mp = (req as any).file ? await (req as any).file() : null;
        if (mp) {
          buffer = await mp.toBuffer();
          filename = mp.filename || filename;
          contentType = mp.mimetype || contentType;
        }
      } catch {}

      if (!buffer) {
        const body = req.body as any;
        if (!body || !body.file || !body.filename) {
          return reply.status(400).send({
            success: false,
            error: 'No file provided',
          });
        }
        buffer = Buffer.from(body.file, 'base64');
        filename = body.filename;
        contentType = body.contentType || contentType;
      }

      const url = await this.service.uploadLogoForMyCentre(
        userId,
        buffer,
        filename,
        contentType
      );

      return reply.status(200).send({ success: true, url });
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({
        success: false,
        error: (err as Error).message,
      });
    }
  }

  /**
   * POST /centres/me/filieres
   * Attacher les formations au centre de l'utilisateur (formations professionnelles)
   */
  async attachFilieresToMyCentre(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const { filiereIds, formationDetails } = req.body as {
        filiereIds?: string[];
        formationDetails?: any[];
      };

      if (formationDetails && !Array.isArray(formationDetails)) {
        return reply.status(400).send({
          success: false,
          error: 'formationDetails must be an array',
        });
      }

      const result = await this.service.attachProfessionalFormationToMyCentre(
        userId,
        formationDetails || []
      );

      return reply.status(200).send({
        success: true,
        data: result,
      });
    } catch (err) {
      req.log.error(err);
      return reply.status(400).send({
        success: false,
        error: (err as Error).message,
      });
    }
  }
}