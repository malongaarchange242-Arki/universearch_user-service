// src/routes.ts

import { FastifyInstance } from 'fastify';
import { authMiddleware, getUser } from './middleware/auth';
import { rateLimit } from '../shared/middleware/rate-limit';
import { getSocketManager } from '../shared/realtime/socket-manager';
import {
  getConversations,
  getConversationById,
  getConversationMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  getMessageById,
  markConversationAsRead,
  createConversation,
} from './modules/messages/queries';

export const registerRoutes = async (app: FastifyInstance) => {
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
  app.get<{ Querystring: { limit?: string; offset?: string } }>(
    '/conversations',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
        
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

        const conversations = await getConversations(
          app.supabase,
          user,
          limit,
          offset
        );

        return reply.send({ data: conversations, count: conversations.length });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        request.log.error({ err: error, msg: 'Failed to fetch conversations' });
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch conversations',
          details: errorMessage,
        });
      }
    }
  );

  /**
   * POST /conversations
   * Create a new conversation (admin or institution with institution_id)
   */
  app.post<{
    Body: {
      name: string;
      description?: string;
      institution_id?: string;
      institution_type?: 'universite' | 'centre_formation';
    };
  }>(
    '/conversations',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
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

        const convInstitutionType: 'universite' | 'centre_formation' = 
          (institution_type as 'universite' | 'centre_formation') ||
          (user.institution_type as 'universite' | 'centre_formation') ||
          'universite';

        // For personal conversations (institution_id = null), use a unique identifier
        const finalInstitutionId = institutionId || adminId;

        const conversation = await createConversation(
          app.supabase,
          adminId,
          finalInstitutionId,
          convInstitutionType,
          name,
          description
        );

        return reply.status(201).send({ data: conversation });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create conversation',
          details: errorMessage,
        });
      }
    }
  );

  /**
   * GET /conversations/:id
   * Get a specific conversation
   */
  app.get<{ Params: { id: string } }>(
    '/conversations/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { id } = request.params;

        const conversation = await getConversationById(app.supabase, id, user);

        if (!conversation) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found or access denied',
          });
        }

        return reply.send({ data: conversation });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch conversation',
        });
      }
    }
  );

  /**
   * GET /conversations/:id/messages
   * Get messages in a conversation with pagination
   */
  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    '/conversations/:id/messages',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { id } = request.params;
        const limit = Math.min(parseInt(request.query.limit || '50'), 100);
        const offset = parseInt(request.query.offset || '0');

        // Verify conversation access
        const conversation = await getConversationById(app.supabase, id, user);
        if (!conversation) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found or access denied',
          });
        }

        const messages = await getConversationMessages(
          app.supabase,
          id,
          limit,
          offset
        );

        return reply.send({ data: messages, count: messages.length });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch messages',
        });
      }
    }
  );

  /**
   * POST /messages
   * Create a new message
   */
  app.post<{
    Body: {
      conversation_id: string;
      text: string;
      file_name?: string;
      file_url?: string;
    };
  }>(
    '/messages',
    { preHandler: [authMiddleware, rateLimit('messages')] },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { conversation_id, text, file_name, file_url } = request.body;

        if (!conversation_id || !text) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Missing required fields: conversation_id, text',
          });
        }

        // Verify conversation access
        const conversation = await getConversationById(
          app.supabase,
          conversation_id,
          user
        );
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

        const message = await createMessage(
          app.supabase,
          conversation_id,
          user.user_id,
          user.is_admin
            ? 'admin'
            : ((user.institution_type as 'universite' | 'centre_formation') ||
                'universite'),
          text,
          file_name,
          file_url
        );

        // Emit real-time event to socket.io room for this conversation so other clients receive it
        try {
          const io = getSocketManager().getIO();
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
        } catch (emitErr) {
          request.log.error({ err: emitErr }, 'Failed to emit socket event after message creation');
        }

        return reply.status(201).send({ data: message });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create message',
        });
      }
    }
  );

  /**
   * PUT /messages/:id
   * Update a message (owner only)
   */
  app.put<{
    Params: { id: string };
    Body: { text: string };
  }>(
    '/messages/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { id } = request.params;
        const { text } = request.body;

        if (!text) {
          return reply.status(400).send({
            error: 'Bad Request',
            message: 'Missing required field: text',
          });
        }

        const message = await getMessageById(app.supabase, id);
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

        const updatedMessage = await updateMessage(app.supabase, id, text);

        return reply.send({ data: updatedMessage });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update message',
        });
      }
    }
  );

  /**
   * DELETE /messages/:id
   * Delete a message (owner or admin)
   */
  app.delete<{ Params: { id: string } }>(
    '/messages/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { id } = request.params;

        const message = await getMessageById(app.supabase, id);
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

        await deleteMessage(app.supabase, id);

        return reply.status(204).send();
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete message',
        });
      }
    }
  );

  /**
   * POST /conversations/:id/read
   * Mark conversation as read
   */
  app.post<{ Params: { id: string } }>(
    '/conversations/:id/read',
    { preHandler: authMiddleware },
    async (request, reply) => {
      try {
        const user = getUser(request);
        const { id } = request.params;

        // Verify conversation access
        const conversation = await getConversationById(app.supabase, id, user);
        if (!conversation) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Conversation not found or access denied',
          });
        }

        await markConversationAsRead(app.supabase, id, user.user_id || 'unknown');

        return reply.send({ status: 'ok' });
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to mark conversation as read',
        });
      }
    }
  );
};
