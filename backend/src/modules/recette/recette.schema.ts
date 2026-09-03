import { z } from 'zod';

export const RECETTE_APPS = ['admin', 'crm', 'flutter', 'site'] as const;
export const RECETTE_SEVERITIES = ['bloquant', 'majeur', 'mineur', 'cosmetique'] as const;
export const RECETTE_STATUSES = ['ouvert', 'corrige', 'valide', 'a_revoir'] as const;
export const RECETTE_VALIDATIONS = ['a_tester', 'valide', 'a_corriger'] as const;

const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

export const recetteFilterSchema = z.object({
  app: z.preprocess(emptyToUndefined, z.enum(RECETTE_APPS).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(RECETTE_STATUSES).optional()),
  severity: z.preprocess(emptyToUndefined, z.enum(RECETTE_SEVERITIES).optional()),
  validation: z.preprocess(emptyToUndefined, z.enum(RECETTE_VALIDATIONS).optional()),
});

export const createFeedbackSchema = z.object({
  featureId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  severity: z.enum(RECETTE_SEVERITIES),
  stepsToReproduce: z.string().trim().max(5000).optional(),
  expectedResult: z.string().trim().max(5000).optional(),
  actualResult: z.string().trim().max(5000).optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.enum(RECETTE_STATUSES),
});

export const updateFeatureValidationSchema = z.object({
  validationStatus: z.enum(RECETTE_VALIDATIONS),
});

export type RecetteFilterInput = z.infer<typeof recetteFilterSchema>;
export type CreateFeedbackBody = z.infer<typeof createFeedbackSchema>;
