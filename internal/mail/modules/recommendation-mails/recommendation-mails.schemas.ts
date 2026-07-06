import { z } from 'zod';

export const institutionSchema = z.object({
  target_id: z.string().min(1),
  target_name: z.string().min(1),
  target_type: z.enum(['universite', 'centre']),
  score: z.number().min(0).max(1).optional(),
  rank: z.number().int().positive().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const candidateSchema = z.object({
  user_id: z.string().min(1),
  profile_id: z.string().optional().nullable(),
  session_id: z.string().optional().nullable(),
  first_name: z.string().optional().nullable(),
  last_name: z.string().optional().nullable(),
  full_name: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telephone: z.string().optional().nullable(),
  user_type: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
  quartier: z.string().optional().nullable(),
});

export const sendRecommendationEmailSchema = z.object({
  candidate: candidateSchema,
  institutions: z.array(institutionSchema).min(1),
  custom_message: z.string().max(4000).optional().nullable(),
  requested_by: z.object({
    admin_email: z.string().email().optional().nullable(),
    admin_name: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type SendRecommendationEmailPayload = z.infer<typeof sendRecommendationEmailSchema>;
