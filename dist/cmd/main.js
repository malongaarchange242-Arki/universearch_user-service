"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const redis_1 = require("../internal/shared/cache/redis");
const mailer_1 = require("../internal/shared/mail/mailer");
const socket_manager_1 = require("../internal/shared/realtime/socket-manager");
let app = null;
let server = null;
async function shutdown(signal) {
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
        await (0, socket_manager_1.closeSocketManager)();
        app.log.info('[shutdown] Closing redis...');
        await (0, redis_1.closeRedisClient)();
        app.log.info('[shutdown] Closing mailer...');
        await (0, mailer_1.closeMailer)();
        if (server) {
            app.log.info('[shutdown] Closing HTTP server...');
            await server.close();
        }
    }
    catch (error) {
        app.log.error({ error }, '[shutdown] Error during shutdown');
    }
    finally {
        clearTimeout(shutdownTimeout);
        process.exit(0);
    }
}
const startServer = async () => {
    try {
        const { default: appInstance } = await Promise.resolve().then(() => __importStar(require('../app')));
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
    }
    catch (error) {
        console.error('[startup] Failed to start user-service', error);
        app?.log.error(error, 'Failed to start user-service');
        process.exit(1);
    }
};
void startServer();
