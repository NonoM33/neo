import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '../../config/database';
import {
  recetteFeatures,
  recetteFeedback,
  recetteFeedbackComments,
  type RecetteFeature,
  type RecetteFeedback,
  type RecetteFeedbackComment,
  type RecetteFeedbackContext,
} from '../../db/schema';
import { recetteCatalogue } from './recette.catalogue';
import { sendFeedbackClosureEmail } from './recette.notify';
import { notifyFeedbackCreated } from './recette.mattermost';

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
    if (!fb.featureId) continue; // retours widget : pas de feature rattachee
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
    if (fb.featureId && (fb.status === 'ouvert' || fb.status === 'a_revoir')) {
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
  expectedResult?: string;
  actualResult?: string;
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
      expectedResult: input.expectedResult ?? null,
      actualResult: input.actualResult ?? null,
      screenshotKey: input.screenshotKey ?? null,
      author: input.author,
    })
    .returning();
  // Notifie le canal Mattermost dédié (best-effort, ne bloque pas la création).
  void notifyFeedbackCreated(created!);
  return created!;
}

export interface SubmitWidgetFeedbackInput {
  app: RecetteFeedback['app'];
  kind: RecetteFeedback['kind'];
  title: string;
  severity: RecetteFeedback['severity'];
  description?: string;
  expectedResult?: string;
  stepsToReproduce?: string;
  reporterEmail?: string;
  reporterName?: string;
  context?: RecetteFeedbackContext;
}

// Retour remonte depuis le widget terrain (bouton flottant). Non rattache a une
// feature du catalogue : on stocke l'app + le contexte technique pour que Claude
// puisse traiter sans aller-retour (chemin, logs, environnement).
export async function submitWidgetFeedback(
  input: SubmitWidgetFeedbackInput
): Promise<RecetteFeedback> {
  const author =
    input.reporterName?.trim() ||
    input.reporterEmail?.trim() ||
    'Anonyme';
  const [created] = await db
    .insert(recetteFeedback)
    .values({
      featureId: null,
      app: input.app,
      kind: input.kind,
      source: 'widget',
      title: input.title,
      severity: input.severity,
      actualResult: input.description ?? null,
      expectedResult: input.expectedResult ?? null,
      stepsToReproduce: input.stepsToReproduce ?? null,
      author,
      reporterEmail: input.reporterEmail?.trim() || null,
      context: input.context ?? null,
    })
    .returning();
  // Notifie le canal Mattermost dédié (best-effort, ne bloque pas la création).
  void notifyFeedbackCreated(created!);
  return created!;
}

