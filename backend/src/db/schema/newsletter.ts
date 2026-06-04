import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { clients } from './projects';

// Categorie d'une entree de changelog
export const changelogCategoryEnum = pgEnum('changelog_category', [
  'nouveaute',
  'amelioration',
  'correction',
]);

// Statut d'une release
export const releaseStatusEnum = pgEnum('release_status', [
  'brouillon',
  'publiee',
]);

// Statut d'une campagne email
export const emailCampaignStatusEnum = pgEnum('email_campaign_status', [
  'brouillon',
  'envoi',
  'envoyee',
  'echec',
]);

// Statut d'un destinataire dans une campagne
export const emailRecipientStatusEnum = pgEnum('email_recipient_status', [
  'en_attente',
  'envoye',
  'ouvert',
  'echec',
  'desinscrit',
]);

// Une release / version produit, qui regroupe des entrees de changelog
export const releases = pgTable(
  'releases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: varchar('version', { length: 50 }).notNull().unique(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    status: releaseStatusEnum('status').notNull().default('brouillon'),
    releasedAt: timestamp('released_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('releases_status_idx').on(table.status)]
);

// Une entree de changelog (nouveaute / amelioration / correction) rattachee a une release
export const changelogEntries = pgTable(
  'changelog_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    releaseId: uuid('release_id')
      .notNull()
      .references(() => releases.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 300 }).notNull(),
    description: text('description').notNull(),
    category: changelogCategoryEnum('category').notNull().default('nouveaute'),
    // Mise en avant dans la newsletter (en-tete / encadre)
    isHighlight: boolean('is_highlight').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('changelog_entries_release_id_idx').on(table.releaseId),
    index('changelog_entries_category_idx').on(table.category),
  ]
);

// Une campagne email (newsletter) generee a partir d'entrees cochees
export const emailCampaigns = pgTable(
  'email_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subject: varchar('subject', { length: 300 }).notNull(),
    // Corps HTML fige au moment de la generation IA (editable avant envoi)
    html: text('html').notNull(),
    status: emailCampaignStatusEnum('status').notNull().default('brouillon'),
    // Tracabilite : entrees de changelog incluses dans cette campagne
    selectedEntryIds: jsonb('selected_entry_ids').$type<string[]>().notNull().default([]),
    totalRecipients: integer('total_recipients').notNull().default(0),
    sentCount: integer('sent_count').notNull().default(0),
    openedCount: integer('opened_count').notNull().default(0),
    createdBy: varchar('created_by', { length: 120 }),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('email_campaigns_status_idx').on(table.status)]
);

// Un destinataire d'une campagne, avec son suivi individuel (envoi / ouverture)
export const emailCampaignRecipients = pgTable(
  'email_campaign_recipients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: 'cascade' }),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    email: varchar('email', { length: 255 }).notNull(),
    // Jeton unique servant au pixel d'ouverture et au lien de desinscription
    token: varchar('token', { length: 64 }).notNull().unique(),
    status: emailRecipientStatusEnum('status').notNull().default('en_attente'),
    sentAt: timestamp('sent_at'),
    openedAt: timestamp('opened_at'),
    openCount: integer('open_count').notNull().default(0),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('email_campaign_recipients_campaign_id_idx').on(table.campaignId),
    index('email_campaign_recipients_token_idx').on(table.token),
    index('email_campaign_recipients_status_idx').on(table.status),
  ]
);

// Liste de desinscription (opt-out) : un email ne recevra plus de newsletter
export const emailOptOuts = pgTable(
  'email_optouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    clientId: uuid('client_id').references(() => clients.id, {
      onDelete: 'set null',
    }),
    reason: varchar('reason', { length: 200 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('email_optouts_email_idx').on(table.email)]
);

export type Release = typeof releases.$inferSelect;
export type NewRelease = typeof releases.$inferInsert;
export type ChangelogEntry = typeof changelogEntries.$inferSelect;
export type NewChangelogEntry = typeof changelogEntries.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type NewEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailCampaignRecipient = typeof emailCampaignRecipients.$inferSelect;
export type NewEmailCampaignRecipient = typeof emailCampaignRecipients.$inferInsert;
export type EmailOptOut = typeof emailOptOuts.$inferSelect;
export type NewEmailOptOut = typeof emailOptOuts.$inferInsert;

export const changelogCategoryLabels: Record<
  ChangelogEntry['category'],
  { label: string; color: string; icon: string }
> = {
  nouveaute: { label: 'Nouveaute', color: 'primary', icon: 'bi-stars' },
  amelioration: { label: 'Amelioration', color: 'info', icon: 'bi-arrow-up-circle' },
  correction: { label: 'Correction', color: 'success', icon: 'bi-bug' },
};

export const releaseStatusLabels: Record<
  Release['status'],
  { label: string; color: string }
> = {
  brouillon: { label: 'Brouillon', color: 'secondary' },
  publiee: { label: 'Publiee', color: 'success' },
};

export const emailCampaignStatusLabels: Record<
  EmailCampaign['status'],
  { label: string; color: string }
> = {
  brouillon: { label: 'Brouillon', color: 'secondary' },
  envoi: { label: 'Envoi en cours', color: 'info' },
  envoyee: { label: 'Envoyee', color: 'success' },
  echec: { label: 'Echec', color: 'danger' },
};

export const emailRecipientStatusLabels: Record<
  EmailCampaignRecipient['status'],
  { label: string; color: string }
> = {
  en_attente: { label: 'En attente', color: 'secondary' },
  envoye: { label: 'Envoye', color: 'info' },
  ouvert: { label: 'Ouvert', color: 'success' },
  echec: { label: 'Echec', color: 'danger' },
  desinscrit: { label: 'Desinscrit', color: 'warning' },
};
