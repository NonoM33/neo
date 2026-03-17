// === Housing & Property ===

export type HousingType = 'maison' | 'appartement';
export type HousingAge = 'neuf' | 'moins_5' | '5_15' | 'plus_15';
export type ExistingInstallation = 'aucune' | 'partielle' | 'complete_upgrade';

export const HOUSING_TYPE_LABELS: Record<HousingType, string> = {
  maison: 'Maison',
  appartement: 'Appartement',
};

export const HOUSING_TYPE_ICONS: Record<HousingType, string> = {
  maison: 'bi-house',
  appartement: 'bi-building',
};

export const HOUSING_AGE_LABELS: Record<HousingAge, string> = {
  neuf: 'Neuf',
  moins_5: 'Moins de 5 ans',
  '5_15': '5 à 15 ans',
  plus_15: 'Plus de 15 ans',
};

export const EXISTING_INSTALLATION_LABELS: Record<ExistingInstallation, string> = {
  aucune: 'Aucune installation',
  partielle: 'Installation partielle',
  complete_upgrade: 'Installation complète à moderniser',
};

// === Services Domotique ===

export type DesiredService = 'securite' | 'energie' | 'confort' | 'multimedia' | 'jardin';

export const DESIRED_SERVICE_LABELS: Record<DesiredService, string> = {
  securite: 'Sécurité',
  energie: 'Énergie',
  confort: 'Confort',
  multimedia: 'Multimédia',
  jardin: 'Jardin',
};

export const DESIRED_SERVICE_ICONS: Record<DesiredService, string> = {
  securite: 'bi-shield-lock',
  energie: 'bi-lightning-charge',
  confort: 'bi-thermometer-half',
  multimedia: 'bi-tv',
  jardin: 'bi-tree',
};

export const DESIRED_SERVICE_COLORS: Record<DesiredService, string> = {
  securite: '#ef4444',
  energie: '#10b981',
  confort: '#f59e0b',
  multimedia: '#3b82f6',
  jardin: '#22c55e',
};

// === Budget & Timeline ===

export type BudgetRange = 'moins_5k' | '5k_10k' | '10k_20k' | '20k_50k' | 'plus_50k';
export type ProjectTimeline = 'urgent' | '1_3_mois' | '3_6_mois' | 'plus_6_mois';

export const BUDGET_RANGE_LABELS: Record<BudgetRange, string> = {
  moins_5k: 'Moins de 5 000 €',
  '5k_10k': '5 000 - 10 000 €',
  '10k_20k': '10 000 - 20 000 €',
  '20k_50k': '20 000 - 50 000 €',
  plus_50k: 'Plus de 50 000 €',
};

export const BUDGET_RANGE_VALUES: Record<BudgetRange, number> = {
  moins_5k: 2500,
  '5k_10k': 7500,
  '10k_20k': 15000,
  '20k_50k': 35000,
  plus_50k: 75000,
};

export const TIMELINE_LABELS: Record<ProjectTimeline, string> = {
  urgent: 'Urgent (< 1 mois)',
  '1_3_mois': '1 à 3 mois',
  '3_6_mois': '3 à 6 mois',
  plus_6_mois: 'Plus de 6 mois',
};

export const TIMELINE_ICONS: Record<ProjectTimeline, string> = {
  urgent: 'bi-alarm',
  '1_3_mois': 'bi-calendar-check',
  '3_6_mois': 'bi-calendar3',
  plus_6_mois: 'bi-calendar4',
};

// === Lead Qualification ===

export interface LeadQualification {
  housingType?: HousingType;
  housingAge?: HousingAge;
  desiredServices: DesiredService[];
  existingInstallation?: ExistingInstallation;
  budgetRange?: BudgetRange;
  timeline?: ProjectTimeline;
  isDecisionMaker?: boolean;
  hasCompetition?: boolean;
  competitionDetails?: string;
  technicalNotes?: string;
  primaryNeed?: string;
}

// === Lead Scoring ===

export interface ScoreBreakdown {
  profile: number;     // 0-20: housing, decision maker, contact info
  budget: number;      // 0-20: budget range, estimated value
  engagement: number;  // 0-20: activity recency & count
  timing: number;      // 0-20: timeline urgency
  completeness: number; // 0-20: qualification completeness
}

export type ScoreLabel = 'froid' | 'tiede' | 'chaud' | 'brulant';

export interface LeadScore {
  total: number;       // 0-100
  breakdown: ScoreBreakdown;
  label: ScoreLabel;
  color: string;
}

export const SCORE_LABELS: Record<ScoreLabel, string> = {
  froid: 'Froid',
  tiede: 'Tiède',
  chaud: 'Chaud',
  brulant: 'Brûlant',
};

export const SCORE_COLORS: Record<ScoreLabel, string> = {
  froid: '#6c757d',
  tiede: '#0dcaf0',
  chaud: '#f59e0b',
  brulant: '#ef4444',
};

export const SCORE_ICONS: Record<ScoreLabel, string> = {
  froid: 'bi-snow',
  tiede: 'bi-cloud-sun',
  chaud: 'bi-sun',
  brulant: 'bi-fire',
};

// === Smart Suggestions ===

export type SuggestionType = 'warning' | 'opportunity' | 'action';
export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface SmartSuggestion {
  id: string;
  type: SuggestionType;
  icon: string;
  message: string;
  priority: SuggestionPriority;
  actionLabel?: string;
  actionRoute?: string;
  leadId: string;
  leadName?: string;
}

// === Prospection Stats ===

export interface ProspectionStats {
  totalProspects: number;
  hotLeads: number;
  coldLeads: number;
  avgScore: number;
  conversionByStage: { from: string; to: string; rate: number }[];
  bestSources: { source: string; label: string; avgScore: number; count: number }[];
}
