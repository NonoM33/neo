export type RecetteApp = 'admin' | 'crm' | 'flutter' | 'site';
export type RecetteKind = 'bug' | 'amelioration';
export type RecetteSeverity = 'bloquant' | 'majeur' | 'mineur' | 'cosmetique';
export type RecetteStatus = 'ouvert' | 'corrige' | 'valide' | 'a_revoir';
export type RecetteValidation = 'a_tester' | 'valide' | 'a_corriger';

export interface RecetteFeedbackComment {
  id: string;
  feedbackId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface RecetteFeedback {
  id: string;
  featureId: string | null;
  app: RecetteApp | null;
  kind: RecetteKind;
  source: string;
  title: string;
  severity: RecetteSeverity;
  status: RecetteStatus;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  screenshotKey: string | null;
  author: string;
  reporterEmail: string | null;
  gitlabIssueIid: number | null;
  gitlabIssueUrl: string | null;
  createdAt: string;
  updatedAt: string;
  comments: RecetteFeedbackComment[];
}

export interface RecetteFeature {
  id: string;
  code: string;
  app: RecetteApp;
  module: string;
  title: string;
  description: string | null;
  route: string | null;
  sortOrder: number;
  validationStatus: RecetteValidation;
  validatedBy: string | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  feedback: RecetteFeedback[];
}

export interface RecetteSummary {
  totalFeatures: number;
  featuresWithOpenIssues: number;
  byStatus: Record<RecetteStatus, number>;
  bySeverity: Record<RecetteSeverity, number>;
  byValidation: Record<RecetteValidation, number>;
  totalFeedback: number;
}

export interface RecetteFilters {
  app?: RecetteApp;
  status?: RecetteStatus;
  severity?: RecetteSeverity;
  validation?: RecetteValidation;
}

export interface CreateRecetteFeedbackInput {
  featureId: string;
  title: string;
  severity: RecetteSeverity;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
}
