"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRoutes = void 0;
const bearer_user_1 = require("../../shared/middleware/bearer-user");
const notification_service_1 = require("../services/notification.service");
const unwrap = (body, key) => {
    return body && typeof body === 'object' && body[key] && typeof body[key] === 'object' ? body[key] : body;
};
const sendError = (reply, error) => {
    const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return reply.status(statusCode).send(statusCode === 422 ? { errors: [message] } : { error: message });
};
const getHeaderValue = (headers, name) => {
    const value = headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()];
    if (Array.isArray(value))
        return value[0];
    return typeof value === 'string' ? value : undefined;
};
const attachRequestContext = (request, payload) => {
    const headerUserId = getHeaderValue(request.headers, 'x-user-id');
    const candidates = [
        request?.user?.id,
        request?.currentUser?.id,
        headerUserId,
        payload?.user_id,
        Array.isArray(payload?.user_ids) ? payload.user_ids[0] : undefined,
        Array.isArray(payload?.recipient_user_ids) ? payload.recipient_user_ids[0] : undefined,
    ];
    const resolvedUserId = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (resolvedUserId) {
        request.user = { ...(request.user || {}), id: String(resolvedUserId) };
        request.currentUser = { ...(request.currentUser || {}), id: String(resolvedUserId) };
        request.requestUserId = String(resolvedUserId);
    }
    return resolvedUserId;
};
const notificationRoutes = async (app) => {
    const service = new notification_service_1.NotificationService(app.supabase);
    app.get('/', async () => ({ service: 'notification-service', status: 'ok' }));
    app.get('/api/health', async () => ({ status: 'ok', service: 'notification-service' }));
    app.head('/api/health', async (_request, reply) => reply.status(200).send());
    app.post('/api/health', async () => ({ status: 'ok', service: 'notification-service' }));
    app.get('/api/notifications/health', async () => ({ status: 'ok', service: 'notification-service' }));
    app.head('/api/notifications/health', async (_request, reply) => reply.status(200).send());
    app.post('/api/notifications', async (request, reply) => {
        try {
            const payload = unwrap(request.body, 'notification');
            attachRequestContext(request, payload);
            const notification = await service.create(payload);
            return reply.status(201).send({ notification });
        }
        catch (error) {
            return sendError(reply, error);
        }
    });
    app.post('/api/notifications/broadcast', async (request, reply) => {
        try {
            const payload = unwrap(request.body, 'notification');
            console.log('===== BROADCAST PAYLOAD =====');
            console.log(JSON.stringify(payload, null, 2));
            attachRequestContext(request, payload);
            const result = await service.broadcast(payload);
            console.log('===== BROADCAST RESULT =====');
            console.log(JSON.stringify(result, null, 2));
            return reply.status(201).send({
                count: result.count,
                notification_ids: result.notifications.map((item) => item.id),
                errors: result.errors,
                status: 'created',
            });
        }
        catch (error) {
            console.error(error);
            return sendError(reply, error);
        }
    });
    app.post('/api/notifications/register-device', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        try {
            const user = (0, bearer_user_1.getBearerUser)(request);
            const deviceToken = await service.registerDevice(user.id, unwrap(request.body, 'device_token'));
            return reply.status(201).send({ device_token: deviceToken });
        }
        catch (error) {
            return sendError(reply, error);
        }
    });
    app.get('/api/notifications', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        const user = (0, bearer_user_1.getBearerUser)(request);
        const requestedUserId = request.query.user_id || user.id;
        if (requestedUserId !== user.id)
            return reply.status(403).send({ error: 'Forbidden' });
        const notifications = await service.list(user.id);
        return reply.send({ notifications });
    });
    app.get('/api/notifications/unread-count/:user_id', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        const user = (0, bearer_user_1.getBearerUser)(request);
        if (request.params.user_id !== user.id)
            return reply.status(403).send({ error: 'Forbidden' });
        const unreadCount = await service.unreadCount(user.id);
        return reply.send({ unread_count: unreadCount });
    });
    app.put('/api/notifications/:id/mark-read', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        try {
            const user = (0, bearer_user_1.getBearerUser)(request);
            const notification = await service.markAsRead(request.params.id, user.id);
            return reply.send({ notification });
        }
        catch (error) {
            return sendError(reply, error);
        }
    });
    app.delete('/api/notifications/:id', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        try {
            const user = (0, bearer_user_1.getBearerUser)(request);
            const notification = await service.delete(request.params.id, user.id);
            return reply.send({ notification });
        }
        catch (error) {
            return sendError(reply, error);
        }
    });
    app.delete('/api/notifications', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        const user = (0, bearer_user_1.getBearerUser)(request);
        const deletedCount = await service.deleteAll(user.id);
        return reply.send({ deleted_count: deletedCount });
    });
    app.post('/api/notifications/:id/events', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        try {
            const user = (0, bearer_user_1.getBearerUser)(request);
            const body = (request.body ?? {});
            const event = await service.trackEvent(request.params.id, user.id, body.event_type || body.type, body.metadata || {}, body.token);
            return reply.status(201).send({ event });
        }
        catch (error) {
            return sendError(reply, error);
        }
    });
    app.get('/api/notifications/:id/analytics', { preHandler: bearer_user_1.bearerUser }, async (request, reply) => {
        try {
            const user = (0, bearer_user_1.getBearerUser)(request);
            const analytics = await service.analytics(request.params.id, user.id);
            return reply.send({ analytics });
        }
        catch (error) {
            return sendError(reply, error);
        }
    });
};
exports.notificationRoutes = notificationRoutes;
