import api from './api';
import type {
  Project,
  ProjectFilter,
  CreateProjectInput,
  UpdateProjectInput,
} from '../types';
import type { PaginatedResult } from './users.service';

export const projectsService = {
  async getProjects(
    filter?: ProjectFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<Project>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.clientId) params.append('clientId', filter.clientId);
    if (filter?.search?.trim()) params.append('search', filter.search.trim());

    const response = await api.get<PaginatedResult<Project>>(
      `/api/projets?${params.toString()}`
    );
    return response.data;
  },

  async getProject(id: string): Promise<Project> {
    const response = await api.get<Project>(`/api/projets/${id}`);
    return response.data;
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    const response = await api.post<Project>('/api/projets', input);
    return response.data;
  },

  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    const response = await api.put<Project>(`/api/projets/${id}`, input);
    return response.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/api/projets/${id}`);
  },
};

export default projectsService;
