import api from './api';
import type {
  StaffUser,
  StaffUserFilter,
  CreateStaffUserInput,
  UpdateStaffUserInput,
} from '../types';

export interface PaginatedResult<T> {
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

export const usersService = {
  async getUsers(filter?: StaffUserFilter, page = 1, limit = 20): Promise<PaginatedResult<StaffUser>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.role) params.append('role', filter.role);
    if (filter?.search?.trim()) params.append('search', filter.search.trim());

    const response = await api.get<PaginatedResult<StaffUser>>(`/api/users?${params.toString()}`);
    return response.data;
  },

  async getUser(id: string): Promise<StaffUser> {
    const response = await api.get<StaffUser>(`/api/users/${id}`);
    return response.data;
  },

  async createUser(input: CreateStaffUserInput): Promise<StaffUser> {
    const response = await api.post<StaffUser>('/api/users', input);
    return response.data;
  },

  async updateUser(id: string, input: UpdateStaffUserInput): Promise<StaffUser> {
    const response = await api.put<StaffUser>(`/api/users/${id}`, input);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/api/users/${id}`);
  },
};

export default usersService;
