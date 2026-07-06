// src/plugins/auth.ts
import fp from 'fastify-plugin';

// Plugin no-op kept for compatibility if other parts expect an `auth` plugin file.
// Do NOT decorate `authenticate` here — use middleware functions in `src/middleware`.
export default fp(async () => {
  // intentionally empty
});
