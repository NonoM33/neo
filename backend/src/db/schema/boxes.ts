import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';
import { clients } from './projects';
import { users } from './users';

// Les box physiques Neo (Raspberry + HA OS + add-on neo_box). Cycle de vie :
//   unclaimed  la box s'est annoncee au 1er boot avec son jeton, personne ne l'a rattachee
//   claimed    un installateur a scanne le QR et lie la box a un client ; la cle API
//              l'attend (apiKeyPending) jusqu'a la prochaine annonce de la box
//   enrolled   la box a recu sa cle : elle parle desormais en Bearer neo_box_...
//   revoked    cle invalidee (box perdue, remplacee, client parti)
export const boxStatusEnum = pgEnum('box_status', ['unclaimed', 'claimed', 'enrolled', 'revoked']);
export const boxSupportStatusEnum = pgEnum('box_support_status', ['open', 'closed']);

// Ce que la box remonte a chaque heartbeat (miroir du BoxState de l'add-on).
export interface BoxTelemetry {
  internet?: string;
  cloud?: string;
  mesh?: string;
  home_assistant?: string;
  zigbee_coordinator?: string;
  zigbee_devices?: number;
  ip_address?: string | null;
  hostname?: string;
  disk_free_percent?: number | null;
  cpu_temperature_c?: number | null;
}

export const boxes = pgTable('boxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Empreinte SHA-256 du jeton de provisioning (20 car. Crockford, 100 bits :
  // assez d'entropie pour une empreinte simple, et il faut un lookup deterministe).
  provisioningTokenHash: varchar('provisioning_token_hash', { length: 64 }).notNull().unique(),
  // Les 4 derniers caracteres du jeton, pour reconnaitre la box dans une liste.
  tokenSuffix: varchar('token_suffix', { length: 4 }).notNull(),
  hardwareId: varchar('hardware_id', { length: 100 }),
  status: boxStatusEnum('status').notNull().default('unclaimed'),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  // Cle API de la box : empreinte stockee, secret livre UNE fois via apiKeyPending.
  apiKeyHash: varchar('api_key_hash', { length: 64 }).unique(),
  apiKeyPending: text('api_key_pending'),
  // Telemetrie
  version: varchar('version', { length: 50 }),
  errorCode: varchar('error_code', { length: 8 }),
  telemetry: jsonb('telemetry').$type<BoxTelemetry>(),
  ipAddress: varchar('ip_address', { length: 45 }),
  hostname: varchar('hostname', { length: 100 }),
  zigbeeDevices: integer('zigbee_devices').default(0),
  lastSeenAt: timestamp('last_seen_at'),
  // Cycle de vie
  claimedAt: timestamp('claimed_at'),
  claimedBy: uuid('claimed_by').references(() => users.id, { onDelete: 'set null' }),
  enrolledAt: timestamp('enrolled_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Une demande d'assistance a distance, ouverte depuis le menu de la box.
export const boxSupportRequests = pgTable('box_support_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  boxId: uuid('box_id')
    .notNull()
    .references(() => boxes.id, { onDelete: 'cascade' }),
  status: boxSupportStatusEnum('status').notNull().default('open'),
  note: text('note'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  closedBy: uuid('closed_by').references(() => users.id, { onDelete: 'set null' }),
});

export type Box = typeof boxes.$inferSelect;
export type NewBox = typeof boxes.$inferInsert;
export type BoxSupportRequest = typeof boxSupportRequests.$inferSelect;
