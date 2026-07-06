import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const createSupabaseClient = (): SupabaseClient => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
};
