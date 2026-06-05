import { z } from 'zod';
import { selectionItemSchema } from './configurateur.schema';

/** Un tour de conversation envoyé au guide IA. */
export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(2000),
});

/** Pièce de la maison du visiteur (clé technique + libellé lisible). */
export const assistantRoomSchema = z.object({
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(120),
  /** Étage de la pièce (0 = rez-de-chaussée). Optionnel. */
  floor: z.coerce.number().int().min(-5).max(50).optional(),
});

export const assistantSchema = z.object({
  /** Historique récent (le dernier message est celui du visiteur). */
  messages: z.array(assistantMessageSchema).min(1).max(20),
  /** Sélection courante du panier, pour que l'IA raisonne sur le réel. */
  selection: z.array(selectionItemSchema).max(200).default([]),
  /** Pièces de la maison où l'IA peut placer des équipements. */
  rooms: z.array(assistantRoomSchema).max(40).default([]),
  /** Budget TTC indicatif du visiteur, si exprimé. */
  budget: z.coerce.number().positive().max(1_000_000).optional(),
});

export type AssistantMessageInput = z.infer<typeof assistantMessageSchema>;
export type AssistantInput = z.infer<typeof assistantSchema>;

/** Action que l'IA demande d'appliquer côté front (panier ET pièces). */
export type AssistantAction =
  | { type: 'add'; productId: string; room: string; quantity: number }
  | { type: 'remove'; productId: string; room: string; quantity: number }
  | { type: 'add_room'; room: string; label: string; floor?: number }
  | { type: 'rename_room'; room: string; label: string }
  | { type: 'set_room_floor'; room: string; floor: number }
  | { type: 'remove_room'; room: string };

export interface AssistantReply {
  reply: string;
  actions: AssistantAction[];
}
