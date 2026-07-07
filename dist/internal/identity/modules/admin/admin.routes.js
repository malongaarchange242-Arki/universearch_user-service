"use strict";
/**
 * Routes d'administration.
 *
 * 🛡 SÉCURISATION STRICTE:
 * - Authentification requise (Bearer token)
 * - Autorisation requise: rôle ADMIN ou centre_formation
 * - Seuls les admins peuvent accéder à ces routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const supabase_1 = require("../../plugins/supabase");
const middleware_1 = require("../../middleware");
const admin_schema_1 = require("./admin.schema");
const adminRoutes = async (app, _options) => {
    const service = new admin_service_1.AdminService(supabase_1.supabaseAdmin);
    const controller = new admin_controller_1.AdminController(service);
    // 🛡 Tous les routes admin sont protégées
    // Enregistrer un sous-groupe de routes avec middleware de sécurité global
    await app.register(async function (fastify) {
        // Authentification: tous les utilisateurs doivent avoir un token valide
        fastify.addHook('preHandler', middleware_1.authenticate);
        // Autorisation: seuls les rôles 'admin', 'superviseur', et 'universite' peuvent accéder aux universités
        fastify.addHook('preHandler', (0, middleware_1.authorize)(['admin', 'superviseur', 'universite']));
        /**
         * ========== UNIVERSITÉS ==========
         */
        // Changer le statut d'une université
        fastify.patch('/universites/:id/status', { schema: admin_schema_1.updateUniversiteStatusSchema }, (req, reply) => controller.updateUniversiteStatus(req, reply));
        // Approuver une université
        fastify.patch('/universites/:id/approve', { schema: admin_schema_1.approveUniversiteSchema }, (req, reply) => controller.approveUniversite(req, reply));
        // Rejeter une université
        fastify.patch('/universites/:id/reject', { schema: admin_schema_1.rejectUniversiteSchema }, (req, reply) => controller.rejectUniversite(req, reply));
        // Lister les universités en attente
        fastify.get('/universites/pending', { schema: admin_schema_1.listPendingUniversitesSchema }, (req, reply) => controller.listPendingUniversites(req, reply));
    });
    // Routes pour centres, accessibles aussi par centre_formation
    await app.register(async function (fastify) {
        fastify.addHook('preHandler', middleware_1.authenticate);
        fastify.addHook('preHandler', (0, middleware_1.authorize)(['admin', 'superviseur', 'centre_formation']));
        /**
         * ========== CENTRES DE FORMATION ==========
         */
        // Changer le statut d'un centre
        fastify.patch('/centres/:id/status', { schema: admin_schema_1.updateCentreStatusSchema }, (req, reply) => controller.updateCentreStatus(req, reply));
        // Approuver un centre
        fastify.patch('/centres/:id/approve', { schema: admin_schema_1.approveCentreSchema }, (req, reply) => controller.approveCentre(req, reply));
        // Rejeter un centre
        fastify.patch('/centres/:id/reject', { schema: admin_schema_1.rejectCentreSchema }, (req, reply) => controller.rejectCentre(req, reply));
        // Lister les centres en attente
        fastify.get('/centres/pending', { schema: admin_schema_1.listPendingCentresSchema }, (req, reply) => controller.listPendingCentres(req, reply));
    });
    // Stats dashboard, admin only
    await app.register(async function (fastify) {
        fastify.addHook('preHandler', middleware_1.authenticate);
        fastify.addHook('preHandler', (0, middleware_1.authorize)(['admin', 'superviseur']));
        fastify.get('/dashboard/stats', { schema: admin_schema_1.dashboardStatsSchema }, (req, reply) => controller.dashboardStats(req, reply));
    });
};
exports.adminRoutes = adminRoutes;
