import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer } from 'drizzle-orm/pg-core';
import { quotes } from './quotes';

export const signatureStatusEnum = pgEnum('signature_status', [
  'draft',      // document created in Documenso, not yet sent
  'pending',    // sent, awaiting signer
  'signed',     // signed by client
  'declined',   // client declined
  'expired',    // document expired
  'cancelled',  // cancelled by integrator
]);

export const signatureRequests = pgTable('signature_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: uuid('quote_id')
    .notNull()
    .references(() => quotes.id, { onDelete: 'cascade' }),
  documensoDocumentId: integer('documenso_document_id'),
  status: signatureStatusEnum('status').notNull().default('draft'),
  mode: varchar('mode', { length: 20 }).notNull().default('remote'), // 'remote' | 'direct'
  signerName: varchar('signer_name', { length: 200 }).notNull(),
  signerEmail: varchar('signer_email', { length: 255 }).notNull(),
  signingUrl: text('signing_url'),
  signatureData: text('signature_data'), // base64 PNG pour signatures directes
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type SignatureRequest = typeof signatureRequests.$inferSelect;
export type NewSignatureRequest = typeof signatureRequests.$inferInsert;
