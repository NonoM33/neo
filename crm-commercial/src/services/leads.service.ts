import api from './api';
import type {
  Lead,
  LeadWithDetails,
  LeadStats,
  CreateLeadInput,
  UpdateLeadInput,
  ChangeStatusInput,
  ConvertLeadInput,
  LeadFilter
} from '../types';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const leadsService = {
  async getLeads(filter?: LeadFilter, page = 1, limit = 20): Promise<PaginatedResponse<Lead>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    if (filter) {
      if (filter.status) params.append('status', filter.status);
      if (filter.source) params.append('source', filter.source);
      if (filter.ownerId) params.append('ownerId', filter.ownerId);
      if (filter.search) params.append('search', filter.search);
      if (filter.minValue) params.append('minValue', String(filter.minValue));
      if (filter.maxValue) params.append('maxValue', String(filter.maxValue));
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
    }

    const response = await api.get<PaginatedResponse<Lead>>(`/api/leads?${params.toString()}`);
    return response.data;
  },

  async getLead(id: string): Promise<LeadWithDetails> {
    const response = await api.get<LeadWithDetails>(`/api/leads/${id}`);
    return response.data;
  },

  async getLeadStats(): Promise<LeadStats[]> {
    const response = await api.get<LeadStats[]>('/api/leads/stats');
    return response.data;
  },

  async createLead(input: CreateLeadInput): Promise<Lead> {
    const response = await api.post<Lead>('/api/leads', input);
    return response.data;
  },

  async updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
    const response = await api.put<Lead>(`/api/leads/${id}`, input);
    return response.data;
  },

  async changeStatus(id: string, input: ChangeStatusInput): Promise<Lead> {
    const response = await api.put<Lead>(`/api/leads/${id}/status`, input);
    return response.data;
  },

  async convertLead(id: string, input?: ConvertLeadInput): Promise<{ lead: Lead; projectId: string; clientId?: string }> {
    const response = await api.post<{ lead: Lead; projectId: string; clientId?: string }>(
      `/api/leads/${id}/convert`,
      input || {}
    );
    return response.data;
  },

  async deleteLead(id: string): Promise<void> {
    await api.delete(`/api/leads/${id}`);
  },
};

export default leadsService;
