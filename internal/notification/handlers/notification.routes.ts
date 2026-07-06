import { FastifyInstance } from 'fastify';
import { bearerUser, getBearerUser } from '../../shared/middleware/bearer-user';
import { NotificationService } from '../services/notification.service';

const unwrap = (body: any, key: string) => {
  return body && typeof body === 'object' && body[key] && typeof body[key] === 'object' ? body[key] : body;
};

const sendError = (reply: any, error: unknown) => {
  const statusCode = typeof (error as any)?.statusCode === 'number' ? (error as any).statusCode : 500;
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  return reply.status(statusCode).send(statusCode === 422 ? { errors: [message] } : { error: message });
};

export const notificationRoutes = async (app: FastifyInstance) => {
  const service = new NotificationService(app.supabase);

  app.get('/', async () => ({ service: 'notification-service', status: 'ok' }));
  app.get('/api/health', async () => ({ status: 'ok', service: 'notification-service' }));
  app.head('/api/health', async (_request, reply) => reply.status(200).send());
  app.post('/api/health', async () => ({ status: 'ok', service: 'notification-service' }));
  app.get('/api/notifications/health', async () => ({ status: 'ok', service: 'notification-service' }));
  app.head('/api/notifications/health', async (_request, reply) => reply.status(200).send());

  app.post('/api/notifications', async (request, reply) => {
    try {
      const notification = await service.create(unwrap(request.body, 'notification'));
      return reply.status(201).send({ notification });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/notifications/broadcast', async (request, reply) => {
    try {
      const result = await service.broadcast(unwrap(request.body, 'notification'));
      return reply.status(201).send({
        count: result.count,
        notification_ids: result.notifications.map((item: any) => item.id),
        errors: result.errors,
        status: 'created',
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/notifications/register-device', { preHandler: bearerUser }, async (request, reply) => {
    try {
      const user = getBearerUser(request);
      const deviceToken = await service.registerDevice(user!.id, unwrap(request.body, 'device_token'));
      return reply.status(201).send({ device_token: deviceToken });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get<{ Querystring: { user_id?: string } }>('/api/notifications', { preHandler: bearerUser }, async (request, reply) => {
    const user = getBearerUser(request)!;
    const requestedUserId = request.query.user_id || user.id;
    if (requestedUserId !== user.id) return reply.status(403).send({ error: 'Forbidden' });
    const notifications = await service.list(user.id);
    return reply.send({ notifications });
  });

  app.get<{ Params: { user_id: string } }>('/api/notifications/unread-count/:user_id', { preHandler: bearerUser }, async (request, reply) => {
    const user = getBearerUser(request)!;
    if (request.params.user_id !== user.id) return reply.status(403).send({ error: 'Forbidden' });
    const unreadCount = await service.unreadCount(user.id);
    return reply.send({ unread_count: unreadCount });
  });

  app.put<{ Params: { id: string } }>('/api/notifications/:id/mark-read', { preHandler: bearerUser }, async (request, reply) => {
    try {
      const user = getBearerUser(request)!;
      const notification = await service.markAsRead(request.params.id, user.id);
      return reply.send({ notification });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete<{ Params: { id: string } }>('/api/notifications/:id', { preHandler: bearerUser }, async (request, reply) => {
    try {
      const user = getBearerUser(request)!;
      const notification = await service.delete(request.params.id, user.id);
      return reply.send({ notification });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.delete('/api/notifications', { preHandler: bearerUser }, async (request, reply) => {
    const user = getBearerUser(request)!;
    const deletedCount = await service.deleteAll(user.id);
    return reply.send({ deleted_count: deletedCount });
  });

  app.post<{ Params: { id: string } }>('/api/notifications/:id/events', { preHandler: bearerUser }, async (request, reply) => {
    try {
      const user = getBearerUser(request)!;
      const body = (request.body ?? {}) as any;
      const event = await service.trackEvent(
        request.params.id,
        user.id,
        body.event_type || body.type,
        body.metadata || {},
        body.token
      );
      return reply.status(201).send({ event });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.get<{ Params: { id: string } }>('/api/notifications/:id/analytics', { preHandler: bearerUser }, async (request, reply) => {
    try {
      const user = getBearerUser(request)!;
      const analytics = await service.analytics(request.params.id, user.id);
      return reply.send({ analytics });
    } catch (error) {
      return sendError(reply, error);
    }
  });
};
