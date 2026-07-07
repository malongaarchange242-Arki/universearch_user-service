"use strict";
/**
 * Routes pour les centres de formation.
 *
 * Routes publiques:
 *   GET  /centres        (lister approuvés)
 *   GET  /centres/:id    (voir détails approuvés)
 *
 * Routes protégées (rôle CENTRE_FORMATION + APPROVED):
 *   GET  /centres/me     (mes infos)
 *   PUT  /centres/me     (modifier mes infos)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.centresRoutes = void 0;
const centres_controller_1 = require("./centres.controller");
const centres_service_1 = require("./centres.service");
const supabase_1 = require("../../plugins/supabase");
const middleware_1 = require("../../middleware");
const centres_schema_1 = require("./centres.schema");
const centresRoutes = async (app, _options) => {
    const service = new centres_service_1.CentresService(supabase_1.supabaseAdmin);
    const controller = new centres_controller_1.CentresController(service);
    // Routes publiques (sans authentification)
    app.post('/', (req, reply) => controller.createCentre(req, reply));
    app.get('/', { schema: centres_schema_1.listCentresSchema }, (req, reply) => controller.listApprovedCentres(req, reply));
    app.get('/filieres', (req, reply) => controller.listFilieresCentre(req, reply));
    app.get('/:id', { schema: centres_schema_1.getCentreByIdSchema }, (req, reply) => controller.getCentreById(req, reply));
    // Routes protégées (authentification + autorisation CENTRE_FORMATION + vérification APPROVED)
    await app.register(async function (fastify) {
        fastify.addHook('preHandler', middleware_1.authenticate);
        fastify.addHook('preHandler', (0, middleware_1.authorize)(['centre_formation', 'admin']));
        fastify.get('/me', { schema: centres_schema_1.getMyCentreSchema }, (req, reply) => controller.getMyCentre(req, reply));
        fastify.put('/me', { schema: centres_schema_1.updateMyCentreSchema }, (req, reply) => controller.updateMyCentre(req, reply));
        // Upload logo for caller's centre
        fastify.post('/me/logo', (req, reply) => controller.uploadMyLogo(req, reply));
        // Attach filieres to caller's centre
        fastify.post('/me/filieres', (req, reply) => controller.attachFilieresToMyCentre(req, reply));
    });
};
exports.centresRoutes = centresRoutes;
