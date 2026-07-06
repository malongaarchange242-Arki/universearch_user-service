// src/middleware/auth.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTPayload } from '../types';

/**
 * Validate if a string is a valid UUID (v4 format)
 */
const isValidUUID = (value: any): value is string => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * JWT Authentication Middleware
 * Extracts and validates JWT token from Authorization header
 * Attaches decoded payload to request
 * 
 * ✅ CRITICAL: Validates required fields and prevents empty UUID strings
 */
export const authMiddleware = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.slice(7); // Remove "Bearer " prefix

    // Decode JWT (in production, you should validate the signature)
    // Using a simple base64 decode for now - should use jsonwebtoken library
    const parts = token.split('.');
    if (parts.length !== 3) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token format',
      });
    }

    try {
      let decodedPayload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );

      // 🔥 CRITICAL FIX: Sanitize the payload to prevent empty UUIDs
      // Validate user_id is a proper UUID (required for messaging operations)
      // Try multiple field names: user_id, id (from old JWT format), sub (from OIDC)
      const userId = decodedPayload.user_id || decodedPayload.id || decodedPayload.sub;
      if (userId && !isValidUUID(userId)) {
        request.log.warn(`⚠️ Invalid user_id UUID format: ${userId}`);
      }

      decodedPayload = {
        user_id: isValidUUID(userId) ? userId : null,
        user_type: decodedPayload.user_type || 'user',
        is_admin: decodedPayload.is_admin === true || decodedPayload.is_admin === 'true' || decodedPayload.role === 'admin',
        
        // Remove empty strings that would fail UUID validation in PostgreSQL
        institution_id: decodedPayload.institution_id && decodedPayload.institution_id.trim() 
          ? decodedPayload.institution_id 
          : null,  // Keep as null if not in JWT - let the route handle it
        institution_type: decodedPayload.institution_type || (decodedPayload.role === 'universite' ? 'universite' : decodedPayload.role === 'centre' ? 'centre_formation' : null),
        
        email: decodedPayload.email || null,
        iat: decodedPayload.iat,
        exp: decodedPayload.exp,
      } as JWTPayload;

      // Attach to request for use in routes
      (request as any).user = decodedPayload;
    } catch (e) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid token payload',
      });
    }
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

/**
 * Get authenticated user from request
 * The middleware has already sanitized the payload
 */
export const getUser = (request: FastifyRequest): JWTPayload => {
  return (request as any).user || {};
};
