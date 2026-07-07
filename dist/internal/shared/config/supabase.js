"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const createSupabaseClient = () => exports.supabaseAdmin;
exports.createSupabaseClient = createSupabaseClient;
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    if (!fastify.hasDecorator('supabase')) {
        fastify.decorate('supabase', exports.supabaseAdmin);
    }
});
