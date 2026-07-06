import { FastifyRequest, FastifyReply } from 'fastify';
import { incCounter, recordTiming } from './metrics';

/**
 * Middleware `authorize(allowedRoles)`
 * - Vérifie que `request.user` existe (doit être précédé par `authenticate`)
 * - Vérifie que `request.user.role` fait partie des `allowedRoles`
 * - Pour les universités et centres de formation: vérifie que le statut est APPROVED ou PENDING
 * - Retourne 403 si rôle non autorisé ou statut non approuvé
 */
const SUPPORTED_ROLES = new Set(['superviseur', 'admin', 'universite', 'bde', 'utilisateur', 'centre_formation']);

/**
 * Rôles qui nécessitent une vérification de statut APPROVED
 */
const ROLES_REQUIRING_APPROVAL = new Set(['universite', 'centre_formation']);

export const authorize = (allowedRoles: string[]) => {
  const allowedSet = new Set(allowedRoles);

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const start = Date.now();
    try {
      // Auth check
      if (!request.user) {
        incCounter('authorize.unauthenticated');
        request.log?.info('authorize: unauthenticated');
        return reply.status(401).send({ error: 'Unauthenticated' });
      }

      const roleRaw = (request.user as any).role as string | undefined;
      const role = roleRaw?.toLowerCase();

      if (!role) {
        incCounter('authorize.missing_role');
        request.log?.info({ userId: (request.user as any).id }, 'authorize: missing role');
        return reply.status(403).send({ error: 'Forbidden: missing role' });
      }

      if (!SUPPORTED_ROLES.has(role)) {
        incCounter('authorize.unknown_role');
        request.log?.info({ userId: (request.user as any).id, role }, 'authorize: unknown role');
        return reply.status(403).send({ error: 'Forbidden: unknown role' });
      }

      if (!allowedSet.has(role)) {
        incCounter('authorize.forbidden');
        request.log?.info({ userId: (request.user as any).id, role, allowedRoles: Array.from(allowedSet) }, 'authorize: insufficient privileges');
        return reply.status(403).send({ error: 'Forbidden: insufficient privileges' });
      }

      // 🔐 Vérification du statut APPROVED pour universités et centres de formation
      if (ROLES_REQUIRING_APPROVAL.has(role)) {
        try {
          const fastify = request.server as any;
          const userId = (request.user as any).id;

          const table = role === 'universite' ? 'universites' : 'centres_formation';

          const { data, error } = await fastify.supabase
            .from(table)
            .select('statut')
            .eq('profile_id', userId)
            .single();

          if (error || !data) {
            incCounter('authorize.account_not_found');
            request.log?.info(
              { userId, role },
              `authorize: ${table} account not found`
            );
            return reply.status(403).send({
              error: `Forbidden: ${role} account not found`,
            });
          }

          if (data.statut !== 'APPROVED' && data.statut !== 'PENDING') {
            incCounter('authorize.not_approved');
            request.log?.info(
              { userId, role, statut: data.statut },
              `authorize: ${role} not approved`
            );
            return reply.status(403).send({
              error: `Forbidden: Your ${role} account is not approved yet (status: ${data.statut})`,
            });
          }
        } catch (approvalErr) {
          incCounter('authorize.approval_check_failed');
          request.log?.error(approvalErr);
          return reply.status(500).send({
            error: 'Failed to verify account approval status',
          });
        }
      }
      incCounter('authorize.success');
      request.log?.info({ userId: (request.user as any).id, role }, 'authorize: success');
      return;
    } finally {
      recordTiming('authorize.duration_ms', Date.now() - start);
    }
  };
};

export default authorize;
