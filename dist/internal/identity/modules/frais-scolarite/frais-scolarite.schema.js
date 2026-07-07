"use strict";
/**
 * Schemas for Frais de Scolarité (Tuition Fees) validation
 * Using Zod for runtime type safety
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFraisByIdSchema = exports.createFraisSchema = exports.listFraisSchema = exports.ListFraisQuerySchema = exports.ListFraisResponseSchema = exports.FraisResponseSchema = exports.BulkUpdateFraisSchema = exports.CreateFraisRequestSchema = exports.FraisEntrySchema = void 0;
const zod_1 = require("zod");
// Valid levels and poles
const LEVELS = ['L1', 'L2', 'L3', 'Master'];
const POLES = ['Commercial', 'Polytechnique', 'Droit'];
// Single frais entry schema
exports.FraisEntrySchema = zod_1.z.object({
    level: zod_1.z.enum(LEVELS),
    pole: zod_1.z.enum(POLES),
    monthly_price: zod_1.z.number().nonnegative().default(0),
    yearly_price: zod_1.z.number().nonnegative().default(0),
});
// Request body for creating/updating frais
exports.CreateFraisRequestSchema = zod_1.z.object({
    records: zod_1.z.array(exports.FraisEntrySchema).min(1, 'At least one fee record is required'),
});
// Request body for bulk update
exports.BulkUpdateFraisSchema = zod_1.z.object({
    records: zod_1.z.array(zod_1.z.object({
        level: zod_1.z.enum(LEVELS),
        pole: zod_1.z.enum(POLES),
        monthly_price: zod_1.z.number().nonnegative(),
        yearly_price: zod_1.z.number().nonnegative(),
    })),
});
// Response schema for frais entry
exports.FraisResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    universite_id: zod_1.z.string().uuid(),
    level: zod_1.z.enum(LEVELS),
    pole: zod_1.z.enum(POLES),
    monthly_price: zod_1.z.number(),
    yearly_price: zod_1.z.number(),
    currency: zod_1.z.string().default('XAF'),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Response schema for list of frais
exports.ListFraisResponseSchema = zod_1.z.array(exports.FraisResponseSchema);
// Query schema for listing fees with filters
exports.ListFraisQuerySchema = zod_1.z.object({
    level: zod_1.z.enum(LEVELS).optional(),
    pole: zod_1.z.enum(POLES).optional(),
    page: zod_1.z.coerce.number().positive().default(1),
    limit: zod_1.z.coerce.number().positive().max(100).default(20),
});
// ============================================
// Fastify JSON Schema definitions
// ============================================
// JSON Schema for listing frais (response schema for Fastify)
exports.listFraisSchema = {
    description: 'List tuition fees for authenticated university',
    tags: ['Frais de Scolarité'],
    response: {
        200: {
            description: 'List of tuition fees',
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            universite_id: { type: 'string' },
                            level: { type: 'string', enum: ['L1', 'L2', 'L3', 'Master'] },
                            pole: { type: 'string', enum: ['Commercial', 'Polytechnique', 'Droit'] },
                            monthly_price: { type: 'number' },
                            yearly_price: { type: 'number' },
                            currency: { type: 'string' },
                            created_at: { type: 'string' },
                            updated_at: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
// JSON Schema for creating/updating frais
exports.createFraisSchema = {
    description: 'Create or update tuition fees for authenticated university',
    tags: ['Frais de Scolarité'],
    body: {
        type: 'object',
        required: ['records'],
        properties: {
            records: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['level', 'pole', 'monthly_price', 'yearly_price'],
                    properties: {
                        level: { type: 'string', enum: ['L1', 'L2', 'L3', 'Master'] },
                        pole: { type: 'string', enum: ['Commercial', 'Polytechnique', 'Droit'] },
                        monthly_price: { type: 'number', minimum: 0 },
                        yearly_price: { type: 'number', minimum: 0 },
                    },
                },
            },
        },
    },
    response: {
        200: {
            description: 'Fees saved successfully',
            type: 'object',
            properties: {
                message: { type: 'string' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            universite_id: { type: 'string' },
                            level: { type: 'string' },
                            pole: { type: 'string' },
                            monthly_price: { type: 'number' },
                            yearly_price: { type: 'number' },
                            currency: { type: 'string' },
                            created_at: { type: 'string' },
                            updated_at: { type: 'string' },
                        },
                    },
                },
            },
        },
    },
};
// JSON Schema for getting specific frais by ID
exports.getFraisByIdSchema = {
    description: 'Get specific tuition fee entry',
    tags: ['Frais de Scolarité'],
    params: {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
    },
    response: {
        200: {
            description: 'Fee entry',
            type: 'object',
            properties: {
                id: { type: 'string' },
                universite_id: { type: 'string' },
                level: { type: 'string' },
                pole: { type: 'string' },
                monthly_price: { type: 'number' },
                yearly_price: { type: 'number' },
                currency: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' },
            },
        },
    },
};
