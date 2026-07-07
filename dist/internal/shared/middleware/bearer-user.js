"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBearerUser = exports.bearerUser = void 0;
const decodePayload = (token) => {
    const parts = token.split('.');
    if (parts.length !== 3)
        throw new Error('Invalid token format');
    return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
};
const bearerUser = async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }
    try {
        const payload = decodePayload(authHeader.slice(7));
        const id = payload.id || payload.user_id || payload.sub;
        if (!id) {
            return reply.status(401).send({ error: 'Invalid token payload' });
        }
        request.currentUser = {
            id: String(id),
            email: payload.email ?? null,
            role: payload.role ?? payload.user_type ?? null,
        };
    }
    catch {
        return reply.status(401).send({ error: 'Invalid or expired token' });
    }
};
exports.bearerUser = bearerUser;
const getBearerUser = (request) => {
    return request.currentUser ?? null;
};
exports.getBearerUser = getBearerUser;
