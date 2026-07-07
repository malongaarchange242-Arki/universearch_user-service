"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRecommendationEmailSchema = exports.candidateSchema = exports.institutionSchema = void 0;
const zod_1 = require("zod");
exports.institutionSchema = zod_1.z.object({
    target_id: zod_1.z.string().min(1),
    target_name: zod_1.z.string().min(1),
    target_type: zod_1.z.enum(['universite', 'centre']),
    score: zod_1.z.number().min(0).max(1).optional(),
    rank: zod_1.z.number().int().positive().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
exports.candidateSchema = zod_1.z.object({
    user_id: zod_1.z.string().min(1),
    profile_id: zod_1.z.string().optional().nullable(),
    session_id: zod_1.z.string().optional().nullable(),
    first_name: zod_1.z.string().optional().nullable(),
    last_name: zod_1.z.string().optional().nullable(),
    full_name: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional().nullable(),
    telephone: zod_1.z.string().optional().nullable(),
    user_type: zod_1.z.string().optional().nullable(),
    reason: zod_1.z.string().optional().nullable(),
    quartier: zod_1.z.string().optional().nullable(),
});
exports.sendRecommendationEmailSchema = zod_1.z.object({
    candidate: exports.candidateSchema,
    institutions: zod_1.z.array(exports.institutionSchema).min(1),
    custom_message: zod_1.z.string().max(4000).optional().nullable(),
    requested_by: zod_1.z.object({
        admin_email: zod_1.z.string().email().optional().nullable(),
        admin_name: zod_1.z.string().optional().nullable(),
    }).optional().nullable(),
});
