import api from './api';
import type {
  AddCommentInput,
  CreateTicketInput,
  TicketComment,
  TicketDetail,
  TicketFilter,
  TicketHistoryEntry,
  TicketListItem,
  TicketStats,
  TicketStatus,
} from '../types';
import type { PaginatedResult } from './users.service';

export const ticketsService = {
  async getTickets(
    filter?: TicketFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<TicketListItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.search?.trim()) params.append('search', filter.search.trim());
    if (filter?.status) params.append('status', filter.status);
    if (filter?.priority) params.append('priority', filter.priority);
    if (filter?.assignedToId) params.append('assignedToId', filter.assignedToId);
    if (filter?.clientId) params.append('clientId', filter.clientId);
    if (filter?.categoryId) params.append('categoryId', filter.categoryId);
    if (filter?.slaBreached !== undefined) {
      params.append('slaBreached', String(filter.slaBreached));
    }

    const response = await api.get<PaginatedResult<TicketListItem>>(
      `/api/tickets?${params.toString()}`
    );
    return response.data;
  },

  async getStats(): Promise<TicketStats> {
    const response = await api.get<TicketStats>('/api/tickets/stats');
    return response.data;
  },

  async getTicket(id: string): Promise<TicketDetail> {
    const response = await api.get<TicketDetail>(`/api/tickets/${id}`);
    return response.data;
  },

  async createTicket(input: CreateTicketInput): Promise<TicketDetail> {
    const response = await api.post<TicketDetail>('/api/tickets', input);
    return response.data;
  },

  async changeStatus(id: string, status: TicketStatus, notes?: string): Promise<void> {
    await api.put(`/api/tickets/${id}/status`, { status, notes });
  },

  async assignTicket(id: string, assignedToId: string | null): Promise<void> {
    await api.put(`/api/tickets/${id}/assign`, { assignedToId });
  },

  async escalateTicket(id: string): Promise<void> {
    await api.put(`/api/tickets/${id}/escalate`, {});
  },

  async addComment(id: string, input: AddCommentInput): Promise<TicketComment> {
    const response = await api.post<TicketComment>(`/api/tickets/${id}/comments`, input);
    return response.data;
  },

  async getHistory(id: string): Promise<TicketHistoryEntry[]> {
    const response = await api.get<TicketHistoryEntry[]>(`/api/tickets/${id}/history`);
    return response.data;
  },
};

export default ticketsService;
