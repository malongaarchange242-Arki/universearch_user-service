import { FastifyRequest, FastifyReply } from 'fastify';
import { FilieresService } from './filieres.service';

export class FilieresController {
  constructor(private service: FilieresService) {}

  async listAll(req: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await this.service.listAll();
      reply.status(200).send(data);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({ error: (err as Error).message });
    }
  }

  async listDomainesWithFilieres(req: FastifyRequest, reply: FastifyReply) {
    try {
      const map = await this.service.listDomainesWithFilieres();
      reply.status(200).send(map);
    } catch (err) {
      req.log.error(err);
      reply.status(500).send({ error: (err as Error).message });
    }
  }
}
