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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify_socket_io_1 = __importDefault(require("fastify-socket.io"));
const supabase_1 = __importDefault(require("./internal/shared/database/supabase"));
const mailer_1 = require("./internal/shared/mail/mailer");
const routes_1 = require("./internal/api/routes");
const socket_manager_1 = require("./internal/shared/realtime/socket-manager");
const getCorsOrigin = () => {
    const configured = process.env.CORS_ORIGIN || '';
    if (process.env.NODE_ENV === 'production') {
        return configured.split(',').map((entry) => entry.trim()).filter(Boolean);
    }
    return configured || true;
};
exports.app = (0, fastify_1.default)({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
    },
    bodyLimit: 10 * 1024 * 1024,
});
exports.app.addHook('onRequest', (request, reply, done) => {
    request.startTime = process.hrtime.bigint();
    const raw = (request.raw.url || '').toString();
    const cleaned = raw.replace(/%20/g, '').replace(/\s+/g, '');
    if (cleaned !== raw && cleaned.length > 0) {
        reply.redirect(cleaned, 301);
        return;
    }
    done();
});
exports.app.register(cors_1.default, {
    origin: getCorsOrigin(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-user-id'],
    credentials: true,
});
exports.app.register(fastify_socket_io_1.default, {
    cors: {
        origin: getCorsOrigin(),
        credentials: true,
    },
});
exports.app.register(supabase_1.default);
exports.app.decorate('mailer', null);
exports.app.addHook('onResponse', (request, reply) => {
    const start = request.startTime;
    if (!start)
        return;
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000;
    const userId = request.user?.id || request.currentUser?.id || request.requestUserId || null;
    exports.app.log.info({
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
exports.app.ready(async () => {
    const socketManager = (0, socket_manager_1.getSocketManager)();
    socketManager.init(exports.app, exports.app.io);
    if (process.env.MAILER_INIT_ON_START === 'true') {
        exports.app.mailer = (0, mailer_1.getMailer)();
    }
});
exports.app.register(async (fastify) => {
    await (0, routes_1.registerUserServiceRoutes)(fastify);
});
exports.app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.status(error.statusCode ?? 500).send({
        success: false,
        error: error.message ?? 'Internal Server Error',
    });
});
exports.default = exports.app;
