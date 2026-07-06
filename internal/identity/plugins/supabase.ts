import { createClient } from '@supabase/supabase-js';
import fp from 'fastify-plugin';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
  );
}

// Client admin exporté pour les services
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Plugin Fastify pour attacher supabase à l'instance
export default fp(async (fastify) => {
  fastify.decorate('supabase', supabaseAdmin);
});
