/**
 * Auth routes
 * src/modules/auth/auth.routes.ts
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  checkEmailHandler,
  updateSecurityHandler,
  refreshHandler,
} from './auth.controller';
import {
  registerSchema,
  loginSchema,
  checkEmailSchema,
  updateSecuritySchema,
  refreshSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema';
import { authenticate } from '../../middleware';
import { rateLimit } from '../../../shared/middleware/rate-limit';

import { forgotPasswordHandler, resetPasswordHandler } from './auth.controller';
export const authRoutes = async (
  app: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> => {
  // Création compte
  app.post('/register', { schema: registerSchema, preHandler: [rateLimit('register')] }, registerHandler as any);

  // Connexion
  app.post('/login', { schema: loginSchema, preHandler: [rateLimit('login')] }, loginHandler as any);

  // Refresh access token
  app.post('/refresh', { schema: refreshSchema }, refreshHandler as any);

  // Vérification d'email avant affichage du champ mot de passe
  app.post('/check-email', { schema: checkEmailSchema }, checkEmailHandler);

  // Déconnexion (protégée)
  app.post('/logout', { schema: logoutSchema, preHandler: [authenticate] }, logoutHandler as any);

  // Mise à jour des informations de sécurité (protégée)
  app.put('/update-security', { schema: updateSecuritySchema, preHandler: [authenticate] }, updateSecurityHandler);

  // Réinitialisation de mot de passe
  app.post('/forgot-password', { schema: forgotPasswordSchema, preHandler: [rateLimit('resetPassword')] }, forgotPasswordHandler as any);
  app.post('/reset-password', { schema: resetPasswordSchema, preHandler: [rateLimit('resetPassword')] }, resetPasswordHandler as any);
};
