import type { PillTone } from '../../components/neo';
import type {
  RecetteApp,
  RecetteSeverity,
  RecetteStatus,
  RecetteValidation,
} from '../../types/recette.types';

export const APP_LABELS: Record<RecetteApp, string> = {
  admin: 'Backoffice Admin',
  crm: 'CRM Commercial',
  flutter: 'App Intégrateur',
  site: 'Site Vitrine',
};

export const SEVERITY_META: Record<RecetteSeverity, { label: string; tone: PillTone }> = {
  bloquant: { label: 'Bloquant', tone: 'danger' },
  majeur: { label: 'Majeur', tone: 'warning' },
  mineur: { label: 'Mineur', tone: 'info' },
  cosmetique: { label: 'Cosmétique', tone: 'neutral' },
};

export const STATUS_META: Record<RecetteStatus, { label: string; tone: PillTone }> = {
  ouvert: { label: 'Ouvert', tone: 'danger' },
  corrige: { label: 'Corrigé', tone: 'info' },
  valide: { label: 'Validé', tone: 'success' },
  a_revoir: { label: 'À revoir', tone: 'warning' },
};

export const VALIDATION_META: Record<RecetteValidation, { label: string; tone: PillTone }> = {
  a_tester: { label: 'À tester', tone: 'neutral' },
  valide: { label: 'Validé', tone: 'success' },
  a_corriger: { label: 'À corriger', tone: 'danger' },
};
