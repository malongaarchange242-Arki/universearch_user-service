"use strict";
/**
 * Controllers pour la gestion des centres de formation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CentresController = void 0;
class CentresController {
    service;
    constructor(service) {
        this.service = service;
    }
    /**
     * GET /centres/filieres
     * Lister toutes les filières centre
     */
    async listFilieresCentre(_req, reply) {
        try {
            const filieres = await this.service.listFilieresCentre();
            return reply.status(200).send(filieres);
        }
        catch (err) {
            _req.log.error(err);
            return reply.status(500).send({
                error: err.message,
            });
        }
    }
    /**
     * GET /centres/me
     * Récupérer mes infos centre
     */
    async getMyCentre(req, reply) {
        try {
            const userId = req.user.id;
            const centre = await this.service.getMyCentre(userId);
            if (!centre) {
                return reply.status(404).send({
                    error: 'Centre not found for your account',
                });
            }
            return reply.status(200).send(centre);
        }
        catch (err) {
            req.log.error(err);
            return reply.status(500).send({
                error: err.message,
            });
        }
    } // ✅ ACCOLADE AJOUTÉE ICI
    /**
     * PUT /centres/me
     * Mettre à jour mes infos centre
     */
    async updateMyCentre(req, reply) {
        try {
            const userId = req.user.id;
            const payload = req.body;
            const result = await this.service.updateMyCentre(userId, payload);
            return reply.status(200).send({
                message: 'Centre updated successfully',
                data: result,
            });
        }
        catch (err) {
            req.log.error(err);
            return reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * GET /centres/:id
     * Récupérer les infos publiques d'un centre (approuvé)
     */
    async getCentreById(req, reply) {
        try {
            const { id } = req.params;
            const centre = await this.service.getCentreById(id);
            if (!centre) {
                return reply.status(404).send({
                    error: 'Centre not found',
                });
            }
            return reply.status(200).send(centre);
        }
        catch (err) {
            req.log.error(err);
            return reply.status(500).send({
                error: err.message,
            });
        }
    }
    /**
     * GET /centres
     * Lister tous les centres approuvés
     */
    async listApprovedCentres(req, reply) {
        try {
            const { limit = 20, offset = 0 } = req.query;
            const data = await this.service.listApprovedCentres(limit, offset);
            return reply.status(200).send(data);
        }
        catch (err) {
            req.log.error(err);
            return reply.status(500).send({
                error: err.message,
            });
        }
    }
    /**
     * POST /centres
     * Create a new centre de formation (public)
     */
    async createCentre(req, reply) {
        try {
            const payload = req.body;
            const result = await this.service.createCentre(payload);
            return reply.status(201).send({ success: true, data: result });
        }
        catch (err) {
            req.log.error(err);
            return reply.status(400).send({
                success: false,
                error: err.message,
            });
        }
    }
    /**
     * POST /centres/me/logo
     */
    async uploadMyLogo(req, reply) {
        try {
            const userId = req.user.id;
            let buffer = null;
            let filename = `logo_${Date.now()}.png`;
            let contentType = 'image/png';
            try {
                const mp = req.file ? await req.file() : null;
                if (mp) {
                    buffer = await mp.toBuffer();
                    filename = mp.filename || filename;
                    contentType = mp.mimetype || contentType;
                }
            }
            catch { }
            if (!buffer) {
                const body = req.body;
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
            const url = await this.service.uploadLogoForMyCentre(userId, buffer, filename, contentType);
            return reply.status(200).send({ success: true, url });
        }
        catch (err) {
            req.log.error(err);
            return reply.status(500).send({
                success: false,
                error: err.message,
            });
        }
    }
    /**
     * POST /centres/me/filieres
     * Attacher les formations au centre de l'utilisateur (formations professionnelles)
     */
    async attachFilieresToMyCentre(req, reply) {
        try {
            const userId = req.user.id;
            const { filiereIds, formationDetails } = req.body;
            if (formationDetails && !Array.isArray(formationDetails)) {
                return reply.status(400).send({
                    success: false,
                    error: 'formationDetails must be an array',
                });
            }
            const result = await this.service.attachProfessionalFormationToMyCentre(userId, formationDetails || []);
            return reply.status(200).send({
                success: true,
                data: result,
            });
        }
        catch (err) {
            req.log.error(err);
            return reply.status(400).send({
                success: false,
                error: err.message,
            });
        }
    }
}
exports.CentresController = CentresController;
