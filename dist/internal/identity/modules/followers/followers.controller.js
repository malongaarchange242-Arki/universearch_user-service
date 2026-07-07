"use strict";
/**
 * Controllers pour la gestion des followers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FollowersController = void 0;
class FollowersController {
    service;
    constructor(service) {
        this.service = service;
    }
    /**
     * POST /universites/:id/follow
     * Suivre une université
     */
    async followUniversite(req, reply) {
        try {
            const userId = req.user.id;
            const { id: universiteId } = req.params;
            const result = await this.service.followUniversite(userId, universiteId);
            reply.status(201).send({
                message: 'Successfully followed université',
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
     * DELETE /universites/:id/follow
     * Arrêter de suivre une université
     */
    async unfollowUniversite(req, reply) {
        try {
            const userId = req.user.id;
            const { id: universiteId } = req.params;
            await this.service.unfollowUniversite(userId, universiteId);
            reply.status(200).send({
                message: 'Successfully unfollowed université',
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
     * GET /universites/me/followed
     * Récupérer les universités suivies par l'utilisateur
     */
    async getFollowedUniversites(req, reply) {
        try {
            const userId = req.user.id;
            const data = await this.service.getFollowedUniversites(userId);
            reply.status(200).send({
                data,
                count: data.length,
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
     * GET /universites/:id/followers/count
     * Compter les followers d'une université
     */
    async countUniversiteFollowers(req, reply) {
        try {
            const { id: universiteId } = req.params;
            req.log.info({ universiteId }, '[followers/count] universiteId received');
            const count = await this.service.countUniversiteFollowers(universiteId);
            req.log.info({ universiteId, count }, '[followers/count] universite count returned');
            reply.status(200).send({
                count,
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
     * POST /centres-formation/:id/follow
     * Suivre un centre de formation
     */
    async followCentre(req, reply) {
        try {
            const userId = req.user.id;
            const { id: centreId } = req.params;
            const result = await this.service.followCentre(userId, centreId);
            reply.status(201).send({
                message: 'Successfully followed centre de formation',
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
     * DELETE /centres-formation/:id/follow
     * Arrêter de suivre un centre de formation
     */
    async unfollowCentre(req, reply) {
        try {
            const userId = req.user.id;
            const { id: centreId } = req.params;
            await this.service.unfollowCentre(userId, centreId);
            reply.status(200).send({
                message: 'Successfully unfollowed centre de formation',
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
     * GET /centres-formation/me/followed
     * Récupérer les centres de formation suivis par l'utilisateur
     */
    async getFollowedCentres(req, reply) {
        try {
            const userId = req.user.id;
            const data = await this.service.getFollowedCentres(userId);
            reply.status(200).send({
                data,
                count: data.length,
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
     * GET /centres-formation/:id/followers/count
     * Compter les followers d'un centre de formation
     */
    async countCentreFollowers(req, reply) {
        try {
            const { id: centreId } = req.params;
            req.log.info({ centreId }, '[followers/count] centreId received');
            const count = await this.service.countCentreFollowers(centreId);
            req.log.info({ centreId, count }, '[followers/count] centre count returned');
            reply.status(200).send({
                count,
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
exports.FollowersController = FollowersController;
