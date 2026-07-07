"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeSocketManager = exports.getSocketManager = exports.SocketManager = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
let socketManager = null;
class SocketManager {
    io = null;
    fastify = null;
    activeUsers = new Map();
    init(fastify, io) {
        if (this.io) {
            return this.io;
        }
        this.fastify = fastify;
        this.io = io;
        this.io.use((socket, next) => {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('No authentication token provided'));
            }
            try {
                const parts = token.split('.');
                if (parts.length !== 3) {
                    return next(new Error('Invalid token format'));
                }
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
                socket.data.user = {
                    user_id: payload.user_id || payload.id || payload.sub || null,
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
        this.io.on('connection', (socket) => {
            const user = socket.data.user;
            this.fastify?.log.info(`🔗 User connected: ${user.user_id} (socket: ${socket.id})`);
            this.activeUsers.set(socket.id, { socket, user });
            socket.on('join_conversation', (conversationId) => {
                socket.join(`conversation:${conversationId}`);
            });
            socket.on('leave_conversation', (conversationId) => {
                socket.leave(`conversation:${conversationId}`);
            });
            socket.on('message_sent', (data) => {
                this.io?.to(`conversation:${data.conversationId}`).emit('new_message', {
                    id: data.messageId,
                    conversation_id: data.conversationId,
                    sender_id: data.sender_id,
                    text: data.text,
                    created_at: data.created_at,
                    sender_type: user.is_admin ? 'admin' : user.institution_type,
                });
            });
            socket.on('typing', (conversationId) => {
                socket.broadcast.to(`conversation:${conversationId}`).emit('user_typing', { user_id: user.user_id, typing: true });
            });
            socket.on('stop_typing', (conversationId) => {
                socket.broadcast.to(`conversation:${conversationId}`).emit('user_typing', { user_id: user.user_id, typing: false });
            });
            socket.on('disconnect', () => {
                this.activeUsers.delete(socket.id);
            });
        });
        return this.io;
    }
    getIO() {
        return this.io;
    }
    async close() {
        if (!this.io) {
            return;
        }
        await new Promise((resolve) => this.io?.close(() => resolve()));
        this.io = null;
        this.fastify = null;
        this.activeUsers.clear();
    }
    getActiveUsersCount() {
        return this.activeUsers.size;
    }
}
exports.SocketManager = SocketManager;
const getSocketManager = () => {
    if (!socketManager) {
        socketManager = new SocketManager();
    }
    return socketManager;
};
exports.getSocketManager = getSocketManager;
const closeSocketManager = async () => {
    if (socketManager) {
        await socketManager.close();
        socketManager = null;
    }
};
exports.closeSocketManager = closeSocketManager;
