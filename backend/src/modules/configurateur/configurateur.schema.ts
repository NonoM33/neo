import { z } from 'zod';

export const INSTALL_MODE_LABELS = {
  autonome: "Je l'installe moi-même",
  pro: 'Installation par un professionnel',
} as const;

export const selectionItemSchema = z.object({
  productId: z.string().uuid('Identifiant produit invalide'),
  quantity: z.coerce.number().int().positive('Quantité doit être positive'),
  /** Pièce d'où vient la sélection — purement informatif (récap client). */
  room: z.string().max(100).optional(),
});

export const estimateSchema = z.object({
  items: z.array(selectionItemSchema).max(200).default([]),
});

export const saveSchema = estimateSchema.extend({
  installMode: z.enum(['autonome', 'pro']).default('pro'),
  housingType: z.enum(['maison', 'appartement']).optional(),
  surface: z.coerce.number().positive().optional(),
  /** Origine du site appelant (pour le lien de reprise/QR en local). */
  origin: z.string().url().optional(),
});

export const submitSchema = estimateSchema.extend({
  installMode: z.enum(['autonome', 'pro']).default('pro'),
  /** Code d'une configuration sauvegardée, à rattacher au lead créé. */
  code: z.string().max(20).optional(),
  firstName: z.string().min(1, 'Prénom requis').max(100),
  lastName: z.string().min(1, 'Nom requis').max(100),
  email: z.string().email('Email invalide').max(255),
  phone: z.string().min(6, 'Téléphone requis').max(20),
  postalCode: z.string().min(4, 'Code postal requis').max(10),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  surface: z.coerce.number().positive().optional(),
  message: z.string().max(2000).optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Vous devez accepter le traitement de vos données.',
    }),
  /** Honeypot anti-bot : doit rester vide. */
  website: z.string().max(0).optional(),
});

export type SelectionItemInput = z.infer<typeof selectionItemSchema>;
export type EstimateInput = z.infer<typeof estimateSchema>;
export type SaveInput = z.infer<typeof saveSchema>;
export type SubmitInput = z.infer<typeof submitSchema>;
