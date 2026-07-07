"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const createSupabaseClient = () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials in environment variables');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
};
exports.createSupabaseClient = createSupabaseClient;
