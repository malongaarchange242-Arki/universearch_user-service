import { SupabaseClient } from '@supabase/supabase-js';
import { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient; // injecté via plugin supabase
  }

  interface FastifyRequest {
    user?: {
      id: string;
      email: string | null;
      role?: string;
    };
  }
}
