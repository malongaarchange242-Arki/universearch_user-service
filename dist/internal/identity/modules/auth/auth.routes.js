"use strict";
/**
 * Auth routes
 * src/modules/auth/auth.routes.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const auth_controller_1 = require("./auth.controller");
const auth_schema_1 = require("./auth.schema");
const middleware_1 = require("../../middleware");
const rate_limit_1 = require("../../../shared/middleware/rate-limit");
const auth_controller_2 = require("./auth.controller");
const authRoutes = async (app, _options) => {
    // Création compte
    app.post('/register', { schema: auth_schema_1.registerSchema, preHandler: [(0, rate_limit_1.rateLimit)('register')] }, auth_controller_1.registerHandler);
    // Connexion
    app.post('/login', { schema: auth_schema_1.loginSchema, preHandler: [(0, rate_limit_1.rateLimit)('login')] }, auth_controller_1.loginHandler);
    // Refresh access token
    app.post('/refresh', { schema: auth_schema_1.refreshSchema }, auth_controller_1.refreshHandler);
    // Vérification d'email avant affichage du champ mot de passe
    app.post('/check-email', { schema: auth_schema_1.checkEmailSchema }, auth_controller_1.checkEmailHandler);
    // Déconnexion (protégée)
    app.post('/logout', { schema: auth_schema_1.logoutSchema, preHandler: [middleware_1.authenticate] }, auth_controller_1.logoutHandler);
    // Mise à jour des informations de sécurité (protégée)
    app.put('/update-security', { schema: auth_schema_1.updateSecuritySchema, preHandler: [middleware_1.authenticate] }, auth_controller_1.updateSecurityHandler);
    // Réinitialisation de mot de passe
    app.post('/forgot-password', { schema: auth_schema_1.forgotPasswordSchema, preHandler: [(0, rate_limit_1.rateLimit)('resetPassword')] }, auth_controller_2.forgotPasswordHandler);
    app.post('/reset-password', { schema: auth_schema_1.resetPasswordSchema, preHandler: [(0, rate_limit_1.rateLimit)('resetPassword')] }, auth_controller_2.resetPasswordHandler);
};
exports.authRoutes = authRoutes;
