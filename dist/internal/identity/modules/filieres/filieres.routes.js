"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filieresRoutes = void 0;
const filieres_controller_1 = require("./filieres.controller");
const filieres_service_1 = require("./filieres.service");
const supabase_1 = require("../../plugins/supabase");
const filieres_schema_1 = require("./filieres.schema");
const filieresRoutes = async (app, _opts) => {
    const service = new filieres_service_1.FilieresService(supabase_1.supabaseAdmin);
    const controller = new filieres_controller_1.FilieresController(service);
    // GET /filieres  -> list all filieres sorted by name
    app.get('/', { schema: filieres_schema_1.listFilieresSchema }, (req, reply) => controller.listAll(req, reply));
    // Note: domain grouping endpoint is also exposed at top-level /domaines-with-filieres in app.ts
    app.get('/domaines-with-filieres', { schema: filieres_schema_1.domainesWithFilieresSchema }, (req, reply) => controller.listDomainesWithFilieres(req, reply));
};
exports.filieresRoutes = filieresRoutes;
