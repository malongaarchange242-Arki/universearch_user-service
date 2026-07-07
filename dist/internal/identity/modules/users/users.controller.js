"use strict";
// src/modules/users/users.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const metrics_1 = require("../../middleware/metrics");
const users_service_1 = require("./users.service");
// Controller: gestion des routes utilisateur
// Fournit des handlers propres, typés et documentés pour l'API /users
class UsersController {
    supabase;
    service;
    constructor(supabase) {
        this.supabase = supabase;
        this.service = new users_service_1.UsersService(supabase);
    }
    /**
     * GET /users/:id
     * Récupère un utilisateur par ID
     */
    getUser = async (request, reply) => {
        // RBAC: permettre à l'utilisateur lui-même, ou aux 'superviseur'/'admin'
        if (!request.user) {
            (0, metrics_1.incCounter)('controller.users.getUser.unauthenticated');
            return reply.status(401).send({ success: false, error: 'Unauthenticated' });
        }
        const requesterId = request.user.id;
        const requesterRole = request.user.role;
        if (requesterId !== request.params.id && requesterRole !== 'superviseur' && requesterRole !== 'admin') {
            (0, metrics_1.incCounter)('controller.users.getUser.forbidden');
            return reply.status(403).send({ success: false, error: 'Forbidden' });
        }
        try {
            const user = await this.service.getUserById(request.params.id);
            reply.status(200).send({ success: true, data: user });
        }
        catch (error) {
            request.log.error(error);
            // 404 si non trouvé ou erreur spécifique
            reply.status(404).send({ success: false, error: error.message });
        }
    };
    /**
     * GET /users
     * Liste tous les utilisateurs avec pagination et filtre optionnel
     */
    listUsers = async (request, reply) => {
        try {
            const { profileType, limit = 20, offset = 0 } = request.query;
            const users = await this.service.listUsers(profileType, limit, offset);
            reply.status(200).send({ success: true, data: users });
        }
        catch (error) {
            request.log.error(error);
            reply.status(500).send({ success: false, error: error.message });
        }
    };
    /**
     * PUT /users/:id
     * Met à jour un utilisateur
     */
    updateUser = async (request, reply) => {
        // RBAC: allow self update or superviseur/admin
        if (!request.user) {
            (0, metrics_1.incCounter)('controller.users.updateUser.unauthenticated');
            return reply.status(401).send({ success: false, error: 'Unauthenticated' });
        }
        const requesterId = request.user.id;
        const requesterRole = request.user.role;
        if (requesterId !== request.params.id && requesterRole !== 'superviseur' && requesterRole !== 'admin') {
            (0, metrics_1.incCounter)('controller.users.updateUser.forbidden');
            return reply.status(403).send({ success: false, error: 'Forbidden' });
        }
        try {
            const updatedUser = await this.service.updateUser(request.params.id, request.body);
            reply.status(200).send({ success: true, data: updatedUser });
        }
        catch (error) {
            request.log.error(error);
            reply.status(400).send({ success: false, error: error.message });
        }
    };
    /**
     * GET /users/count
     * Retourne le nombre total d'utilisateurs
     */
    getUserCount = async (request, reply) => {
        try {
            const count = await this.service.getUserCount();
            reply.status(200).send({ success: true, count });
        }
        catch (error) {
            request.log.error(error);
            reply.status(500).send({ success: false, error: error.message });
        }
    };
    /**
     * DELETE /users/:id
     * Supprime un utilisateur
     */
    deleteUser = async (request, reply) => {
        // RBAC: allow self delete or superviseur/admin
        if (!request.user) {
            (0, metrics_1.incCounter)('controller.users.deleteUser.unauthenticated');
            return reply.status(401).send({ success: false, error: 'Unauthenticated' });
        }
        const requesterId = request.user.id;
        const requesterRole = request.user.role;
        if (requesterId !== request.params.id && requesterRole !== 'superviseur' && requesterRole !== 'admin') {
            (0, metrics_1.incCounter)('controller.users.deleteUser.forbidden');
            return reply.status(403).send({ success: false, error: 'Forbidden' });
        }
        try {
            await this.service.deleteUser(request.params.id);
            reply.status(200).send({ success: true, message: 'User deleted successfully' });
        }
        catch (error) {
            request.log.error(error);
            reply.status(400).send({ success: false, error: error.message });
        }
    };
}
exports.UsersController = UsersController;
