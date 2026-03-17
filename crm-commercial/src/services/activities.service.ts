import api from './api';
import type { Activity, ActivityType, ActivityStatus } from '../types';

export interface CreateActivityInput {
  leadId?: string;
  clientId?: string;
  projectId?: string;
  type: ActivityType;
  subject: string;
  description?: string;
  scheduledAt?: string;
  duration?: number;
  reminderAt?: string;
}

export interface UpdateActivityInput extends Partial<CreateActivityInput> {
  status?: ActivityStatus;
}

export interface ActivityFilter {
  leadId?: string;
  clientId?: string;
  projectId?: string;
  type?: ActivityType;
  status?: ActivityStatus;
  ownerId?: string;
  fromDate?: string;
  toDate?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const activitiesService = {
  async getActivities(filter?: ActivityFilter, page = 1, limit = 20): Promise<PaginatedResponse<Activity>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    if (filter) {
      if (filter.leadId) params.append('leadId', filter.leadId);
      if (filter.clientId) params.append('clientId', filter.clientId);
      if (filter.projectId) params.append('projectId', filter.projectId);
      if (filter.type) params.append('type', filter.type);
      if (filter.status) params.append('status', filter.status);
      if (filter.ownerId) params.append('ownerId', filter.ownerId);
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
    }

    const response = await api.get<PaginatedResponse<Activity>>(`/api/activities?${params.toString()}`);
    return response.data;
  },

  async getActivity(id: string): Promise<Activity> {
    const response = await api.get<Activity>(`/api/activities/${id}`);
    return response.data;
  },

  async getUpcoming(): Promise<Activity[]> {
    const response = await api.get<Activity[]>('/api/activities/upcoming');
    return response.data;
  },

  async createActivity(input: CreateActivityInput): Promise<Activity> {
    const response = await api.post<Activity>('/api/activities', input);
    return response.data;
  },

  async updateActivity(id: string, input: UpdateActivityInput): Promise<Activity> {
    const response = await api.put<Activity>(`/api/activities/${id}`, input);
    return response.data;
  },

  async completeActivity(id: string): Promise<Activity> {
    const response = await api.post<Activity>(`/api/activities/${id}/complete`);
    return response.data;
  },

  async deleteActivity(id: string): Promise<void> {
    await api.delete(`/api/activities/${id}`);
  },
};

export default activitiesService;
