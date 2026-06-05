import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

// Jetons API "système" : des clés porteuses (Authorization: Bearer ...) émises
// depuis le back-office pour donner un accès programmatique à l'API, scopé par
// profil (les rôles cochés à la création). On ne stocke jamais le secret en
// clair — uniquement son empreinte SHA-256 et un préfixe lisible pour la liste.
export const systemApiTokens = pgTable('system_api_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 120 }).notNull(),
  // Préfixe affichable du token (ex: "neo_sk_ab12cd34") pour reconnaître la clé.
  tokenPrefix: varchar('token_prefix', { length: 24 }).notNull(),
  // Empreinte SHA-256 (hex) du token complet. Unique : sert de lookup à l'auth.
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  // Rôles dont hérite le jeton (ids de la table roles). Les permissions sont
  // résolues à la volée à l'authentification (union des permissions des rôles).
  roleIds: jsonb('role_ids').$type<string[]>().notNull().default([]),
  // Utilisateur back-office qui a émis le jeton (pour l'audit / l'ownership).
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdByEmail: varchar('created_by_email', { length: 255 }),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type SystemApiToken = typeof systemApiTokens.$inferSelect;
export type NewSystemApiToken = typeof systemApiTokens.$inferInsert;
