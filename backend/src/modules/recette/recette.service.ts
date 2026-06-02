import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  recetteFeatures,
  recetteFeedback,
  recetteFeedbackComments,
  type RecetteFeature,
  type RecetteFeedback,
  type RecetteFeedbackComment,
} from '../../db/schema';
import { recetteCatalogue } from './recette.catalogue';

// Seed idempotent du catalogue (upsert par code).
export async function seedCatalogue(): Promise<{ count: number }> {
  let order = 0;
  for (const entry of recetteCatalogue) {
    await db
      .insert(recetteFeatures)
      .values({
        code: entry.code,
        app: entry.app,
        module: entry.module,
        title: entry.title,
        description: entry.description,
        route: entry.route ?? null,
        sortOrder: order,
      })
      .onConflictDoUpdate({
        target: recetteFeatures.code,
        set: {
          app: entry.app,
          module: entry.module,
          title: entry.title,
          description: entry.description,
          route: entry.route ?? null,
          sortOrder: order,
          updatedAt: new Date(),
        },
      });
    order += 1;
  }
  return { count: recetteCatalogue.length };
}

export interface FeedbackWithComments extends RecetteFeedback {
  comments: RecetteFeedbackComment[];
}

export interface FeatureWithFeedback extends RecetteFeature {
  feedback: FeedbackWithComments[];
}

export interface RecetteFilters {
  app?: RecetteFeature['app'];
  status?: RecetteFeedback['status'];
  severity?: RecetteFeedback['severity'];
  validation?: RecetteFeature['validationStatus'];
}

// Toutes les features avec leurs retours + commentaires, ordonnees.
export async function getCatalogueWithFeedback(
  filters: RecetteFilters = {}
): Promise<FeatureWithFeedback[]> {
  const featureConditions = [
    filters.app ? eq(recetteFeatures.app, filters.app) : undefined,
    filters.validation
      ? eq(recetteFeatures.validationStatus, filters.validation)
      : undefined,
  ].filter(Boolean);

  const features = await db
    .select()
    .from(recetteFeatures)
    .where(featureConditions.length ? and(...featureConditions) : undefined)
    .orderBy(asc(recetteFeatures.sortOrder));

  const allFeedback = await db
    .select()
    .from(recetteFeedback)
    .orderBy(desc(recetteFeedback.createdAt));

  const feedbackIds = allFeedback.map((f) => f.id);
  const comments = feedbackIds.length
    ? await db
        .select()
        .from(recetteFeedbackComments)
        .where(inArray(recetteFeedbackComments.feedbackId, feedbackIds))
        .orderBy(asc(recetteFeedbackComments.createdAt))
    : [];

  const commentsByFeedback = new Map<string, RecetteFeedbackComment[]>();
  for (const comment of comments) {
    const list = commentsByFeedback.get(comment.feedbackId) ?? [];
    list.push(comment);
    commentsByFeedback.set(comment.feedbackId, list);
  }

  const feedbackByFeature = new Map<string, FeedbackWithComments[]>();
  for (const fb of allFeedback) {
    if (filters.status && fb.status !== filters.status) continue;
    if (filters.severity && fb.severity !== filters.severity) continue;
    const list = feedbackByFeature.get(fb.featureId) ?? [];
    list.push({ ...fb, comments: commentsByFeedback.get(fb.id) ?? [] });
    feedbackByFeature.set(fb.featureId, list);
  }

  return features.map((feature) => ({
    ...feature,
    feedback: feedbackByFeature.get(feature.id) ?? [],
  }));
}

export async function getFeatureWithFeedback(
  featureId: string
): Promise<FeatureWithFeedback | undefined> {
  const all = await getCatalogueWithFeedback();
  return all.find((f) => f.id === featureId);
}

export interface RecetteSummary {
  totalFeatures: number;
  featuresWithOpenIssues: number;
  byStatus: Record<RecetteFeedback['status'], number>;
  bySeverity: Record<RecetteFeedback['severity'], number>;
  byValidation: Record<RecetteFeature['validationStatus'], number>;
  totalFeedback: number;
}

