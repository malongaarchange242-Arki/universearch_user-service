import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fp from 'fastify-plugin';

let supabaseAdminClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return supabaseAdminClient;
};

export const supabaseAdmin = (() => {
  try {
    return getSupabaseClient();
  } catch {
    return null as unknown as SupabaseClient;
  }
})();

export const createSupabaseClient = (): SupabaseClient => getSupabaseClient();

export const closeSupabaseClient = async (): Promise<void> => {
  supabaseAdminClient = null;
};

export default fp(async (fastify) => {
  if (!fastify.hasDecorator('supabase')) {
    try {
      fastify.decorate('supabase', getSupabaseClient());
    } catch (error) {
      fastify.log.warn({ error }, 'Supabase client unavailable during startup');
    }
  }
});
