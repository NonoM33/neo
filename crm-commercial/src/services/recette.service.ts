import api from './api';
import type {
  CreateRecetteFeedbackInput,
  RecetteFeature,
  RecetteFeedback,
  RecetteFilters,
  RecetteStatus,
  RecetteSummary,
  RecetteValidation,
} from '../types/recette.types';

const BASE = '/api/recette';

export const recetteService = {
  async getSummary(): Promise<RecetteSummary> {
    const { data } = await api.get<RecetteSummary>(`${BASE}/summary`);
    return data;
  },
  async getCatalogue(filters?: RecetteFilters): Promise<RecetteFeature[]> {
    const params: Record<string, string> = {};
    if (filters?.app) params.app = filters.app;
    if (filters?.status) params.status = filters.status;
    if (filters?.severity) params.severity = filters.severity;
    if (filters?.validation) params.validation = filters.validation;
    const { data } = await api.get<RecetteFeature[]>(`${BASE}/catalogue`, {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  },
  async createFeedback(input: CreateRecetteFeedbackInput): Promise<RecetteFeedback> {
    const { data } = await api.post<RecetteFeedback>(`${BASE}/feedback`, input);
    return data;
  },
  async updateFeedbackStatus(id: string, status: RecetteStatus): Promise<void> {
    await api.patch(`${BASE}/feedback/${id}/status`, { status });
  },
  async updateFeatureValidation(id: string, validationStatus: RecetteValidation): Promise<void> {
    await api.patch(`${BASE}/features/${id}/validation`, { validationStatus });
  },
  async deleteFeedback(id: string): Promise<void> {
    await api.delete(`${BASE}/feedback/${id}`);
  },
};

export default recetteService;
