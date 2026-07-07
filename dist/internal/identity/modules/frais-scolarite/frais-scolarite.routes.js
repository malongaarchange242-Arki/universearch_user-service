"use strict";
/**
 * Routes for Frais de Scolarité (Tuition Fees)
 *
 * Protected endpoints (require authentication + UNIVERSITE/ADMIN role):
 *   GET    /universites/me/frais-scolarite              (list all frais)
 *   POST   /universites/me/frais-scolarite              (create or update frais)
 *   GET    /universites/me/frais-scolarite/:id          (get specific frais)
 *   PUT    /universites/me/frais-scolarite/:id          (update specific frais)
 *   DELETE /universites/me/frais-scolarite/:id          (delete specific frais)
 *   GET    /universites/me/frais-scolarite/stats        (get statistics)
 *
 * Public endpoints:
 *   GET    /universites/:id/frais-scolarite             (get public frais for university)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraisScolariteRoutes = void 0;
const frais_scolarite_controller_1 = require("./frais-scolarite.controller");
const frais_scolarite_service_1 = require("./frais-scolarite.service");
const supabase_1 = require("../../plugins/supabase");
const middleware_1 = require("../../middleware");
const frais_scolarite_schema_1 = require("./frais-scolarite.schema");
const fraisScolariteRoutes = async (app, _options) => {
    const service = new frais_scolarite_service_1.FraisScolariteService(supabase_1.supabaseAdmin);
    const controller = new frais_scolarite_controller_1.FraisScolariteController(service);
    // ============================================
    // Protected routes (authenticated universités/admins)
    // ============================================
    await app.register(async function (fastify) {
        // Add authentication and authorization middleware
        fastify.addHook('preHandler', middleware_1.authenticate);
        fastify.addHook('preHandler', (0, middleware_1.authorize)(['universite', 'admin']));
        /**
         * GET /universites/me/frais-scolarite
         * List all tuition fees for authenticated university
         */
        fastify.get('/me/frais-scolarite', { schema: frais_scolarite_schema_1.listFraisSchema }, (req, reply) => controller.getFraisForMyUniversite(req, reply));
        /**
         * POST /universites/me/frais-scolarite
         * Create or update tuition fees (upsert operation)
         * Body: { records: [{ level, pole, monthly_price, yearly_price }, ...] }
         */
        fastify.post('/me/frais-scolarite', { schema: frais_scolarite_schema_1.createFraisSchema }, (req, reply) => controller.createOrUpdateFraisForMyUniversite(req, reply));
        /**
         * GET /universites/me/frais-scolarite/stats
         * Get statistics about fees (must be before :id route to avoid capture)
         */
        fastify.get('/me/frais-scolarite/stats', (req, reply) => controller.getFraisStatistics(req, reply));
        /**
         * GET /universites/me/frais-scolarite/:id
         * Get a specific frais entry by ID
         */
        fastify.get('/me/frais-scolarite/:id', { schema: frais_scolarite_schema_1.getFraisByIdSchema }, (req, reply) => controller.getFraisById(req, reply));
        /**
         * PUT /universites/me/frais-scolarite/:id
         * Update a specific frais entry
         */
        fastify.put('/me/frais-scolarite/:id', (req, reply) => controller.updateFraisById(req, reply));
        /**
         * DELETE /universites/me/frais-scolarite/:id
         * Delete a specific frais entry
         */
        fastify.delete('/me/frais-scolarite/:id', (req, reply) => controller.deleteFraisById(req, reply));
    });
    // ============================================
    // Public routes (no authentication required)
    // ============================================
    /**
     * GET /universites/:id/frais-scolarite
     * Get public frais for a specific university
     * This endpoint can be called without authentication to fetch fees for a specific university
     */
    app.get('/:id/frais-scolarite', async (req, reply) => {
        try {
            const { id } = req.params;
            if (!id) {
                return reply.status(400).send({
                    error: 'University ID is required',
                });
            }
            const frais = await service.getFraisByUniversiteId(id);
            reply.status(200).send({
                message: 'Frais retrieved successfully',
                data: frais,
            });
        }
        catch (err) {
            req.log.error(err);
            reply.status(500).send({
                error: err.message,
            });
        }
    });
};
exports.fraisScolariteRoutes = fraisScolariteRoutes;
