"use strict";
// src/modules/users/users.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRoutes = void 0;
const users_controller_1 = require("./users.controller");
const supabase_1 = require("../../plugins/supabase"); // use exported admin client
const middleware_1 = require("../../middleware");
const usersRoutes = async (app, _options) => {
    const controller = new users_controller_1.UsersController(supabase_1.supabaseAdmin);
    // Public route for user count (for dashboard stats)
    app.get('/users/count', async (req, reply) => controller.getUserCount(req, reply));
    // Routes utilisateurs
    // - GET /users/:id -> authentifié (user lui-même, admin ou superviseur). Authorization fine-grained handled in controller/service.
    app.get('/users/:id', { preHandler: [middleware_1.authenticate] }, async (req, reply) => controller.getUser(req, reply));
    // - GET /users -> uniquement superviseur ou admin (temporairement ouvert pour développement)
    app.get('/users', { preHandler: [middleware_1.authenticate] }, async (req, reply) => controller.listUsers(req, reply));
    // - PUT /users/:id -> superviseur ou admin (ou l'utilisateur lui-même ; check in controller)
    app.put('/users/:id', { preHandler: [middleware_1.authenticate, (0, middleware_1.authorize)(['superviseur', 'admin'])] }, async (req, reply) => controller.updateUser(req, reply));
    // - DELETE /users/:id -> superviseur ou admin
    app.delete('/users/:id', { preHandler: [middleware_1.authenticate, (0, middleware_1.authorize)(['superviseur', 'admin'])] }, async (req, reply) => controller.deleteUser(req, reply));
};
exports.usersRoutes = usersRoutes;
