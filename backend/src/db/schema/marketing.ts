import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { clients } from './projects';
import { quotes } from './quotes';
import { emailRecipientStatusEnum } from './newsletter';

/**
 * Marketing module — codes promo, bannières site, pop-ups (modales pub) et
 * campagnes email promotionnelles.
 *
 * Indépendant du moteur newsletter (changelog) : on réutilise seulement la
 * liste d'opt-out (`emailOptOuts`) et l'enum de statut destinataire pour rester
 * cohérent côté désinscription.
 */

// Type de remise d'un code promo.
export const discountTypeEnum = pgEnum('promo_discount_type', [
  'pourcentage',
  'montant_fixe',
]);

// Fréquence d'affichage d'une pop-up pour un même visiteur.
export const popupFrequencyEnum = pgEnum('popup_frequency', [
  'toujours',
  'une_fois_session',
  'une_fois_jour',
]);

// Audience ciblée par une campagne email marketing.
export const campaignAudienceEnum = pgEnum('campaign_audience', [
  'clients',
  'leads',
  'custom',
]);

// Statut d'une campagne marketing.
export const marketingCampaignStatusEnum = pgEnum('marketing_campaign_status', [
  'brouillon',
  'programmee',
  'envoi',
  'envoyee',
  'echec',
]);

// Un code promo réutilisable, applicable sur un devis ou affiché dans une pop-up.
export const promoCodes = pgTable(
  'promo_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Stocké en MAJUSCULES, comparé insensible à la casse côté service.
    code: varchar('code', { length: 40 }).notNull().unique(),
    description: text('description'),
    discountType: discountTypeEnum('discount_type').notNull(),
    // % (0-100) si pourcentage, montant € HT si montant_fixe.
    discountValue: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
    // Montant minimum HT de commande pour que le code soit valable. Null = aucun.
    minOrderHT: decimal('min_order_ht', { precision: 12, scale: 2 }),
    // Nombre maximum d'utilisations. Null = illimité.
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    // Limite à une utilisation par client (sur la base de l'email/clientId).
    perClientOnce: boolean('per_client_once').notNull().default(false),
    active: boolean('active').notNull().default(true),
    startsAt: timestamp('starts_at'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('promo_codes_code_idx').on(table.code),
    index('promo_codes_active_idx').on(table.active),
  ]
);

// Trace chaque utilisation d'un code promo (pour le quota et l'unicité client).
export const promoRedemptions = pgTable(
  'promo_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promoCodeId: uuid('promo_code_id')
      .notNull()
      .references(() => promoCodes.id, { onDelete: 'cascade' }),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'set null' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }),
    discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('promo_redemptions_code_idx').on(table.promoCodeId),
    index('promo_redemptions_quote_idx').on(table.quoteId),
  ]
);

// Bandeau affiché en haut du site vitrine.
export const banners = pgTable(
  'banners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    message: varchar('message', { length: 300 }).notNull(),
    linkUrl: varchar('link_url', { length: 500 }),
    linkLabel: varchar('link_label', { length: 80 }),
    bgColor: varchar('bg_color', { length: 20 }).notNull().default('#0d6efd'),
    textColor: varchar('text_color', { length: 20 }).notNull().default('#ffffff'),
    dismissible: boolean('dismissible').notNull().default(true),
    active: boolean('active').notNull().default(true),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    // Priorité d'affichage : le plus élevé l'emporte si plusieurs sont actives.
    priority: integer('priority').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('banners_active_idx').on(table.active)]
);

// Pop-up (modale publicitaire) affichée sur le site vitrine.
export const popups = pgTable(
  'popups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    // Corps HTML de la modale (texte riche).
    body: text('body').notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    ctaLabel: varchar('cta_label', { length: 80 }),
    ctaUrl: varchar('cta_url', { length: 500 }),
    // Code promo optionnel mis en avant dans la modale.
    promoCodeId: uuid('promo_code_id').references(() => promoCodes.id, {
      onDelete: 'set null',
    }),
    active: boolean('active').notNull().default(true),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    // Délai (secondes) avant affichage après le chargement de la page.
    delaySeconds: integer('delay_seconds').notNull().default(3),
    frequency: popupFrequencyEnum('frequency').notNull().default('une_fois_session'),
    priority: integer('priority').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('popups_active_idx').on(table.active)]
);

// Campagne email promotionnelle envoyée à une audience (clients / leads / liste).
export const marketingCampaigns = pgTable(
  'marketing_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    subject: varchar('subject', { length: 300 }).notNull(),
    html: text('html').notNull(),
    audience: campaignAudienceEnum('audience').notNull().default('clients'),
    // Emails saisis manuellement quand audience = 'custom'.
    customEmails: jsonb('custom_emails').$type<string[]>().notNull().default([]),
    promoCodeId: uuid('promo_code_id').references(() => promoCodes.id, {
      onDelete: 'set null',
    }),
    status: marketingCampaignStatusEnum('status').notNull().default('brouillon'),
    totalRecipients: integer('total_recipients').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    scheduledAt: timestamp('scheduled_at'),
    sentAt: timestamp('sent_at'),
    createdBy: varchar('created_by', { length: 120 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('marketing_campaigns_status_idx').on(table.status)]
);

// Un destinataire d'une campagne marketing, avec son suivi d'envoi individuel.
export const marketingCampaignRecipients = pgTable(
  'marketing_campaign_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => marketingCampaigns.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),
    status: emailRecipientStatusEnum('status').notNull().default('en_attente'),
    sentAt: timestamp('sent_at'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('marketing_campaign_recipients_campaign_idx').on(table.campaignId),
    index('marketing_campaign_recipients_status_idx').on(table.status),
  ]
);

export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
export type PromoRedemption = typeof promoRedemptions.$inferSelect;
export type NewPromoRedemption = typeof promoRedemptions.$inferInsert;
export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
export type Popup = typeof popups.$inferSelect;
export type NewPopup = typeof popups.$inferInsert;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type NewMarketingCampaign = typeof marketingCampaigns.$inferInsert;
export type MarketingCampaignRecipient = typeof marketingCampaignRecipients.$inferSelect;
export type NewMarketingCampaignRecipient = typeof marketingCampaignRecipients.$inferInsert;
