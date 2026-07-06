/**
 * Schemas for Frais de Scolarité (Tuition Fees) validation
 * Using Zod for runtime type safety
 */

import { z } from 'zod';

// Valid levels and poles
const LEVELS = ['L1', 'L2', 'L3', 'Master'] as const;
const POLES = ['Commercial', 'Polytechnique', 'Droit'] as const;

// Single frais entry schema
export const FraisEntrySchema = z.object({
  level: z.enum(LEVELS),
  pole: z.enum(POLES),
  monthly_price: z.number().nonnegative().default(0),
  yearly_price: z.number().nonnegative().default(0),
});

// Request body for creating/updating frais
export const CreateFraisRequestSchema = z.object({
  records: z.array(FraisEntrySchema).min(1, 'At least one fee record is required'),
});

// Request body for bulk update
export const BulkUpdateFraisSchema = z.object({
  records: z.array(
    z.object({
      level: z.enum(LEVELS),
      pole: z.enum(POLES),
      monthly_price: z.number().nonnegative(),
      yearly_price: z.number().nonnegative(),
    })
  ),
});

// Response schema for frais entry
export const FraisResponseSchema = z.object({
  id: z.string().uuid(),
  universite_id: z.string().uuid(),
  level: z.enum(LEVELS),
  pole: z.enum(POLES),
  monthly_price: z.number(),
  yearly_price: z.number(),
  currency: z.string().default('XAF'),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Response schema for list of frais
export const ListFraisResponseSchema = z.array(FraisResponseSchema);

// Query schema for listing fees with filters
export const ListFraisQuerySchema = z.object({
  level: z.enum(LEVELS).optional(),
  pole: z.enum(POLES).optional(),
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
});

// Type exports for TypeScript usage
export type FraisEntry = z.infer<typeof FraisEntrySchema>;
export type CreateFraisRequest = z.infer<typeof CreateFraisRequestSchema>;
export type BulkUpdateFrais = z.infer<typeof BulkUpdateFraisSchema>;
export type FraisResponse = z.infer<typeof FraisResponseSchema>;
export type ListFraisQuery = z.infer<typeof ListFraisQuerySchema>;

// ============================================
// Fastify JSON Schema definitions
// ============================================

// JSON Schema for listing frais (response schema for Fastify)
export const listFraisSchema = {
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
export const createFraisSchema = {
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
export const getFraisByIdSchema = {
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
