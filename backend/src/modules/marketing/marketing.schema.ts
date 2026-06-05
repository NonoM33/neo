import { z } from 'zod';

/** Schémas Zod partagés du module marketing (codes promo, bannières, popups, campagnes). */

const isoDate = z.coerce.date();

export const createPromoCodeSchema = z.object({
  code: z
    .string()
    .min(2, 'Code trop court')
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, 'Lettres, chiffres, tirets uniquement'),
  description: z.string().max(2000).optional(),
  discountType: z.enum(['pourcentage', 'montant_fixe']),
  discountValue: z.coerce.number().positive('Valeur invalide'),
  minOrderHT: z.coerce.number().min(0).optional(),
  maxUses: z.coerce.number().int().positive().optional(),
  perClientOnce: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
  startsAt: isoDate.optional(),
  expiresAt: isoDate.optional(),
}).refine(
  (d) => d.discountType !== 'pourcentage' || d.discountValue <= 100,
  { message: 'Un pourcentage ne peut pas dépasser 100', path: ['discountValue'] },
);

export const updatePromoCodeSchema = z.object({
  description: z.string().max(2000).nullable().optional(),
  discountType: z.enum(['pourcentage', 'montant_fixe']).optional(),
  discountValue: z.coerce.number().positive().optional(),
  minOrderHT: z.coerce.number().min(0).nullable().optional(),
  maxUses: z.coerce.number().int().positive().nullable().optional(),
  perClientOnce: z.coerce.boolean().optional(),
  active: z.coerce.boolean().optional(),
  startsAt: isoDate.nullable().optional(),
  expiresAt: isoDate.nullable().optional(),
});

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
  totalHT: z.coerce.number().min(0),
  email: z.string().email().optional(),
});

export const bannerSchema = z.object({
  message: z.string().min(1).max(300),
  linkUrl: z.string().url().max(500).nullable().optional(),
  linkLabel: z.string().max(80).nullable().optional(),
  bgColor: z.string().max(20).default('#0d6efd'),
  textColor: z.string().max(20).default('#ffffff'),
  dismissible: z.coerce.boolean().default(true),
  active: z.coerce.boolean().default(true),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  priority: z.coerce.number().int().default(0),
});

export const popupSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  imageUrl: z.string().url().max(500).nullable().optional(),
  ctaLabel: z.string().max(80).nullable().optional(),
  ctaUrl: z.string().url().max(500).nullable().optional(),
  promoCodeId: z.string().uuid().nullable().optional(),
  active: z.coerce.boolean().default(true),
  startsAt: isoDate.nullable().optional(),
  endsAt: isoDate.nullable().optional(),
  delaySeconds: z.coerce.number().int().min(0).max(120).default(3),
  frequency: z.enum(['toujours', 'une_fois_session', 'une_fois_jour']).default('une_fois_session'),
  priority: z.coerce.number().int().default(0),
});

export const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(300),
  html: z.string().min(1),
  audience: z.enum(['clients', 'leads', 'custom']).default('clients'),
  customEmails: z.array(z.string().email()).default([]),
  promoCodeId: z.string().uuid().nullable().optional(),
  scheduledAt: isoDate.nullable().optional(),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type PopupInput = z.infer<typeof popupSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
