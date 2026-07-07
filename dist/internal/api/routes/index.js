"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserServiceRoutes = void 0;
const auth_routes_1 = require("../../identity/modules/auth/auth.routes");
const users_routes_1 = require("../../identity/modules/users/users.routes");
const admin_routes_1 = require("../../identity/modules/admin/admin.routes");
const universites_routes_1 = require("../../identity/modules/universites/universites.routes");
const centres_routes_1 = require("../../identity/modules/centres-formation/centres.routes");
const filieres_routes_1 = require("../../identity/modules/filieres/filieres.routes");
const bde_routes_1 = require("../../identity/modules/bde/bde.routes");
const representants_routes_1 = require("../../identity/modules/representants/representants.routes");
const followers_routes_1 = require("../../identity/modules/followers/followers.routes");
const frais_scolarite_routes_1 = require("../../identity/modules/frais-scolarite/frais-scolarite.routes");
const routes_1 = require("../../messaging/routes");
const recommendation_mails_routes_1 = require("../../mail/modules/recommendation-mails/recommendation-mails.routes");
const etablissements_routes_1 = require("../../mail/modules/etablissements/etablissements.routes");
const notification_routes_1 = require("../../notification/handlers/notification.routes");
const registerUserServiceRoutes = async (app) => {
    app.get('/health', async () => ({
        status: 'ok',
        service: 'user-service',
        modules: ['identity', 'messaging', 'notification', 'mail'],
        timestamp: new Date().toISOString(),
    }));
    app.get('/health/live', async () => ({ status: 'live', service: 'user-service' }));
    app.get('/health/ready', async (request, reply) => {
        const services = {
            supabase: Boolean(app.supabase),
            redis: true,
            mailer: Boolean(app.mailer),
            socket: Boolean(app.io),
        };
        const ready = Object.values(services).every(Boolean);
        return reply.code(ready ? 200 : 503).send({ status: ready ? 'ready' : 'not_ready', services });
    });
    app.get('/metrics', async () => ({
        service: 'user-service',
        uptime_seconds: process.uptime(),
        memory_rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    }));
    app.post('/health', async () => ({
        status: 'ok',
        service: 'user-service',
        modules: ['identity', 'messaging', 'notification', 'mail'],
        timestamp: new Date().toISOString(),
    }));
    app.head('/health', async (_request, reply) => reply.status(200).send());
    app.register(auth_routes_1.authRoutes, { prefix: '/auth' });
    app.register(users_routes_1.usersRoutes);
    app.register(admin_routes_1.adminRoutes, { prefix: '/admin' });
    app.register(universites_routes_1.universitesRoutes, { prefix: '/universites' });
    app.register(centres_routes_1.centresRoutes, { prefix: '/centres' });
    app.register(filieres_routes_1.filieresRoutes, { prefix: '/filieres' });
    app.register(frais_scolarite_routes_1.fraisScolariteRoutes, { prefix: '/universites' });
    app.register(bde_routes_1.registerBdeRoutes);
    app.register(representants_routes_1.registerRepresentantRoutes);
    app.register(followers_routes_1.followersRoutes);
    app.get('/domaines-with-filieres', async (req, reply) => {
        const { FilieresService } = await Promise.resolve().then(() => __importStar(require('../../identity/modules/filieres/filieres.service')));
        const { FilieresController } = await Promise.resolve().then(() => __importStar(require('../../identity/modules/filieres/filieres.controller')));
        const service = new FilieresService(app.supabase);
        const controller = new FilieresController(service);
        return controller.listDomainesWithFilieres(req, reply);
    });
    await (0, routes_1.registerRoutes)(app);
    app.register(recommendation_mails_routes_1.recommendationMailRoutes, { prefix: '/api/mail' });
    app.register(etablissements_routes_1.registerEtablissementsRoutes);
    await (0, notification_routes_1.notificationRoutes)(app);
};
exports.registerUserServiceRoutes = registerUserServiceRoutes;
