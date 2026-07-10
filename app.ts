import * as dotenv from 'dotenv';

dotenv.config();

import Fastify, { FastifyError, FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyIO from 'fastify-socket.io';
import supabasePlugin from './internal/shared/database/supabase';
import { getMailer } from './internal/shared/mail/mailer';
import { registerUserServiceRoutes } from './internal/api/routes';
import { getSocketManager } from './internal/shared/realtime/socket-manager';


const getCorsOrigin = () => {
  const configured = process.env.CORS_ORIGIN || '';
  if (process.env.NODE_ENV === 'production') {
    return configured.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  return configured || true;
};

export const app: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
  bodyLimit: 10 * 1024 * 1024,
});

app.addHook('onRequest', (request, reply, done) => {
  (request as any).startTime = process.hrtime.bigint();
  const raw = (request.raw.url || '').toString();
  const cleaned = raw.replace(/%20/g, '').replace(/\s+/g, '');
  if (cleaned !== raw && cleaned.length > 0) {
    reply.redirect(cleaned, 301);
    return;
  }
  done();
});

app.register(cors, {
  origin: getCorsOrigin(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-user-id'],
  credentials: true,
});

app.register(fastifyIO, {
  cors: {
    origin: getCorsOrigin(),
    credentials: true,
  },
});

app.register(supabasePlugin as any);
app.decorate('mailer', null);

app.addHook('onResponse', (request, reply) => {
  const start = (request as any).startTime;
  if (!start) return;

  const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
  const userId = (request as any).user?.id || (request as any).currentUser?.id || (request as any).requestUserId || null;
  app.log.info({
    service: 'user-service',
    module: (request.url || '').includes('/auth') ? 'identity' : (request.url || '').includes('/messages') ? 'messaging' : 'http',
    request_id: request.id,
    user_id: userId,
    latency_ms: Number(duration.toFixed(2)),
    endpoint: `${request.method} ${request.url}`,
    status: reply.statusCode,
    ip: request.ip,
  });
});

app.ready(async () => {
  const socketManager = getSocketManager();
  socketManager.init(app, (app as any).io);
  if (process.env.MAILER_INIT_ON_START === 'true') {
    (app as any).mailer = getMailer();
  }
});

app.register(async (fastify) => {
  await registerUserServiceRoutes(fastify);
});

app.setErrorHandler((error: FastifyError, request, reply) => {
  request.log.error(error);
  reply.status(error.statusCode ?? 500).send({
    success: false,
    error: error.message ?? 'Internal Server Error',
  });
});

export default app;
