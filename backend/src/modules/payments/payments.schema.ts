import { z } from 'zod';

export const paymentTargetSchema = z.enum(['invoice', 'order', 'quote_deposit']);

export const paymentStatusSchema = z.enum([
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'expired',
]);

// Création d'un lien de paiement (staff). Pour un acompte sur devis, on précise
// le pourcentage encaissé (défaut 30 %). Ignoré pour facture/commande.
export const createPaymentLinkSchema = z.object({
  targetType: paymentTargetSchema,
  targetId: z.string().uuid('Identifiant de la cible invalide'),
  depositPercent: z.coerce.number().min(1).max(100).optional(),
});

export const paymentFilterSchema = z.object({
  status: paymentStatusSchema.optional(),
  targetType: paymentTargetSchema.optional(),
  targetId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaymentTargetType = z.infer<typeof paymentTargetSchema>;
export type PaymentStatusType = z.infer<typeof paymentStatusSchema>;
export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;
export type PaymentFilter = z.infer<typeof paymentFilterSchema>;
