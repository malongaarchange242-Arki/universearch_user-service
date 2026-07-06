import { FastifyReply, FastifyRequest } from 'fastify';

const defaultRules = {
  login: { limit: 5, windowSeconds: 60 },
  register: { limit: 3, windowSeconds: 60 },
  messages: { limit: 30, windowSeconds: 60 },
  resetPassword: { limit: 5, windowSeconds: 60 },
};

type RuleKey = keyof typeof defaultRules;

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const getKey = (request: FastifyRequest, prefix: string) => {
  const ip = request.ip || (request.headers['x-forwarded-for'] as string) || 'unknown';
  const userId = (request as any).user?.id || (request as any).currentUser?.id || '';
  return `${prefix}:${String(ip)}:${userId}`;
};

const getWindowKey = (key: string, windowSeconds: number) => {
  return `${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
};

export const rateLimit = (rule: RuleKey) => async (request: FastifyRequest, reply: FastifyReply) => {
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
