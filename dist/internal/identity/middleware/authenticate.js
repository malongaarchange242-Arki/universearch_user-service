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
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const metrics_1 = require("./metrics");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
/**
 * Middleware `authenticate` pour Fastify (preHandler).
 * - Vérifie l'en-tête `Authorization: Bearer <token>`
 * - Vérifie le token via JWT custom
 * - Injecte `request.user = { id, email, role }`
 * - Retourne 401 en cas d'échec
 *
 * Remarque : accède au client Supabase préalablement décoré sur l'instance Fastify
 * via `fastify.decorate('supabase', supabaseAdmin)` (ou similaire).
 */
const authenticate = async (request, reply) => {
    const start = Date.now();
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            (0, metrics_1.incCounter)('auth.missing_header');
            request.log?.info('authenticate: missing Authorization header');
            return reply.status(401).send({ error: 'Missing Authorization header' });
        }
        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            (0, metrics_1.incCounter)('auth.invalid_format');
            request.log?.info('authenticate: invalid Authorization format');
            return reply.status(401).send({ error: 'Invalid Authorization format' });
        }
        let secret = process.env.JWT_SECRET;
        if (!secret) {
            dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env') });
            secret = process.env.JWT_SECRET;
        }
        if (!secret) {
            request.log?.error('authenticate: missing JWT_SECRET configuration');
            return reply.status(500).send({ error: 'Authentication misconfigured' });
        }
        let decoded;
        try {
            // 🔥 EN DÉVELOPPEMENT: faire confiance au JWT sans vérifier la signature
            // (utile quand le token vient d'une source externe ou de production)
            if (process.env.NODE_ENV === 'development') {
                request.log?.info(`🔍 [AUTH] DEV mode: decoding JWT without verification`);
                // Décoder sans vérification en dev
                const parts = token.split('.');
                if (parts.length !== 3)
                    throw new Error('Invalid JWT format');
                try {
                    decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                    request.log?.info(`✅ [AUTH] JWT decoded successfully: id=${decoded.id}`);
                }
                catch {
                    throw new Error('Invalid JWT payload');
                }
            }
            else {
                // EN PRODUCTION: vérifier la signature
                decoded = jsonwebtoken_1.default.verify(token, secret);
            }
        }
        catch (_err) {
            (0, metrics_1.incCounter)('auth.invalid_token');
            request.log?.info('authenticate: invalid or expired token');
            return reply.status(401).send({ error: 'Invalid or expired token' });
        }
        if (!decoded ||
            typeof decoded !== 'object' ||
            !decoded.id ||
            !decoded.email ||
            !decoded.role) {
            (0, metrics_1.incCounter)('auth.invalid_token');
            request.log?.info('authenticate: invalid token payload');
            return reply.status(401).send({ error: 'Invalid token payload' });
        }
        // Injection user dans la requête
        const userObj = {
            id: String(decoded.id),
            email: decoded.email ?? null,
            role: String(decoded.role),
        };
        request.user = userObj;
        (0, metrics_1.incCounter)('auth.success');
        request.log?.info({ userId: userObj.id, role: userObj.role }, 'authenticate: success');
    }
    catch (err) {
        (0, metrics_1.incCounter)('auth.failure');
        request.log?.error(err);
        return reply.status(401).send({ error: 'Unauthorized' });
    }
    finally {
        const duration = Date.now() - start;
        (0, metrics_1.recordTiming)('auth.duration_ms', duration);
    }
};
exports.authenticate = authenticate;
exports.default = exports.authenticate;
