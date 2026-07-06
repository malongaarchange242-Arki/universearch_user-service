import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fp from 'fastify-plugin';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const createSupabaseClient = (): SupabaseClient => supabaseAdmin;

export default fp(async (fastify) => {
  if (!fastify.hasDecorator('supabase')) {
    fastify.decorate('supabase', supabaseAdmin);
  }
});
