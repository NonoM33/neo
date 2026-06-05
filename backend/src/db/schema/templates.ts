import { pgTable, uuid, varchar, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

/**
 * Editable templates (emails + business documents like quotes/invoices).
 *
 * Each row overrides a code-level default identified by its `key`. When a key
 * has no row, the application falls back to the bundled default template, so
 * the table starts empty and only stores user customisations.
 *
 * - `html`     : Handlebars source rendered at send/generation time. For
 *                documents it is a full standalone HTML page (printed to PDF).
 * - `gjsData`  : GrapesJS project JSON, kept so the visual editor can reload
 *                the exact design the user last edited.
 */
export const templateKindEnum = pgEnum('template_kind', ['email', 'document']);

export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: varchar('key', { length: 64 }).notNull().unique(),
  kind: templateKindEnum('kind').notNull(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  // Email subject line (Handlebars). Null for documents.
  subject: text('subject'),
  html: text('html').notNull(),
  // GrapesJS project data for faithful re-editing.
  gjsData: jsonb('gjs_data'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;
