import type { TicketPriority } from './ticket.types';

export interface SlaDefinition {
  id: string;
  name: string;
  priority: TicketPriority | null;
  categoryId: string | null;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlaInput {
  name: string;
  priority?: TicketPriority;
  categoryId?: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  isDefault?: boolean;
}

export type UpdateSlaInput = Partial<CreateSlaInput>;

export interface TicketCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export type UpdateTicketCategoryInput = Partial<CreateTicketCategoryInput>;

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  categoryId: string | null;
  shortcut: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCannedResponseInput {
  title: string;
  content: string;
  categoryId?: string;
  shortcut?: string;
}

export type UpdateCannedResponseInput = Partial<CreateCannedResponseInput>;
