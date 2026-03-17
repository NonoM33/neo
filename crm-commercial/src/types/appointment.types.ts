// Appointment Types
export type AppointmentType = 'visite_technique' | 'audit' | 'rdv_commercial' | 'installation' | 'sav' | 'reunion_interne' | 'autre';
export type AppointmentStatus = 'propose' | 'confirme' | 'en_cours' | 'termine' | 'annule' | 'no_show';
export type LocationType = 'sur_site' | 'bureau' | 'visio' | 'telephone';
export type ParticipantRole = 'organisateur' | 'participant' | 'optionnel';
export type ParticipantResponseStatus = 'en_attente' | 'accepte' | 'refuse';
export type RecurrenceFrequency = 'quotidien' | 'hebdomadaire' | 'bi_hebdomadaire' | 'mensuel';
export type DayOfWeek = 'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche';

// Interfaces
export interface AppointmentParticipant {
  id: string;
  appointmentId: string;
  userId: string;
  role: ParticipantRole;
  status: ParticipantResponseStatus;
  user?: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
}

export interface Appointment {
  id: string;
  title: string;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledAt: string;
  endAt: string;
  duration: number;
  location?: string;
  locationType: LocationType;
  organizerId: string;
  organizer?: { id: string; firstName: string; lastName: string };
  leadId?: string;
  clientId?: string;
  projectId?: string;
  lead?: { id: string; firstName: string; lastName: string; title: string };
  client?: { id: string; firstName: string; lastName: string };
  participants?: AppointmentParticipant[];
  recurrenceRuleId?: string;
  recurrenceParentId?: string;
  notes?: string;
  outcome?: string;
  cancellationReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  id: string;
  userId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

export interface AvailabilityOverride {
  id: string;
  userId: string;
  date: string;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface RecurrenceRule {
  id: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: DayOfWeek[];
  endDate?: string;
  maxOccurrences?: number;
}

export interface AppointmentTypeConfig {
  id: string;
  type: AppointmentType;
  label: string;
  defaultDuration: number;
  color: string;
  icon: string;
  allowedRoles?: string[];
  requiresClient: boolean;
  requiresLocation: boolean;
  isActive: boolean;
}

export interface AppointmentFilter {
  fromDate: string;
  toDate: string;
  type?: AppointmentType;
  status?: AppointmentStatus;
  userId?: string;
  leadId?: string;
  clientId?: string;
  projectId?: string;
}

export interface CreateAppointmentInput {
  title?: string;
  type: AppointmentType;
  scheduledAt: string;
  endAt: string;
  duration: number;
  location?: string;
  locationType?: LocationType;
  leadId?: string;
  clientId?: string;
  projectId?: string;
  notes?: string;
  participants?: { userId: string; role?: ParticipantRole }[];
}

export interface UpdateAppointmentInput extends Partial<CreateAppointmentInput> {}

export interface AppointmentKPIs {
  total: number;
  byStatus: { status: AppointmentStatus; count: number }[];
  byType: { type: AppointmentType; count: number }[];
  completionRate: number;
  noShowRate: number;
  avgDuration: number;
  perWeek: number;
}

// Label maps
export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  visite_technique: 'Visite technique',
  audit: 'Audit',
  rdv_commercial: 'RDV Commercial',
  installation: 'Installation',
  sav: 'SAV',
  reunion_interne: 'Réunion interne',
  autre: 'Autre',
};

export const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  visite_technique: '#0d6efd',
  audit: '#6f42c1',
  rdv_commercial: '#198754',
  installation: '#fd7e14',
  sav: '#dc3545',
  reunion_interne: '#6c757d',
  autre: '#adb5bd',
};

export const APPOINTMENT_TYPE_ICONS: Record<AppointmentType, string> = {
  visite_technique: 'bi-tools',
  audit: 'bi-clipboard-check',
  rdv_commercial: 'bi-briefcase',
  installation: 'bi-wrench',
  sav: 'bi-exclamation-triangle',
  reunion_interne: 'bi-people',
  autre: 'bi-calendar',
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  propose: 'Proposé',
  confirme: 'Confirmé',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
  no_show: 'No-show',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
  propose: '#6c757d',
  confirme: '#0d6efd',
  en_cours: '#ffc107',
  termine: '#198754',
  annule: '#dc3545',
  no_show: '#adb5bd',
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  sur_site: 'Sur site',
  bureau: 'Bureau',
  visio: 'Visioconférence',
  telephone: 'Téléphone',
};

export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  lundi: 'Lundi',
  mardi: 'Mardi',
  mercredi: 'Mercredi',
  jeudi: 'Jeudi',
  vendredi: 'Vendredi',
  samedi: 'Samedi',
  dimanche: 'Dimanche',
};
