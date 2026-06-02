import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';

// App d'appartenance d'une feature
export const recetteAppEnum = pgEnum('recette_app', [
  'admin',
  'crm',
  'flutter',
  'site',
]);

// Severite d'un retour de recette
export const recetteSeverityEnum = pgEnum('recette_severity', [
  'bloquant',
  'majeur',
  'mineur',
  'cosmetique',
]);

// Statut d'un retour dans le cycle de recette
export const recetteStatusEnum = pgEnum('recette_status', [
  'ouvert',
  'corrige',
  'valide',
  'a_revoir',
]);

// Catalogue des features a recetter (seede depuis recette.catalogue.ts)
export const recetteFeatures = pgTable(
  'recette_features',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: varchar('code', { length: 120 }).notNull().unique(),
    app: recetteAppEnum('app').notNull(),
    module: varchar('module', { length: 120 }).notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    route: varchar('route', { length: 200 }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('recette_features_app_idx').on(table.app),
    index('recette_features_module_idx').on(table.module),
  ]
);

// Retours / bugs remontes pendant la recette
export const recetteFeedback = pgTable(
  'recette_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    featureId: uuid('feature_id')
      .notNull()
      .references(() => recetteFeatures.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 300 }).notNull(),
    severity: recetteSeverityEnum('severity').notNull().default('majeur'),
    status: recetteStatusEnum('status').notNull().default('ouvert'),
    stepsToReproduce: text('steps_to_reproduce'),
    screenshotKey: varchar('screenshot_key', { length: 300 }),
    author: varchar('author', { length: 120 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('recette_feedback_feature_id_idx').on(table.featureId),
    index('recette_feedback_status_idx').on(table.status),
    index('recette_feedback_severity_idx').on(table.severity),
  ]
);

// Fil de commentaires sur un retour (notamment "corrige + commentaire" par Claude)
export const recetteFeedbackComments = pgTable(
  'recette_feedback_comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    feedbackId: uuid('feedback_id')
      .notNull()
      .references(() => recetteFeedback.id, { onDelete: 'cascade' }),
    author: varchar('author', { length: 120 }).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('recette_feedback_comments_feedback_id_idx').on(table.feedbackId),
  ]
);

export type RecetteFeature = typeof recetteFeatures.$inferSelect;
export type NewRecetteFeature = typeof recetteFeatures.$inferInsert;
export type RecetteFeedback = typeof recetteFeedback.$inferSelect;
export type NewRecetteFeedback = typeof recetteFeedback.$inferInsert;
export type RecetteFeedbackComment = typeof recetteFeedbackComments.$inferSelect;
export type NewRecetteFeedbackComment = typeof recetteFeedbackComments.$inferInsert;

export const recetteAppLabels: Record<RecetteFeature['app'], string> = {
  admin: 'Backoffice Admin',
  crm: 'CRM Commercial',
  flutter: 'App Integrateur',
  site: 'Site Vitrine',
};

export const recetteSeverityLabels: Record<
  RecetteFeedback['severity'],
  { label: string; color: string }
> = {
  bloquant: { label: 'Bloquant', color: 'danger' },
  majeur: { label: 'Majeur', color: 'warning' },
  mineur: { label: 'Mineur', color: 'info' },
  cosmetique: { label: 'Cosmetique', color: 'secondary' },
};

export const recetteStatusLabels: Record<
  RecetteFeedback['status'],
  { label: string; color: string }
> = {
  ouvert: { label: 'Ouvert', color: 'danger' },
  corrige: { label: 'Corrige', color: 'info' },
  valide: { label: 'Valide', color: 'success' },
  a_revoir: { label: 'A revoir', color: 'warning' },
};
