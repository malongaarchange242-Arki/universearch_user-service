"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = void 0;
const defaultRules = {
    login: { limit: 5, windowSeconds: 60 },
    register: { limit: 3, windowSeconds: 60 },
    messages: { limit: 30, windowSeconds: 60 },
    resetPassword: { limit: 5, windowSeconds: 60 },
};
const rateLimitStore = new Map();
const getKey = (request, prefix) => {
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
    const userId = request.user?.id || request.currentUser?.id || '';
    return `${prefix}:${String(ip)}:${userId}`;
};
const getWindowKey = (key, windowSeconds) => {
    return `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
};
const rateLimit = (rule) => async (request, reply) => {
    const config = defaultRules[rule];
    const key = getKey(request, `rate-limit:${rule}`);
    const windowKey = getWindowKey(key, config.windowSeconds);
    const now = Date.now();
    const entry = rateLimitStore.get(windowKey);
    const count = entry && entry.expiresAt > now ? entry.count + 1 : 1;
    const expiresAt = now + config.windowSeconds * 1000;
    rateLimitStore.set(windowKey, { count, expiresAt });
    if (count > config.limit) {
        reply.status(429).send({ success: false, error: 'Too many requests' });
        throw new Error('rate-limit-exceeded');
    }
};
exports.rateLimit = rateLimit;
