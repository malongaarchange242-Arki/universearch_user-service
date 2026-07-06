// src/modules/messages/queries.ts

import { SupabaseClient } from '@supabase/supabase-js';
import { JWTPayload, Conversation, Message } from '../../types';

/**
 * Get conversations accessible to the current user
 * - Admins see all conversations
 * - Non-admins see only their institution's conversation
 */
export const getConversations = async (
  supabase: SupabaseClient,
  user: JWTPayload,
  limit = 50,
  offset = 0
): Promise<Conversation[]> => {
  // Start with base query
  let query = supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply access control based on user type
  if (user.is_admin) {
    // Admins see all conversations (or can filter by institution if specified)
    // No additional filter needed
  } else {
    // Non-admin users see:
    // 1. Conversations where they are the admin_id (personal conversations they created)
    // 2. Conversations in their institution (if they have an institution_id)
    if (user.institution_id) {
      // User has institution context - see their institution conversations OR their own created conversations
      query = query.or(`institution_id.eq.${user.institution_id},admin_id.eq.${user.user_id}`);
    } else {
      // User has no institution - see only conversations they created
      query = query.eq('admin_id', user.user_id);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch conversations: ${error.message}`);
  }

  return data || [];
};

/**
 * Get a single conversation by ID with access control
 */
export const getConversationById = async (
  supabase: SupabaseClient,
  conversationId: string,
  user: JWTPayload
): Promise<Conversation | null> => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch conversation: ${error.message}`);
  }

  // Check access control:
  // 1. Admins can see all conversations
  // 2. Non-admins can see conversations in their institution OR conversations they created
  if (!user.is_admin) {
    // User can access if:
    // - Conversation is in their institution, OR
    // - They are the one who created it (admin_id)
    if (data.institution_id !== user.institution_id && data.admin_id !== user.user_id) {
      return null;
    }
  }

  return data;
};

/**
 * Get messages for a conversation with pagination
 */
export const getConversationMessages = async (
  supabase: SupabaseClient,
  conversationId: string,
  limit = 50,
  offset = 0
): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`);
  }

  return (data || []).reverse(); // Return oldest first
};

/**
 * Create a new message
 */
export const createMessage = async (
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  senderType: 'admin' | 'universite' | 'centre_formation',
  text: string,
  fileName?: string,
  fileUrl?: string
): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        sender_type: senderType,
        text,
        file_name: fileName || null,
        file_url: fileUrl || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create message: ${error.message}`);
  }

  return data;
};

/**
 * Update a message (only text content, owner validation required)
 */
export const updateMessage = async (
  supabase: SupabaseClient,
  messageId: string,
  text: string
): Promise<Message> => {
  const { data, error } = await supabase
    .from('messages')
    .update({
      text,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update message: ${error.message}`);
  }

  return data;
};

/**
 * Delete a message
 */
export const deleteMessage = async (
  supabase: SupabaseClient,
  messageId: string
): Promise<void> => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  if (error) {
    throw new Error(`Failed to delete message: ${error.message}`);
  }
};

/**
 * Get message by ID
 */
export const getMessageById = async (
  supabase: SupabaseClient,
  messageId: string
): Promise<Message | null> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch message: ${error.message}`);
  }

  return data;
};

/**
 * Create a new conversation
 */
export const createConversation = async (
  supabase: SupabaseClient,
  adminId: string,
  institutionId: string,
  institutionType: 'universite' | 'centre_formation',
  name: string,
  description?: string
): Promise<Conversation> => {
  // Use upsert to avoid duplicate key errors
  const { data, error } = await supabase
    .from('conversations')
    .upsert([
      {
        admin_id: adminId,
        institution_id: institutionId,
        institution_type: institutionType,
        name,
        description: description || null,
      },
    ], {
      onConflict: 'admin_id,institution_id,institution_type'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return data;
};

/**
 * Mark conversation as read
 */
export const markConversationAsRead = async (
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<void> => {
  const { error } = await supabase
    .from('conversation_reads')
    .upsert([
      {
        conversation_id: conversationId,
        user_id: userId,
        read_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    throw new Error(`Failed to mark conversation as read: ${error.message}`);
  }
};
