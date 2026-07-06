import 'fastify';
import { SupabaseClient } from '@supabase/supabase-js';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;
    mailer: any | null;
  }
}
