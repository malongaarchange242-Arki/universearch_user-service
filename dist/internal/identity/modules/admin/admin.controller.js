"use strict";
/**
 * Controllers pour les opérations d'administration.
 * Gère les requêtes HTTP et appelle les services.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
class AdminController {
    service;
    constructor(service) {
        this.service = service;
    }
    /**
     * Changer le statut d'une université
     * PATCH /admin/universites/:id/status
     */
    async updateUniversiteStatus(req, reply) {
        try {
            const { id } = req.params;
            const { statut, raison } = req.body;
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
        }
        catch (err) {
            req.log.error(err);
            reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * Approuver une université
     * PATCH /admin/universites/:id/approve
     */
    async approveUniversite(req, reply) {
        try {
            const { id } = req.params;
            const result = await this.service.approveUniversite(id);
            reply.status(200).send({
                message: 'Université approuvée avec succès',
                data: result,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * Rejeter une université
     * PATCH /admin/universites/:id/reject
     */
    async rejectUniversite(req, reply) {
        try {
            const { id } = req.params;
            const { raison } = req.body;
            const result = await this.service.rejectUniversite(id, raison);
            reply.status(200).send({
                message: 'Université rejetée avec succès',
                data: result,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * Lister les universités en attente
     * GET /admin/universites/pending
     */
    async listPendingUniversites(req, reply) {
        try {
            const { limit = 20, offset = 0 } = req.query;
            const data = await this.service.listPendingUniversites(limit, offset);
            reply.status(200).send({
                message: 'Universités en attente',
                count: data.length,
                data,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(500).send({
                error: err.message,
            });
        }
    }
    /**
     * GET /admin/dashboard/stats
     * Retourne les statistiques agrégées pour le dashboard admin
     */
    async dashboardStats(req, reply) {
        try {
            const stats = await this.service.getDashboardStats();
            reply.status(200).send(stats);
        }
        catch (err) {
            req.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    }
    /**
     * Changer le statut d'un centre de formation
     * PATCH /admin/centres/:id/status
     */
    async updateCentreStatus(req, reply) {
        try {
            const { id } = req.params;
            const { statut, raison } = req.body;
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
        }
        catch (err) {
            req.log.error(err);
            reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * Approuver un centre de formation
     * PATCH /admin/centres/:id/approve
     */
    async approveCentre(req, reply) {
        try {
            const { id } = req.params;
            const result = await this.service.approveCentre(id);
            reply.status(200).send({
                message: 'Centre de formation approuvé avec succès',
                data: result,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * Rejeter un centre de formation
     * PATCH /admin/centres/:id/reject
     */
    async rejectCentre(req, reply) {
        try {
            const { id } = req.params;
            const { raison } = req.body;
            const result = await this.service.rejectCentre(id, raison);
            reply.status(200).send({
                message: 'Centre de formation rejeté avec succès',
                data: result,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(400).send({
                error: err.message,
            });
        }
    }
    /**
     * Lister les centres en attente
     * GET /admin/centres/pending
     */
    async listPendingCentres(req, reply) {
        try {
            const { limit = 20, offset = 0 } = req.query;
            const data = await this.service.listPendingCentres(limit, offset);
            reply.status(200).send({
                message: 'Centres en attente',
                count: data.length,
                data,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(500).send({
                error: err.message,
            });
        }
    }
}
exports.AdminController = AdminController;
