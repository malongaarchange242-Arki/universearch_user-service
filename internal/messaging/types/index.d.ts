export interface JWTPayload {
  user_id: string | null;
  user_type: 'admin' | 'institution' | 'user';
  is_admin: boolean;
  institution_id?: string | null;
  institution_type?: 'universite' | 'centre_formation' | null;
  email?: string | null;
  iat?: number;
  exp?: number;
}

export interface Conversation {
  id: string;
  admin_id: string;
  institution_id: string;
  institution_type: 'universite' | 'centre_formation';
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'admin' | 'universite' | 'centre_formation';
  sender_institution_type?: 'universite' | 'centre_formation';
  text: string;
  file_name?: string;
  file_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMessagePayload {
  conversation_id: string;
  text: string;
  file_name?: string;
  file_url?: string;
}

export interface ConversationListResponse {
  id: string;
  admin_id: string;
  institution_id: string;
  name: string;
  description?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

import 'fastify';
import { SupabaseClient } from '@supabase/supabase-js';

declare module 'fastify' {
  interface FastifyInstance {
    supabase: SupabaseClient;
  }
}
