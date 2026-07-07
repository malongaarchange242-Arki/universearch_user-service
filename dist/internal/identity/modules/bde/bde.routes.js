"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBdeRoutes = registerBdeRoutes;
const bde_service_1 = require("./bde.service");
const bde_controller_1 = require("./bde.controller");
const bde_schema_1 = require("./bde.schema");
const middleware_1 = require("../../middleware");
async function registerBdeRoutes(fastify, opts) {
    const bdeService = new bde_service_1.BdeService(fastify.supabase);
    const bdeController = new bde_controller_1.BdeController(bdeService);
    // POST /universites/bde - Create a new BDE (only for universities)
    fastify.post('/universites/bde', {
        schema: bde_schema_1.BdeSchemas.createBde,
        preHandler: [middleware_1.authenticate], // Require authentication
    }, (request, reply) => bdeController.createBde(request, reply));
    fastify.get('/universites/me/bde', {
        preHandler: [middleware_1.authenticate],
    }, (request, reply) => bdeController.getMyBde(request, reply));
    // GET /universites/:universite_id/bde - Get BDE for a university
    fastify.get('/universites/:universite_id/bde', {
        schema: bde_schema_1.BdeSchemas.getUniversiteBde,
    }, (request, reply) => bdeController.getBdeByUniversiteId(request, reply));
    // GET /bde/:id - Get BDE by ID
    fastify.get('/bde/:id', {
        schema: bde_schema_1.BdeSchemas.getBdeById,
    }, (request, reply) => bdeController.getBdeById(request, reply));
    // PUT /bde/:id - Update BDE
    fastify.put('/bde/:id', {
        schema: bde_schema_1.BdeSchemas.updateBde,
        preHandler: [middleware_1.authenticate], // Require authentication
    }, (request, reply) => bdeController.updateBde(request, reply));
    // DELETE /bde/:id - Delete BDE
    fastify.delete('/bde/:id', {
        schema: bde_schema_1.BdeSchemas.deleteBde,
        preHandler: [middleware_1.authenticate], // Require authentication
    }, (request, reply) => bdeController.deleteBde(request, reply));
}
