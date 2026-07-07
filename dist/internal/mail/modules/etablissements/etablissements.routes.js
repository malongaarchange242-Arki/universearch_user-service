"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEtablissementsRoutes = registerEtablissementsRoutes;
const etablissements_service_1 = require("./etablissements.service");
async function registerEtablissementsRoutes(fastify) {
    fastify.get('/api/etablissements', async (request, reply) => {
        try {
            const etablissements = await (0, etablissements_service_1.getEtablissements)(fastify);
            reply.code(200).send(etablissements);
        }
        catch (error) {
            fastify.log.error(error);
            reply.code(500).send({
                error: 'Failed to fetch establishments',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
}
