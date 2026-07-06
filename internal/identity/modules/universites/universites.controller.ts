/**
 * Controllers pour la gestion des universités.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { UniversitesService } from './universites.service';

function parseFormationDetails(body: any) {
  const details =
    body?.formationDetails ??
    body?.formation_details ??
    body?.details ??
    body?.formation;

  if (Array.isArray(details)) return details;
  if (details && typeof details === 'object') return [details];
  return [];
}

export class UniversitesController {
  constructor(private service: UniversitesService) {}

  /**
   * GET /universites/me
   * Récupérer mes infos université
   */
  async getMyUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;

      const universite = await this.service.getMyUniversite(userId);

      if (!universite) {
        return reply.status(404).send({
          error: 'Université not found for your account',
        });
      }

      reply.status(200).send(universite);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * PUT /universites/me
   * Mettre à jour mes infos université (nom, description, sigle, annee_fondation, contacts, lien_site, logo, domaine, etc.)
   */
  async updateMyUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const payload = req.body as any;

      const result = await this.service.updateMyUniversite(userId, payload);

      reply.status(200).send({
        message: 'Université updated successfully',
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
   * POST /universites/me/filieres
   * Attacher plusieurs filières à l'université de l'utilisateur connecté.
   * Body: { filiereIds: string[] }
   */
  async attachFilieresToMyUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;
      const body = req.body as any;
      const filiereIds = Array.isArray(body && body.filiereIds) ? body.filiereIds : [];
      const formationDetails = parseFormationDetails(body);

      if (!filiereIds.length) {
        return reply.status(400).send({ error: 'filiereIds is required' });
      }

      const result = await this.service.attachFilieresToMyUniversite(userId, filiereIds, formationDetails);

      reply.status(200).send({ success: true, data: result });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({ error: (err as Error).message });
    }
  }

  /**
   * GET /universites/:id
   * Récupérer les infos publiques d'une université (approuvée)
   */
  async getUniversiteById(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = req.params as { id: string };

      const universite = await this.service.getUniversiteById(id);

      if (!universite) {
        return reply.status(404).send({
          error: 'Université not found',
        });
      }

      reply.status(200).send(universite);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * GET /universites
   * Lister toutes les universités approuvées
   */
  async listApprovedUniversites(req: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit = 20, offset = 0 } = req.query as {
        limit?: number;
        offset?: number;
      };

      const data = await this.service.listApprovedUniversites(limit, offset);

      reply.status(200).send(data);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({
        error: (err as Error).message,
      });
    }
  }

  /**
   * POST /universites
   * Create a new université (public)
   */
  async createUniversite(req: FastifyRequest, reply: FastifyReply) {
    try {
      const payload = req.body as any;
      const result = await this.service.createUniversite(payload);
      reply.status(201).send({ success: true, data: result });
    } catch (err) {
      req.log.error(err);
      reply.status(400).send({ success: false, error: (err as Error).message });
    }
  }

  /**
   * POST /universites/me/logo
   * Upload a logo for the authenticated user's université.
   * Accepts multipart file (preferred) or JSON { file: <base64>, filename, contentType }.
   */
  async uploadMyLogo(req: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = (req.user as any).id;

      let buffer: Buffer | null = null;
      let filename = `logo_${Date.now()}.png`;
      let contentType = 'image/png';

      // Try multipart first (if fastify-multipart is enabled)
      try {
        const mp = (req as any).file ? await (req as any).file() : null;
        if (mp) {
          buffer = await mp.toBuffer();
          filename = mp.filename || filename;
          contentType = mp.mimetype || contentType;
        }
      } catch (e) {
        // ignore and fallback to JSON body
      }

      if (!buffer) {
        const body = req.body as any;
        if (!body || !body.file || !body.filename) {
          return reply.status(400).send({ success: false, error: 'No file provided' });
        }
        buffer = Buffer.from(body.file, 'base64');
        filename = body.filename;
        contentType = body.contentType || contentType;
      }

      const url = await this.service.uploadLogoForMyUniversite(userId, buffer, filename, contentType);

      reply.status(200).send({ success: true, url });
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({ success: false, error: (err as Error).message });
    }
  }
}
