import api from './api';
import type { CloudInstance, CloudStats, CreateInstanceInput } from '../types/cloud.types';

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const cloudService = {
  async getInstances(params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<PaginatedResponse<CloudInstance>> {
    const response = await api.get<PaginatedResponse<CloudInstance>>('/api/cloud-instances', { params });
    return response.data;
  },

  async getInstance(id: string): Promise<CloudInstance> {
    const response = await api.get<CloudInstance>(`/api/cloud-instances/${id}`);
    return response.data;
  },

  async getStats(): Promise<CloudStats> {
    const response = await api.get<CloudStats>('/api/cloud-instances/stats');
    return response.data;
  },

  async getInstanceStatus(id: string): Promise<CloudInstance & { dockerStatus: string }> {
    const response = await api.get<CloudInstance & { dockerStatus: string }>(`/api/cloud-instances/${id}/status`);
    return response.data;
  },

  async getInstanceLogs(id: string, lines?: number): Promise<{ logs: string }> {
    const response = await api.get<{ logs: string }>(`/api/cloud-instances/${id}/logs`, { params: { lines } });
    return response.data;
  },

  async provisionInstance(input: CreateInstanceInput): Promise<CloudInstance> {
    const response = await api.post<CloudInstance>('/api/cloud-instances', input);
    return response.data;
  },

  async startInstance(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/api/cloud-instances/${id}/start`);
    return response.data;
  },

  async stopInstance(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/api/cloud-instances/${id}/stop`);
    return response.data;
  },

  async restartInstance(id: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/api/cloud-instances/${id}/restart`);
    return response.data;
  },

  async destroyInstance(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/api/cloud-instances/${id}`);
    return response.data;
  },
};
