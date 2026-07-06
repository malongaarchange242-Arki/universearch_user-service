import { FastifyReply, FastifyRequest } from 'fastify';

export type BearerUser = {
  id: string;
  email?: string | null;
  role?: string | null;
};

const decodePayload = (token: string): any => {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');
  return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
};

export const bearerUser = async (request: FastifyRequest, reply: FastifyReply) => {
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

    (request as any).currentUser = {
      id: String(id),
      email: payload.email ?? null,
      role: payload.role ?? payload.user_type ?? null,
    } satisfies BearerUser;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};

export const getBearerUser = (request: FastifyRequest): BearerUser | null => {
  return ((request as any).currentUser as BearerUser | undefined) ?? null;
};
