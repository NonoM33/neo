import api from './api';
import type { Client, ClientFilter, CreateClientInput, UpdateClientInput } from '../types';
import type { PaginatedResult } from './users.service';

export const clientsService = {
  async getClients(filter?: ClientFilter, page = 1, limit = 20): Promise<PaginatedResult<Client>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.search?.trim()) params.append('search', filter.search.trim());

    const response = await api.get<PaginatedResult<Client>>(
      `/api/projets/clients?${params.toString()}`
    );
    return response.data;
  },

  async getClient(id: string): Promise<Client> {
    const response = await api.get<Client>(`/api/projets/clients/${id}`);
    return response.data;
  },

  async createClient(input: CreateClientInput): Promise<Client> {
    const response = await api.post<Client>('/api/projets/clients', input);
    return response.data;
  },

  async updateClient(id: string, input: UpdateClientInput): Promise<Client> {
    const response = await api.put<Client>(`/api/projets/clients/${id}`, input);
    return response.data;
  },

  async deleteClient(id: string): Promise<void> {
    await api.delete(`/api/projets/clients/${id}`);
  },
};

export default clientsService;
