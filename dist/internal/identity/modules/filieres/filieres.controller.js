"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilieresController = void 0;
class FilieresController {
    service;
    constructor(service) {
        this.service = service;
    }
    async listAll(req, reply) {
        try {
            const data = await this.service.listAll();
            reply.status(200).send(data);
        }
        catch (err) {
            req.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    }
    async listDomainesWithFilieres(req, reply) {
        try {
            const map = await this.service.listDomainesWithFilieres();
            reply.status(200).send(map);
        }
        catch (err) {
            req.log.error(err);
            reply.status(500).send({ error: err.message });
        }
    }
}
exports.FilieresController = FilieresController;
