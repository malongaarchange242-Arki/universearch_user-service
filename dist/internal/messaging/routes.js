"use strict";
// src/routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const auth_1 = require("./middleware/auth");
const rate_limit_1 = require("../shared/middleware/rate-limit");
const socket_manager_1 = require("../shared/realtime/socket-manager");
const queries_1 = require("./modules/messages/queries");
const registerRoutes = async (app) => {
    // Health check endpoint
    app.get('/messaging/health', async (request, reply) => {
        return { status: 'ok', service: 'messaging-service' };
    });
    /**
     * GET /conversations
     * Get all conversations accessible to the current user
     * Admin: all conversations
     * Institution: only their own conversation
     */
    app.get('/conversations', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            if (!user) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'User not found in request',
                });
            }
            // 🔥 SECURITY: Handled by getConversations function
            // Non-admin users see their institution conversations OR conversations they created
            const limit = Math.min(parseInt(request.query.limit || '50'), 100);
            const offset = parseInt(request.query.offset || '0');
            const conversations = await (0, queries_1.getConversations)(app.supabase, user, limit, offset);
            return reply.send({ data: conversations, count: conversations.length });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            request.log.error({ err: error, msg: 'Failed to fetch conversations' });
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to fetch conversations',
                details: errorMessage,
            });
        }
    });
    /**
     * POST /conversations
     * Create a new conversation (admin or institution with institution_id)
     */
    app.post('/conversations', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { name, description, institution_id, institution_type } = request.body;
            if (!name) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Missing required field: name',
                });
            }
            if (!user.user_id) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'User ID is missing from authentication token',
                });
            }
            const adminId = user.user_id;
            // Admins can specify institution_id in body or JWT
            // Non-admins default to null (personal/direct conversation)
            const institutionId = user.is_admin
                ? institution_id || user.institution_id || null
                : user.institution_id || null;
            const convInstitutionType = institution_type ||
                user.institution_type ||
                'universite';
            // For personal conversations (institution_id = null), use a unique identifier
            const finalInstitutionId = institutionId || adminId;
            const conversation = await (0, queries_1.createConversation)(app.supabase, adminId, finalInstitutionId, convInstitutionType, name, description);
            return reply.status(201).send({ data: conversation });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to create conversation',
                details: errorMessage,
            });
        }
    });
    /**
     * GET /conversations/:id
     * Get a specific conversation
     */
    app.get('/conversations/:id', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { id } = request.params;
            const conversation = await (0, queries_1.getConversationById)(app.supabase, id, user);
            if (!conversation) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Conversation not found or access denied',
                });
            }
            return reply.send({ data: conversation });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to fetch conversation',
            });
        }
    });
    /**
     * GET /conversations/:id/messages
     * Get messages in a conversation with pagination
     */
    app.get('/conversations/:id/messages', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { id } = request.params;
            const limit = Math.min(parseInt(request.query.limit || '50'), 100);
            const offset = parseInt(request.query.offset || '0');
            // Verify conversation access
            const conversation = await (0, queries_1.getConversationById)(app.supabase, id, user);
            if (!conversation) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Conversation not found or access denied',
                });
            }
            const messages = await (0, queries_1.getConversationMessages)(app.supabase, id, limit, offset);
            return reply.send({ data: messages, count: messages.length });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to fetch messages',
            });
        }
    });
    /**
     * POST /messages
     * Create a new message
     */
    app.post('/messages', { preHandler: [auth_1.authMiddleware, (0, rate_limit_1.rateLimit)('messages')] }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { conversation_id, text, file_name, file_url } = request.body;
            if (!conversation_id || !text) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Missing required fields: conversation_id, text',
                });
            }
            // Verify conversation access
            const conversation = await (0, queries_1.getConversationById)(app.supabase, conversation_id, user);
            if (!conversation) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Conversation not found or access denied',
                });
            }
            // Validate user_id is a proper UUID
            if (!user.user_id) {
                return reply.status(401).send({
                    error: 'Unauthorized',
                    message: 'User ID is missing from authentication token',
                });
            }
            const message = await (0, queries_1.createMessage)(app.supabase, conversation_id, user.user_id, user.is_admin
                ? 'admin'
                : (user.institution_type ||
                    'universite'), text, file_name, file_url);
            // Emit real-time event to socket.io room for this conversation so other clients receive it
            try {
                const io = (0, socket_manager_1.getSocketManager)().getIO();
                if (io && conversation_id) {
                    io.to(`conversation:${conversation_id}`).emit('new_message', {
                        id: message.id,
                        conversation_id: conversation_id,
                        sender_id: message.sender_id,
                        text: message.text,
                        created_at: message.created_at,
                        sender_type: message.sender_type,
                    });
                    request.log.debug({ conversation_id }, `📣 Emitted new_message for conversation ${conversation_id}`);
                }
            }
            catch (emitErr) {
                request.log.error({ err: emitErr }, 'Failed to emit socket event after message creation');
            }
            return reply.status(201).send({ data: message });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to create message',
            });
        }
    });
    /**
     * PUT /messages/:id
     * Update a message (owner only)
     */
    app.put('/messages/:id', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { id } = request.params;
            const { text } = request.body;
            if (!text) {
                return reply.status(400).send({
                    error: 'Bad Request',
                    message: 'Missing required field: text',
                });
            }
            const message = await (0, queries_1.getMessageById)(app.supabase, id);
            if (!message) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Message not found',
                });
            }
            // Check ownership
            if (user.user_id && message.sender_id !== user.user_id && !user.is_admin) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'You can only edit your own messages',
                });
            }
            const updatedMessage = await (0, queries_1.updateMessage)(app.supabase, id, text);
            return reply.send({ data: updatedMessage });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to update message',
            });
        }
    });
    /**
     * DELETE /messages/:id
     * Delete a message (owner or admin)
     */
    app.delete('/messages/:id', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { id } = request.params;
            const message = await (0, queries_1.getMessageById)(app.supabase, id);
            if (!message) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Message not found',
                });
            }
            // Check authorization: owner or admin
            if (user.user_id && message.sender_id !== user.user_id && !user.is_admin) {
                return reply.status(403).send({
                    error: 'Forbidden',
                    message: 'You can only delete your own messages',
                });
            }
            await (0, queries_1.deleteMessage)(app.supabase, id);
            return reply.status(204).send();
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to delete message',
            });
        }
    });
    /**
     * POST /conversations/:id/read
     * Mark conversation as read
     */
    app.post('/conversations/:id/read', { preHandler: auth_1.authMiddleware }, async (request, reply) => {
        try {
            const user = (0, auth_1.getUser)(request);
            const { id } = request.params;
            // Verify conversation access
            const conversation = await (0, queries_1.getConversationById)(app.supabase, id, user);
            if (!conversation) {
                return reply.status(404).send({
                    error: 'Not Found',
                    message: 'Conversation not found or access denied',
                });
            }
            await (0, queries_1.markConversationAsRead)(app.supabase, id, user.user_id || 'unknown');
            return reply.send({ status: 'ok' });
        }
        catch (error) {
            request.log.error(error);
            return reply.status(500).send({
                error: 'Internal Server Error',
                message: 'Failed to mark conversation as read',
            });
        }
    });
};
exports.registerRoutes = registerRoutes;