export async function getSummary(): Promise<RecetteSummary> {
  const [features, feedback] = await Promise.all([
    db
      .select({
        id: recetteFeatures.id,
        validationStatus: recetteFeatures.validationStatus,
      })
      .from(recetteFeatures),
    db
      .select({
        id: recetteFeedback.id,
        featureId: recetteFeedback.featureId,
        status: recetteFeedback.status,
        severity: recetteFeedback.severity,
      })
      .from(recetteFeedback),
  ]);

  const byStatus: RecetteSummary['byStatus'] = {
    ouvert: 0,
    corrige: 0,
    valide: 0,
    a_revoir: 0,
  };
  const bySeverity: RecetteSummary['bySeverity'] = {
    bloquant: 0,
    majeur: 0,
    mineur: 0,
    cosmetique: 0,
  };
  const byValidation: RecetteSummary['byValidation'] = {
    a_tester: 0,
    valide: 0,
    a_corriger: 0,
  };
  const featuresWithOpen = new Set<string>();

  for (const feature of features) {
    byValidation[feature.validationStatus] += 1;
  }

  for (const fb of feedback) {
    byStatus[fb.status] += 1;
    bySeverity[fb.severity] += 1;
    if (fb.status === 'ouvert' || fb.status === 'a_revoir') {
      featuresWithOpen.add(fb.featureId);
    }
  }

  return {
    totalFeatures: features.length,
    featuresWithOpenIssues: featuresWithOpen.size,
    byStatus,
    bySeverity,
    byValidation,
    totalFeedback: feedback.length,
  };
}

export interface FeatureValidationUpdate {
  validationStatus: RecetteFeature['validationStatus'];
  validatedBy: string | null;
  validatedAt: Date | null;
  updatedAt: Date;
}

// Logique pure : seules les validations "actives" conservent l'auteur/date,
// un retour a "a_tester" efface l'empreinte de recettage.
export function buildFeatureValidationUpdate(
  status: RecetteFeature['validationStatus'],
  validatedBy: string,
  now: Date = new Date()
): FeatureValidationUpdate {
  const isValidated = status !== 'a_tester';
  return {
    validationStatus: status,
    validatedBy: isValidated ? validatedBy : null,
    validatedAt: isValidated ? now : null,
    updatedAt: now,
  };
}

export async function updateFeatureValidation(
  featureId: string,
  status: RecetteFeature['validationStatus'],
  validatedBy: string
): Promise<void> {
  await db
    .update(recetteFeatures)
    .set(buildFeatureValidationUpdate(status, validatedBy))
    .where(eq(recetteFeatures.id, featureId));
}

export interface CreateFeedbackInput {
  featureId: string;
  title: string;
  severity: RecetteFeedback['severity'];
  stepsToReproduce?: string;
  screenshotKey?: string;
  author: string;
}

export async function createFeedback(
  input: CreateFeedbackInput
): Promise<RecetteFeedback> {
  const [created] = await db
    .insert(recetteFeedback)
    .values({
      featureId: input.featureId,
      title: input.title,
      severity: input.severity,
      stepsToReproduce: input.stepsToReproduce ?? null,
      screenshotKey: input.screenshotKey ?? null,
      author: input.author,
    })
    .returning();
  return created!;
}

export async function getFeedbackById(
  id: string
): Promise<RecetteFeedback | undefined> {
  const [fb] = await db
    .select()
    .from(recetteFeedback)
    .where(eq(recetteFeedback.id, id))
    .limit(1);
  return fb;
}

export async function updateFeedbackStatus(
  id: string,
  status: RecetteFeedback['status']
): Promise<void> {
  await db
    .update(recetteFeedback)
    .set({ status, updatedAt: new Date() })
    .where(eq(recetteFeedback.id, id));
}

export async function deleteFeedback(id: string): Promise<void> {
  await db.delete(recetteFeedback).where(eq(recetteFeedback.id, id));
}

export async function addComment(
  feedbackId: string,
  author: string,
  body: string
): Promise<RecetteFeedbackComment> {
  const [comment] = await db
    .insert(recetteFeedbackComments)
    .values({ feedbackId, author, body })
    .returning();
  return comment!;
}

// Vue plate destinee a l'export JSON (lecture par Claude pour corriger les retours).
export interface ExportedFeedback {
  id: string;
  featureCode: string;
  featureTitle: string;
  app: RecetteFeature['app'];
  module: string;
  route: string | null;
  title: string;
  severity: RecetteFeedback['severity'];
  status: RecetteFeedback['status'];
  stepsToReproduce: string | null;
  author: string;
  createdAt: Date;
  updatedAt: Date;
  comments: { author: string; body: string; createdAt: Date }[];
}

export async function exportFeedback(
  onlyOpen = false
): Promise<ExportedFeedback[]> {
  const catalogue = await getCatalogueWithFeedback();
  const result: ExportedFeedback[] = [];
  for (const feature of catalogue) {
    for (const fb of feature.feedback) {
      if (onlyOpen && fb.status !== 'ouvert' && fb.status !== 'a_revoir') {
        continue;
      }
      result.push({
        id: fb.id,
        featureCode: feature.code,
        featureTitle: feature.title,
        app: feature.app,
        module: feature.module,
        route: feature.route,
        title: fb.title,
        severity: fb.severity,
        status: fb.status,
        stepsToReproduce: fb.stepsToReproduce,
        author: fb.author,
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt,
        comments: fb.comments.map((c) => ({
          author: c.author,
          body: c.body,
          createdAt: c.createdAt,
        })),
      });
    }
  }
  return result;
}
