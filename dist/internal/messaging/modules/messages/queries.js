"use strict";
// src/modules/messages/queries.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.markConversationAsRead = exports.createConversation = exports.getMessageById = exports.deleteMessage = exports.updateMessage = exports.createMessage = exports.getConversationMessages = exports.getConversationById = exports.getConversations = void 0;
/**
 * Get conversations accessible to the current user
 * - Admins see all conversations
 * - Non-admins see only their institution's conversation
 */
const getConversations = async (supabase, user, limit = 50, offset = 0) => {
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
    }
    else {
        // Non-admin users see:
        // 1. Conversations where they are the admin_id (personal conversations they created)
        // 2. Conversations in their institution (if they have an institution_id)
        if (user.institution_id) {
            // User has institution context - see their institution conversations OR their own created conversations
            query = query.or(`institution_id.eq.${user.institution_id},admin_id.eq.${user.user_id}`);
        }
        else {
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
exports.getConversations = getConversations;
/**
 * Get a single conversation by ID with access control
 */
const getConversationById = async (supabase, conversationId, user) => {
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
exports.getConversationById = getConversationById;
/**
 * Get messages for a conversation with pagination
 */
const getConversationMessages = async (supabase, conversationId, limit = 50, offset = 0) => {
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
exports.getConversationMessages = getConversationMessages;
/**
 * Create a new message
 */
const createMessage = async (supabase, conversationId, senderId, senderType, text, fileName, fileUrl) => {
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
exports.createMessage = createMessage;
/**
 * Update a message (only text content, owner validation required)
 */
const updateMessage = async (supabase, messageId, text) => {
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
exports.updateMessage = updateMessage;
/**
 * Delete a message
 */
const deleteMessage = async (supabase, messageId) => {
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);
    if (error) {
        throw new Error(`Failed to delete message: ${error.message}`);
    }
};
exports.deleteMessage = deleteMessage;
/**
 * Get message by ID
 */
const getMessageById = async (supabase, messageId) => {
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
exports.getMessageById = getMessageById;
/**
 * Create a new conversation
 */
const createConversation = async (supabase, adminId, institutionId, institutionType, name, description) => {
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
exports.createConversation = createConversation;
/**
 * Mark conversation as read
 */
const markConversationAsRead = async (supabase, conversationId, userId) => {
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
exports.markConversationAsRead = markConversationAsRead;
