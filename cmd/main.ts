import * as dotenv from 'dotenv';

dotenv.config();

import { FastifyInstance } from 'fastify';
import { closeRedisClient } from '../internal/shared/cache/redis';
import { closeMailer } from '../internal/shared/mail/mailer';
import { closeSocketManager } from '../internal/shared/realtime/socket-manager';

let app: FastifyInstance | null = null;
let server: FastifyInstance | null = null;

async function shutdown(signal: string) {
  if (!app) {
    return;
  }

  app.log.info(`[shutdown] Received ${signal}`);

  const shutdownTimeout = setTimeout(() => {
    app?.log.error('[shutdown] Forced exit after timeout');
    process.exit(1);
  }, 10_000);

  try {
    app.log.info('[shutdown] Closing socket manager...');
    await closeSocketManager();

    app.log.info('[shutdown] Closing redis...');
    await closeRedisClient();

    app.log.info('[shutdown] Closing mailer...');
    await closeMailer();

    if (server) {
      app.log.info('[shutdown] Closing HTTP server...');
      await server.close();
    }
  } catch (error) {
    app.log.error({ error }, '[shutdown] Error during shutdown');
  } finally {
    clearTimeout(shutdownTimeout);
    process.exit(0);
  }
}

const startServer = async (): Promise<void> => {
  try {
    const { default: appInstance } = await import('../app');
    app = appInstance;

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    process.on('unhandledRejection', (reason, promise) => {
      app?.log.error({ reason, promise }, 'Unhandled Rejection');
    });

    process.on('uncaughtException', (error) => {
      app?.log.error(error, 'Uncaught Exception');
      process.exit(1);
    });

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));

    await app?.listen({ port, host });
    app?.log.info(`User service listening on http://${host}:${port}`);
    app?.log.info(`Socket.io available on ws://${host}:${port}`);
  } catch (error) {
    console.error('[startup] Failed to start user-service', error);
    app?.log.error(error, 'Failed to start user-service');
    process.exit(1);
  }
};

void startServer();
