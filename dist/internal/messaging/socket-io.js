"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getactiveUsers = exports.setupSocketIO = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
// Active user connections
const activeUsers = new Map();
const setupSocketIO = (fastify, io) => {
    // Middleware for authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('No authentication token provided'));
        }
        try {
            // Simple token validation - in production, verify JWT signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                return next(new Error('Invalid token format'));
            }
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            socket.data.user = {
                user_id: payload.user_id || payload.id || payload.sub,
                is_admin: payload.is_admin === true || payload.is_admin === 'true' || payload.role === 'admin',
                institution_id: payload.institution_id || null,
                institution_type: payload.institution_type || null,
            };
            next();
        }
        catch (error) {
            next(new Error('Token validation failed'));
        }
    });
    // Connection handler
    io.on('connection', (socket) => {
        const user = socket.data.user;
        fastify.log.info(`🔗 User connected: ${user.user_id} (socket: ${socket.id})`);
        activeUsers.set(socket.id, { socket, user });
        // Join user to conversation rooms
        socket.on('join_conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
            fastify.log.debug(`👤 User ${user.user_id} joined conversation ${conversationId}`);
        });
        // Leave conversation
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
            fastify.log.debug(`👤 User ${user.user_id} left conversation ${conversationId}`);
        });
        // Message sent event
        socket.on('message_sent', (data) => {
            // Broadcast to all users in conversation
            io.to(`conversation:${data.conversationId}`).emit('new_message', {
                id: data.messageId,
                conversation_id: data.conversationId,
                sender_id: data.sender_id,
                text: data.text,
                created_at: data.created_at,
                sender_type: user.is_admin ? 'admin' : user.institution_type,
            });
            fastify.log.debug(`💬 Message sent in conversation ${data.conversationId}`);
        });
        // Typing indicator
        socket.on('typing', (conversationId) => {
            socket.broadcast.to(`conversation:${conversationId}`).emit('user_typing', {
                user_id: user.user_id,
                typing: true,
            });
        });
        socket.on('stop_typing', (conversationId) => {
            socket.broadcast.to(`conversation:${conversationId}`).emit('user_typing', {
                user_id: user.user_id,
                typing: false,
            });
        });
        // Disconnect handler
        socket.on('disconnect', () => {
            activeUsers.delete(socket.id);
            fastify.log.info(`❌ User disconnected: ${user.user_id} (socket: ${socket.id})`);
        });
        // Error handler
        socket.on('error', (error) => {
            fastify.log.error({ error }, 'Socket error');
        });
    });
};
exports.setupSocketIO = setupSocketIO;
const getactiveUsers = () => activeUsers;
exports.getactiveUsers = getactiveUsers;
