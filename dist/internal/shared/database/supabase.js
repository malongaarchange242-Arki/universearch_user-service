"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeSupabaseClient = exports.createSupabaseClient = exports.supabaseAdmin = exports.getSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
let supabaseAdminClient = null;
const getSupabaseClient = () => {
    if (supabaseAdminClient) {
        return supabaseAdminClient;
    }
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }
    supabaseAdminClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return supabaseAdminClient;
};
exports.getSupabaseClient = getSupabaseClient;
exports.supabaseAdmin = (() => {
    try {
        return (0, exports.getSupabaseClient)();
    }
    catch {
        return null;
    }
})();
const createSupabaseClient = () => (0, exports.getSupabaseClient)();
exports.createSupabaseClient = createSupabaseClient;
const closeSupabaseClient = async () => {
    supabaseAdminClient = null;
};
exports.closeSupabaseClient = closeSupabaseClient;
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    if (!fastify.hasDecorator('supabase')) {
        try {
            fastify.decorate('supabase', (0, exports.getSupabaseClient)());
        }
        catch (error) {
            fastify.log.warn({ error }, 'Supabase client unavailable during startup');
        }
    }
});
