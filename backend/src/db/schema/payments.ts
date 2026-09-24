import { pgTable, uuid, varchar, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

// Type de cible réglée par le paiement. Polymorphe : pas de FK unique car la
// cible peut être une facture, une commande ou un acompte sur devis.
export const paymentTargetEnum = pgEnum('payment_target', [
  'invoice', // Facture (totalTTC)
  'order', // Commande (totalTTC)
  'quote_deposit', // Acompte sur devis (% du totalTTC)
]);

// Cycle de vie d'un paiement Stripe Checkout.
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending', // Créé, lien envoyé, en attente d'action client
  'processing', // Session Checkout ouverte, paiement en cours
  'succeeded', // Payé (webhook checkout.session.completed)
  'failed', // Échec de paiement
  'canceled', // Annulé par le client / l'équipe
  'expired', // Session Checkout expirée
]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Cible polymorphe
  targetType: paymentTargetEnum('target_type').notNull(),
  targetId: uuid('target_id').notNull(), // id facture / commande / devis

  // Projet (scoping & reporting). Conservé même si la cible est supprimée.
  projectId: uuid('project_id').references(() => projects.id, {
    onDelete: 'set null',
  }),

  // Montant à encaisser, en centimes (unité Stripe). Évite les flottants.
  amountCents: integer('amount_cents').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('eur'),

  status: paymentStatusEnum('status').notNull().default('pending'),
  description: varchar('description', { length: 255 }),

  // Références Stripe
  stripeCheckoutSessionId: varchar('stripe_checkout_session_id', { length: 255 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  customerEmail: varchar('customer_email', { length: 255 }),
  receiptUrl: text('receipt_url'),

  paidAt: timestamp('paid_at'),

  // Audit. createdBy nullable : un paiement peut naître côté client (lien public).
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type PaymentTarget = (typeof paymentTargetEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
