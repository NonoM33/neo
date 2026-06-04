import { pgTable, uuid, varchar, jsonb, decimal, timestamp } from 'drizzle-orm/pg-core';
import { leads } from './crm';

/**
 * Configuration sauvegardée depuis le configurateur public ("type IKEA").
 * Identifiée par un code court partageable (QR) pour reprise client ou
 * récupération par un commercial.
 */
export const configuratorDrafts = pgTable('configurator_drafts', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  // { items: [{ productId, quantity, room? }], installMode, housingType?, surface? }
  payload: jsonb('payload').notNull(),
  totalTtc: decimal('total_ttc', { precision: 12, scale: 2 }),
  // Renseigné quand la configuration a été transformée en demande (lead CRM).
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ConfiguratorDraft = typeof configuratorDrafts.$inferSelect;
export type NewConfiguratorDraft = typeof configuratorDrafts.$inferInsert;
