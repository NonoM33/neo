export type TicketStatus =
  | 'nouveau'
  | 'ouvert'
  | 'en_attente_client'
  | 'en_attente_interne'
  | 'escalade'
  | 'resolu'
  | 'ferme';

export type TicketPriority = 'basse' | 'normale' | 'haute' | 'urgente' | 'critique';

export type TicketSource = 'email' | 'telephone' | 'portail' | 'chat_ai' | 'backoffice' | 'api';

export const ticketStatusLabels: Record<TicketStatus, string> = {
  nouveau: 'Nouveau',
  ouvert: 'Ouvert',
  en_attente_client: 'En attente client',
  en_attente_interne: 'En attente interne',
  escalade: 'Escaladé',
  resolu: 'Résolu',
  ferme: 'Fermé',
};

export const ticketPriorityLabels: Record<TicketPriority, string> = {
  basse: 'Basse',
  normale: 'Normale',
  haute: 'Haute',
  urgente: 'Urgente',
  critique: 'Critique',
};

export const ticketSourceLabels: Record<TicketSource, string> = {
  email: 'Email',
  telephone: 'Téléphone',
  portail: 'Portail',
  chat_ai: 'Chat IA',
  backoffice: 'Back-office',
  api: 'API',
};

export interface TicketClientRef {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

export interface TicketUserRef {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
  email?: string | null;
}

export interface TicketCategoryRef {
  id: string | null;
  name: string | null;
  slug?: string | null;
}

export interface TicketListItem {
  id: string;
  number: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  slaBreached: boolean | null;
  escalationLevel: number;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: TicketClientRef;
  assignedTo: TicketUserRef;
  category: TicketCategoryRef;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorType: 'client' | 'staff' | 'ai';
  authorId: string | null;
  type: 'public' | 'interne';
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  changeType: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedById: string | null;
  changedByType: string;
  notes: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  number: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  categoryId: string | null;
  slaBreached: boolean | null;
  escalationLevel: number;
  tags: string[] | null;
  aiDiagnosis: string | null;
  troubleshootingSteps: unknown;
  chatSessionId: string | null;
  slaDefinitionId: string | null;
  firstResponseAt: string | null;
  firstResponseDueAt: string | null;
  resolutionDueAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  satisfactionRating: number | null;
  satisfactionComment: string | null;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  client: TicketClientRef;
  assignedTo: TicketUserRef;
  category: TicketCategoryRef;
  comments: TicketComment[];
  history: TicketHistoryEntry[];
}

export interface TicketStats {
  totalOpen: number;
  byStatus: { status: TicketStatus; total: number }[];
  byPriority: { priority: TicketPriority; total: number }[];
  slaBreached: number;
  avgResolutionHours: number | null;
}

export interface TicketFilter {
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToId?: string;
  clientId?: string;
  categoryId?: string;
  slaBreached?: boolean;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  priority?: TicketPriority;
  source?: TicketSource;
  categoryId?: string;
  clientId: string;
  projectId?: string;
  assignedToId?: string;
}

export interface AddCommentInput {
  content: string;
  type?: 'public' | 'interne';
}
