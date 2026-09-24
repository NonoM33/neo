import api from './api';
import type { Role, PermissionGroup, RoleInput } from '../types/role.types';

export const rolesService = {
  async list(): Promise<Role[]> {
    const response = await api.get<Role[]>('/api/roles');
    return response.data;
  },

  async get(id: string): Promise<Role> {
    const response = await api.get<Role>(`/api/roles/${id}`);
    return response.data;
  },

  async getPermissions(): Promise<PermissionGroup[]> {
    const response = await api.get<PermissionGroup[]>('/api/roles/permissions');
    return response.data;
  },

  async create(input: RoleInput): Promise<Role> {
    const response = await api.post<Role>('/api/roles', input);
    return response.data;
  },

  async update(id: string, input: RoleInput): Promise<Role> {
    const response = await api.put<Role>(`/api/roles/${id}`, input);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/roles/${id}`);
  },
};

export default rolesService;
