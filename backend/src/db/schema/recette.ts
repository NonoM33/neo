import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// App d'appartenance d'une feature
export const recetteAppEnum = pgEnum('recette_app', [
  'admin',
  'crm',
  'flutter',
  'site',
]);

// Nature d'un retour : bug a corriger ou suggestion d'amelioration
export const recetteKindEnum = pgEnum('recette_kind', ['bug', 'amelioration']);

// Contexte technique capture automatiquement par le widget de feedback.
// Permet a Claude de traiter le retour sans aller-retour (chemin, logs, env).
export interface RecetteFeedbackContext {
  url?: string;
  route?: string;
  referrer?: string;
  userAgent?: string;
  platform?: string;
  language?: string;
  viewport?: { width: number; height: number };
  screen?: { width: number; height: number };
  devicePixelRatio?: number;
  appVersion?: string;
  capturedAt?: string;
  // Derniers logs/erreurs console captures avant l'envoi du retour.
  logs?: { level: string; message: string; at: string }[];
}

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

// Statut de validation (recettage) d'une feature
export const recetteValidationEnum = pgEnum('recette_validation', [
  'a_tester',
  'valide',
  'a_corriger',
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
    validationStatus: recetteValidationEnum('validation_status')
      .notNull()
      .default('a_tester'),
    validatedBy: varchar('validated_by', { length: 120 }),
    validatedAt: timestamp('validated_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('recette_features_app_idx').on(table.app),
    index('recette_features_module_idx').on(table.module),
    index('recette_features_validation_idx').on(table.validationStatus),
  ]
);

// Retours / bugs remontes pendant la recette
export const recetteFeedback = pgTable(
  'recette_feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable : les retours remontes via le widget terrain ne sont pas
    // forcement rattaches a une feature du catalogue.
    featureId: uuid('feature_id').references(() => recetteFeatures.id, {
      onDelete: 'cascade',
    }),
    // App d'origine pour les retours widget (sans feature rattachee).
    app: recetteAppEnum('app'),
    kind: recetteKindEnum('kind').notNull().default('bug'),
    // 'recette' (centre de recette interne) ou 'widget' (bouton terrain).
    source: varchar('source', { length: 20 }).notNull().default('recette'),
    title: varchar('title', { length: 300 }).notNull(),
    severity: recetteSeverityEnum('severity').notNull().default('majeur'),
    status: recetteStatusEnum('status').notNull().default('ouvert'),
    stepsToReproduce: text('steps_to_reproduce'),
    expectedResult: text('expected_result'),
    actualResult: text('actual_result'),
    screenshotKey: varchar('screenshot_key', { length: 300 }),
    author: varchar('author', { length: 120 }).notNull(),
    // Email du rapporteur (widget) pour le suivi + la notification de cloture.
    reporterEmail: varchar('reporter_email', { length: 200 }),
    context: jsonb('context').$type<RecetteFeedbackContext>(),
    gitlabIssueIid: integer('gitlab_issue_iid'),
    gitlabIssueUrl: varchar('gitlab_issue_url', { length: 500 }),
    // Date d'envoi de l'email de cloture (evite les doublons de notification).
    notifiedAt: timestamp('notified_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('recette_feedback_feature_id_idx').on(table.featureId),
    index('recette_feedback_status_idx').on(table.status),
    index('recette_feedback_severity_idx').on(table.severity),
    index('recette_feedback_reporter_email_idx').on(table.reporterEmail),
    index('recette_feedback_source_idx').on(table.source),
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

export const recetteKindLabels: Record<
  'bug' | 'amelioration',
  { label: string; color: string; icon: string }
> = {
  bug: { label: 'Bug', color: 'danger', icon: 'bi-bug' },
  amelioration: { label: 'Amelioration', color: 'primary', icon: 'bi-lightbulb' },
};

export const recetteValidationLabels: Record<
  RecetteFeature['validationStatus'],
  { label: string; color: string; icon: string }
> = {
  a_tester: { label: 'A tester', color: 'secondary', icon: 'bi-hourglass-split' },
  valide: { label: 'Valide', color: 'success', icon: 'bi-check2-circle' },
  a_corriger: { label: 'A corriger', color: 'danger', icon: 'bi-x-circle' },
};