// Retours d'un rapporteur (onglet "Mes retours" du widget), avec leur fil
// de commentaires (notamment les reponses de l'equipe / Claude).
export async function getFeedbackByReporter(
  email: string
): Promise<FeedbackWithComments[]> {
  const items = await db
    .select()
    .from(recetteFeedback)
    .where(eq(recetteFeedback.reporterEmail, email.trim().toLowerCase()))
    .orderBy(desc(recetteFeedback.createdAt));

  const ids = items.map((i) => i.id);
  const comments = ids.length
    ? await db
        .select()
        .from(recetteFeedbackComments)
        .where(inArray(recetteFeedbackComments.feedbackId, ids))
        .orderBy(asc(recetteFeedbackComments.createdAt))
    : [];

  const byFeedback = new Map<string, RecetteFeedbackComment[]>();
  for (const c of comments) {
    const list = byFeedback.get(c.feedbackId) ?? [];
    list.push(c);
    byFeedback.set(c.feedbackId, list);
  }

  return items.map((fb) => ({
    ...fb,
    comments: byFeedback.get(fb.id) ?? [],
  }));
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

export async function setFeedbackGitlabIssue(
  id: string,
  iid: number,
  url: string
): Promise<void> {
  await db
    .update(recetteFeedback)
    .set({ gitlabIssueIid: iid, gitlabIssueUrl: url, updatedAt: new Date() })
    .where(eq(recetteFeedback.id, id));
}

export async function updateFeedbackStatus(
  id: string,
  status: RecetteFeedback['status']
): Promise<void> {
  await db
    .update(recetteFeedback)
    .set({ status, updatedAt: new Date() })
    .where(eq(recetteFeedback.id, id));

  // A la cloture (statut "valide"), notifier une seule fois le rapporteur.
  if (status === 'valide') {
    await notifyReporterOnClosure(id);
  }
}

// Envoie l'email de cloture au rapporteur (retours widget uniquement) si un
// email est connu et qu'aucune notification n'a deja ete envoyee.
export async function notifyReporterOnClosure(id: string): Promise<void> {
  const fb = await getFeedbackById(id);
  if (!fb || !fb.reporterEmail || fb.notifiedAt) return;

  const lastComments = await db
    .select()
    .from(recetteFeedbackComments)
    .where(eq(recetteFeedbackComments.feedbackId, id))
    .orderBy(desc(recetteFeedbackComments.createdAt))
    .limit(1);

  try {
    await sendFeedbackClosureEmail({
      to: fb.reporterEmail,
      title: fb.title,
      kind: fb.kind,
      resolution: lastComments[0]?.body ?? null,
    });
    await db
      .update(recetteFeedback)
      .set({ notifiedAt: new Date() })
      .where(eq(recetteFeedback.id, id));
  } catch (error) {
    // Best-effort : un email rate ne doit pas bloquer la cloture du retour.
    console.error('[recette] Email de cloture non envoye:', error);
  }
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
  source: RecetteFeedback['source'];
  kind: RecetteFeedback['kind'];
  featureCode: string | null;
  featureTitle: string | null;
  app: RecetteFeature['app'] | null;
  module: string | null;
  route: string | null;
  title: string;
  severity: RecetteFeedback['severity'];
  status: RecetteFeedback['status'];
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  author: string;
  reporterEmail: string | null;
  context: RecetteFeedbackContext | null;
  createdAt: Date;
  updatedAt: Date;
  comments: { author: string; body: string; createdAt: Date }[];
}

// Exporte TOUS les retours (recette catalogue + widget terrain) a plat.
// Inclut le contexte technique des retours widget (URL, route, logs) pour que
// Claude puisse traiter le retour de bout en bout sans information manquante.
export async function exportFeedback(
  onlyOpen = false
): Promise<ExportedFeedback[]> {
  const allFeedback = await db
    .select()
    .from(recetteFeedback)
    .orderBy(desc(recetteFeedback.createdAt));

  const features = await db.select().from(recetteFeatures);
  const featureById = new Map(features.map((f) => [f.id, f]));

  const ids = allFeedback.map((f) => f.id);
  const comments = ids.length
    ? await db
        .select()
        .from(recetteFeedbackComments)
        .where(inArray(recetteFeedbackComments.feedbackId, ids))
        .orderBy(asc(recetteFeedbackComments.createdAt))
    : [];
  const commentsByFeedback = new Map<string, RecetteFeedbackComment[]>();
  for (const c of comments) {
    const list = commentsByFeedback.get(c.feedbackId) ?? [];
    list.push(c);
    commentsByFeedback.set(c.feedbackId, list);
  }

  const result: ExportedFeedback[] = [];
  for (const fb of allFeedback) {
    if (onlyOpen && fb.status !== 'ouvert' && fb.status !== 'a_revoir') {
      continue;
    }
    const feature = fb.featureId ? featureById.get(fb.featureId) : undefined;
    result.push({
      id: fb.id,
      source: fb.source,
      kind: fb.kind,
      featureCode: feature?.code ?? null,
      featureTitle: feature?.title ?? null,
      app: feature?.app ?? fb.app ?? null,
      module: feature?.module ?? null,
      route: feature?.route ?? fb.context?.route ?? fb.context?.url ?? null,
      title: fb.title,
      severity: fb.severity,
      status: fb.status,
      stepsToReproduce: fb.stepsToReproduce,
      expectedResult: fb.expectedResult,
      actualResult: fb.actualResult,
      author: fb.author,
      reporterEmail: fb.reporterEmail,
      context: fb.context ?? null,
      createdAt: fb.createdAt,
      updatedAt: fb.updatedAt,
      comments: (commentsByFeedback.get(fb.id) ?? []).map((c) => ({
        author: c.author,
        body: c.body,
        createdAt: c.createdAt,
      })),
    });
  }
  return result;
}

// Retours widget (terrain) avec commentaires, pour affichage dans le centre de
// recette cote staff.
export async function getWidgetFeedback(): Promise<FeedbackWithComments[]> {
  const items = await db
    .select()
    .from(recetteFeedback)
    .where(isNull(recetteFeedback.featureId))
    .orderBy(desc(recetteFeedback.createdAt));

  const ids = items.map((i) => i.id);
  const comments = ids.length
    ? await db
        .select()
        .from(recetteFeedbackComments)
        .where(inArray(recetteFeedbackComments.feedbackId, ids))
        .orderBy(asc(recetteFeedbackComments.createdAt))
    : [];
  const byFeedback = new Map<string, RecetteFeedbackComment[]>();
  for (const c of comments) {
    const list = byFeedback.get(c.feedbackId) ?? [];
    list.push(c);
    byFeedback.set(c.feedbackId, list);
  }
  return items.map((fb) => ({ ...fb, comments: byFeedback.get(fb.id) ?? [] }));
}
