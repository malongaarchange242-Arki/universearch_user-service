import { Server as SocketIOServer, Socket } from 'socket.io';
import { FastifyInstance } from 'fastify';

/* eslint-disable @typescript-eslint/no-explicit-any */

let socketManager: SocketManager | null = null;

export type SocketUser = {
  user_id?: string | null;
  is_admin?: boolean;
  institution_id?: string | null;
  institution_type?: string | null;
};

export class SocketManager {
  private io: SocketIOServer | null = null;
  private fastify: FastifyInstance | null = null;
  private activeUsers = new Map<string, { socket: Socket; user: SocketUser }>();

  public init(fastify: FastifyInstance, io: SocketIOServer) {
    if (this.io) {
      return this.io;
    }

    this.fastify = fastify;
    this.io = io;

    this.io.use((socket: any, next: any) => {
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
      } catch (error) {
        next(new Error('Token validation failed'));
      }
    });

    this.io.on('connection', (socket: any) => {
      const user = socket.data.user as SocketUser;
      this.fastify?.log.info(`🔗 User connected: ${user.user_id} (socket: ${socket.id})`);
      this.activeUsers.set(socket.id, { socket, user });

      socket.on('join_conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
      });

      socket.on('leave_conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
      });

      socket.on('message_sent', (data: { conversationId: string; messageId: string; sender_id: string; text: string; created_at: string }) => {
        this.io?.to(`conversation:${data.conversationId}`).emit('new_message', {
          id: data.messageId,
          conversation_id: data.conversationId,
          sender_id: data.sender_id,
          text: data.text,
          created_at: data.created_at,
          sender_type: user.is_admin ? 'admin' : user.institution_type,
        });
      });

      socket.on('typing', (conversationId: string) => {
        socket.broadcast.to(`conversation:${conversationId}`).emit('user_typing', { user_id: user.user_id, typing: true });
      });

      socket.on('stop_typing', (conversationId: string) => {
        socket.broadcast.to(`conversation:${conversationId}`).emit('user_typing', { user_id: user.user_id, typing: false });
      });

      socket.on('disconnect', () => {
        this.activeUsers.delete(socket.id);
      });
    });

    return this.io;
  }

  public getIO() {
    return this.io;
  }

  public async close() {
    if (!this.io) {
      return;
    }

    await new Promise<void>((resolve) => this.io?.close(() => resolve()));
    this.io = null;
    this.fastify = null;
    this.activeUsers.clear();
  }

  public getActiveUsersCount() {
    return this.activeUsers.size;
  }
}

export const getSocketManager = (): SocketManager => {
  if (!socketManager) {
    socketManager = new SocketManager();
  }
  return socketManager;
};

export const closeSocketManager = async (): Promise<void> => {
  if (socketManager) {
    await socketManager.close();
    socketManager = null;
  }
};
