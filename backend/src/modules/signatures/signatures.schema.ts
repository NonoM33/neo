import { z } from 'zod';

export const SIGNATURE_STATUSES = [
  'draft',
  'pending',
  'signed',
  'declined',
  'expired',
  'cancelled',
] as const;

export const SIGNATURE_MODES = ['remote', 'direct'] as const;

/**
 * Query filter for the admin signatures list. All fields optional;
 * empty strings are coerced to `undefined` so `?status=` behaves like
 * "no filter" instead of failing enum validation.
 */
const emptyToUndefined = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

export const signatureFilterSchema = z.object({
  status: z.preprocess(emptyToUndefined, z.enum(SIGNATURE_STATUSES).optional()),
  mode: z.preprocess(emptyToUndefined, z.enum(SIGNATURE_MODES).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SignatureFilterInput = z.infer<typeof signatureFilterSchema>;
