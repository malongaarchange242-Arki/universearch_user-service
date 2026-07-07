"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRepresentantRoutes = registerRepresentantRoutes;
const representants_service_1 = require("./representants.service");
const representants_controller_1 = require("./representants.controller");
const representants_schema_1 = require("./representants.schema");
const middleware_1 = require("../../middleware");
async function registerRepresentantRoutes(fastify, opts) {
    const representantService = new representants_service_1.RepresentantService(fastify.supabase);
    const representantController = new representants_controller_1.RepresentantController(representantService);
    // POST /centres/representants - Create a new representant (only for centres)
    fastify.post('/centres/representants', {
        schema: representants_schema_1.RepresentantSchemas.createRepresentant,
        preHandler: [middleware_1.authenticate], // Require authentication
    }, (request, reply) => representantController.createRepresentant(request, reply));
    // GET /centres/:centre_id/representants - Get all representants for a centre
    fastify.get('/centres/:centre_id/representants', {
        schema: representants_schema_1.RepresentantSchemas.getCentreRepresentants,
    }, (request, reply) => representantController.getRepresentantsByCentreId(request, reply));
    // GET /representants/:id - Get representant by ID
    fastify.get('/representants/:id', {
        schema: representants_schema_1.RepresentantSchemas.getRepresentantById,
    }, (request, reply) => representantController.getRepresentantById(request, reply));
    // PUT /representants/:id - Update representant
    fastify.put('/representants/:id', {
        schema: representants_schema_1.RepresentantSchemas.updateRepresentant,
        preHandler: [middleware_1.authenticate], // Require authentication
    }, (request, reply) => representantController.updateRepresentant(request, reply));
    // DELETE /representants/:id - Delete representant
    fastify.delete('/representants/:id', {
        schema: representants_schema_1.RepresentantSchemas.deleteRepresentant,
        preHandler: [middleware_1.authenticate], // Require authentication
    }, (request, reply) => representantController.deleteRepresentant(request, reply));
}
