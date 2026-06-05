import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  type: z.enum(['salon', 'cuisine', 'chambre', 'salle_de_bain', 'bureau', 'garage', 'exterieur', 'toilette', 'entree', 'dressing', 'placard', 'autre']).default('autre'),
  icon: z.string().max(50).optional(),
  linkedRoomIds: z.array(z.string().uuid()).optional(),
  floor: z.coerce.number().int().default(0),
  notes: z.string().optional(),
});

export const updateRoomSchema = createRoomSchema.partial();

export const createChecklistItemSchema = z.object({
  category: z.string().min(1, 'Catégorie requise'),
  label: z.string().min(1, 'Label requis'),
  productId: z.string().uuid().optional(),
  quantity: z.coerce.number().int().positive().default(1),
  checked: z.boolean().default(false),
  notes: z.string().optional(),
});

export const updateChecklistItemSchema = createChecklistItemSchema.partial();

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
