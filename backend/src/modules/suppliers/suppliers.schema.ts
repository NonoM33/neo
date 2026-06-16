import { z } from 'zod';

const emptyToNull = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

const nullableText = (max: number) =>
  z.string().max(max).optional().nullable().transform(emptyToNull);

const nullableEmail = z
  .string()
  .max(255)
  .optional()
  .nullable()
  .transform(emptyToNull)
  .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email invalide');

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Le nom est obligatoire').max(255),
  email: nullableEmail,
  phone: nullableText(50),
  website: nullableText(2048),
  address: nullableText(2048),
  city: nullableText(100),
  postalCode: nullableText(20),
  country: nullableText(100),
  contactName: nullableText(255),
  contactEmail: nullableEmail,
  contactPhone: nullableText(50),
  paymentTerms: nullableText(100),
  deliveryLeadDays: z.number().int().min(0).max(365).optional().nullable(),
  notes: nullableText(5000),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierFilterSchema = z.object({
  search: z.string().trim().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
