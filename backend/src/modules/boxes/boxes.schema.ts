import { z } from 'zod';

// Ce que la box envoie au premier boot (et tant qu'elle n'a pas sa cle).
export const announceSchema = z.object({
  provisioning_token: z.string().min(1),
  hardware_id: z.string().max(100).optional(),
  version: z.string().max(50).optional(),
});

// Ce que l'app installateur envoie apres avoir scanne le QR.
export const claimSchema = z.object({
  provisioning_token: z.string().min(1),
  client_id: z.string().uuid('ID client invalide'),
});

const linkSchema = z.enum(['up', 'down', 'unknown']);

export const heartbeatSchema = z.object({
  version: z.string().max(50).optional(),
  error_code: z.string().max(8).nullable().optional(),
  state: z
    .object({
      internet: linkSchema.optional(),
      cloud: linkSchema.optional(),
      mesh: linkSchema.optional(),
      home_assistant: z.enum(['running', 'unresponsive', 'stopped', 'unknown']).optional(),
      zigbee_coordinator: linkSchema.optional(),
      zigbee_devices: z.coerce.number().int().min(0).optional(),
      ip_address: z.string().max(45).nullable().optional(),
      hostname: z.string().max(100).optional(),
      disk_free_percent: z.coerce.number().int().min(0).max(100).nullable().optional(),
      cpu_temperature_c: z.coerce.number().nullable().optional(),
    })
    .default({}),
});

export const boxFilterSchema = z.object({
  status: z.enum(['unclaimed', 'claimed', 'enrolled', 'revoked']).optional(),
  clientId: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const supportFilterSchema = z.object({
  status: z.enum(['open', 'closed']).optional(),
});

export type AnnounceInput = z.infer<typeof announceSchema>;
export type ClaimInput = z.infer<typeof claimSchema>;
export type BoxHeartbeatInput = z.infer<typeof heartbeatSchema>;
export type BoxFilter = z.infer<typeof boxFilterSchema>;
export type SupportFilter = z.infer<typeof supportFilterSchema>;
