export type LeadStatus = 'prospect' | 'qualifie' | 'proposition' | 'negociation' | 'gagne' | 'perdu';
export type LeadSource = 'site_web' | 'recommandation' | 'salon' | 'publicite' | 'appel_entrant' | 'partenaire' | 'autre';

export interface Lead {
  id: string;
  clientId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title: string;
  description?: string;
  status: LeadStatus;
  source: LeadSource;
  estimatedValue?: string;
  probability?: number;
  ownerId: string;
  address?: string;
  city?: string;
  postalCode?: string;
  surface?: string;
  convertedProjectId?: string;
  convertedAt?: string;
  lostReason?: string;
  expectedCloseDate?: string;
  createdAt: string;
  updatedAt: string;
  // Qualification (prospection module)
  qualification?: import('./prospection.types').LeadQualification;
}

export interface LeadWithDetails extends Lead {
  activities: Activity[];
  stageHistory: LeadStageHistory[];
}

export interface LeadStageHistory {
  id: string;
  leadId: string;
  fromStatus?: LeadStatus;
  toStatus: LeadStatus;
  changedBy: string;
  notes?: string;
  changedAt: string;
}

export interface Activity {
  id: string;
  leadId?: string;
  clientId?: string;
  projectId?: string;
  type: ActivityType;
  subject: string;
  description?: string;
  status: ActivityStatus;
  scheduledAt?: string;
  completedAt?: string;
  duration?: number;
  reminderAt?: string;
  reminderSent?: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType = 'appel' | 'email' | 'reunion' | 'visite' | 'note' | 'tache';
export type ActivityStatus = 'planifie' | 'termine' | 'annule';

export interface LeadStats {
  status: LeadStatus;
  count: number;
  totalValue: string;
  weightedValue: string;
}

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  title: string;
  description?: string;
  status?: LeadStatus;
  source?: LeadSource;
  estimatedValue?: number;
  probability?: number;
  ownerId?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  surface?: number;
  expectedCloseDate?: string;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {}

export interface ChangeStatusInput {
  status: LeadStatus;
  notes?: string;
  lostReason?: string;
}

export interface ConvertLeadInput {
  projectName?: string;
  createClient?: boolean;
}

export interface LeadFilter {
  status?: LeadStatus;
  source?: LeadSource;
  ownerId?: string;
  search?: string;
  minValue?: number;
  maxValue?: number;
  fromDate?: string;
  toDate?: string;
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  prospect: 'Prospect',
  qualifie: 'Qualifié',
  proposition: 'Proposition',
  negociation: 'Négociation',
  gagne: 'Gagné',
  perdu: 'Perdu',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  site_web: 'Site web',
  recommandation: 'Recommandation',
  salon: 'Salon',
  publicite: 'Publicité',
  appel_entrant: 'Appel entrant',
  partenaire: 'Partenaire',
  autre: 'Autre',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  appel: 'Appel',
  email: 'Email',
  reunion: 'Réunion',
  visite: 'Visite',
  note: 'Note',
  tache: 'Tâche',
};

export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  appel: 'bi-telephone',
  email: 'bi-envelope',
  reunion: 'bi-people',
  visite: 'bi-geo-alt',
  note: 'bi-journal-text',
  tache: 'bi-check-square',
};

export const PIPELINE_STAGES: LeadStatus[] = ['prospect', 'qualifie', 'proposition', 'negociation'];
