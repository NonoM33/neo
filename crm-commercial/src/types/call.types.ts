export type CallStatus = 'uploading' | 'transcribing' | 'analyzing' | 'done' | 'error';
export type Sentiment = 'positif' | 'neutre' | 'negatif';
export type QualificationLabel = 'brulant' | 'chaud' | 'tiede' | 'froid';
export type Timeline = 'urgent' | '1_3_mois' | '3_6_mois' | 'plus_6_mois';

export interface CallAnalysis {
  needs: string[];
  budget: { mentioned: boolean; range: string | null; exact: number | null };
  housingType: 'maison' | 'appartement' | null;
  surface: string | null;
  city: string | null;
  postalCode: string | null;
  timeline: Timeline | null;
  decisionMaker: boolean | null;
  competition: { mentioned: boolean; details: string | null };
  objections: string[];
  sentiment: Sentiment;
  qualificationScore: number;
  qualificationLabel: QualificationLabel;
  summary: string;
  nextAction: string;
  keyQuotes: string[];
}

export interface CallRecording {
  id: string;
  leadId: string | null;
  activityId: string | null;
  audioUrl: string | null;
  duration: number | null;
  fileSize: number | null;
  mimeType: string;
  transcription: string | null;
  aiAnalysis: CallAnalysis | null;
  status: CallStatus;
  errorMessage: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  uploading: 'Upload en cours',
  transcribing: 'Transcription...',
  analyzing: 'Analyse IA...',
  done: 'Termin\u00e9',
  error: 'Erreur',
};

export const CALL_STATUS_COLORS: Record<CallStatus, string> = {
  uploading: 'var(--neo-info)',
  transcribing: 'var(--neo-warning)',
  analyzing: 'var(--neo-primary)',
  done: 'var(--neo-success)',
  error: 'var(--neo-danger)',
};

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positif: 'Positif',
  neutre: 'Neutre',
  negatif: 'N\u00e9gatif',
};

export const SENTIMENT_ICONS: Record<Sentiment, string> = {
  positif: 'bi-emoji-smile',
  neutre: 'bi-emoji-neutral',
  negatif: 'bi-emoji-frown',
};

export const QUALIFICATION_LABELS: Record<QualificationLabel, string> = {
  brulant: 'Br\u00fblant',
  chaud: 'Chaud',
  tiede: 'Ti\u00e8de',
  froid: 'Froid',
};

export const QUALIFICATION_COLORS: Record<QualificationLabel, string> = {
  brulant: 'var(--neo-danger)',
  chaud: 'var(--neo-warning)',
  tiede: 'var(--neo-info)',
  froid: 'var(--neo-text-muted)',
};

export const NEEDS_LABELS: Record<string, string> = {
  eclairage: '\u00c9clairage',
  chauffage: 'Chauffage',
  securite: 'S\u00e9curit\u00e9',
  volets: 'Volets',
  multimedia: 'Multim\u00e9dia',
  reseau: 'R\u00e9seau',
  autre: 'Autre',
};

export const NEEDS_ICONS: Record<string, string> = {
  eclairage: 'bi-lightbulb',
  chauffage: 'bi-thermometer-half',
  securite: 'bi-shield-check',
  volets: 'bi-window',
  multimedia: 'bi-speaker',
  reseau: 'bi-wifi',
  autre: 'bi-three-dots',
};

export const CALL_TIMELINE_LABELS: Record<Timeline, string> = {
  urgent: 'Urgent',
  '1_3_mois': '1-3 mois',
  '3_6_mois': '3-6 mois',
  plus_6_mois: '+ 6 mois',
};
