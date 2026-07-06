import { FastifyInstance } from 'fastify';
import { authRoutes } from '../../identity/modules/auth/auth.routes';
import { usersRoutes } from '../../identity/modules/users/users.routes';
import { adminRoutes } from '../../identity/modules/admin/admin.routes';
import { universitesRoutes } from '../../identity/modules/universites/universites.routes';
import { centresRoutes } from '../../identity/modules/centres-formation/centres.routes';
import { filieresRoutes } from '../../identity/modules/filieres/filieres.routes';
import { registerBdeRoutes } from '../../identity/modules/bde/bde.routes';
import { registerRepresentantRoutes } from '../../identity/modules/representants/representants.routes';
import { followersRoutes } from '../../identity/modules/followers/followers.routes';
import { fraisScolariteRoutes } from '../../identity/modules/frais-scolarite/frais-scolarite.routes';
import { registerRoutes as registerMessagingRoutes } from '../../messaging/routes';
import { recommendationMailRoutes } from '../../mail/modules/recommendation-mails/recommendation-mails.routes';
import { registerEtablissementsRoutes } from '../../mail/modules/etablissements/etablissements.routes';
import { notificationRoutes } from '../../notification/handlers/notification.routes';

export const registerUserServiceRoutes = async (app: FastifyInstance) => {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'user-service',
    modules: ['identity', 'messaging', 'notification', 'mail'],
    timestamp: new Date().toISOString(),
  }));
  app.get('/health/live', async () => ({ status: 'live', service: 'user-service' }));
  app.get('/health/ready', async (request, reply) => {
    const services = {
      supabase: Boolean(app.supabase),
      redis: true,
      mailer: Boolean((app as any).mailer),
      socket: Boolean((app as any).io),
    };
    const ready = Object.values(services).every(Boolean);
    return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', services });
  });
  app.get('/metrics', async () => ({
    service: 'user-service',
    uptime_seconds: process.uptime(),
    memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }));
  app.post('/health', async () => ({
    status: 'ok',
    service: 'user-service',
    modules: ['identity', 'messaging', 'notification', 'mail'],
    timestamp: new Date().toISOString(),
  }));
  app.head('/health', async (_request, reply) => reply.status(200).send());

  app.register(authRoutes, { prefix: '/auth' });
  app.register(usersRoutes as any);
  app.register(adminRoutes, { prefix: '/admin' });
  app.register(universitesRoutes, { prefix: '/universites' });
  app.register(centresRoutes, { prefix: '/centres' });
  app.register(filieresRoutes, { prefix: '/filieres' });
  app.register(fraisScolariteRoutes, { prefix: '/universites' });
  app.register(registerBdeRoutes as any);
  app.register(registerRepresentantRoutes as any);
  app.register(followersRoutes);

  app.get('/domaines-with-filieres', async (req, reply) => {
    const { FilieresService } = await import('../../identity/modules/filieres/filieres.service');
    const { FilieresController } = await import('../../identity/modules/filieres/filieres.controller');
    const service = new FilieresService(app.supabase as any);
    const controller = new FilieresController(service as any);
    return controller.listDomainesWithFilieres(req as any, reply as any);
  });

  await registerMessagingRoutes(app);
  app.register(recommendationMailRoutes, { prefix: '/api/mail' });
  app.register(registerEtablissementsRoutes);
  await notificationRoutes(app);
};
