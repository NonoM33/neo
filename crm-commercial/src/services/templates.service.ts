import api from './api';
import type {
  TemplateDTO,
  TemplatePreview,
  UpdateTemplatePayload,
} from '../types/template.types';

export const templatesService = {
  async list(): Promise<TemplateDTO[]> {
    const { data } = await api.get<TemplateDTO[]>('/api/templates');
    return data;
  },

  async get(key: string): Promise<TemplateDTO> {
    const { data } = await api.get<TemplateDTO>(`/api/templates/${key}`);
    return data;
  },

  async update(key: string, payload: UpdateTemplatePayload): Promise<TemplateDTO> {
    const { data } = await api.put<TemplateDTO>(`/api/templates/${key}`, payload);
    return data;
  },

  async preview(
    key: string,
    override?: { html?: string; subject?: string | null },
  ): Promise<TemplatePreview> {
    const { data } = await api.post<TemplatePreview>(
      `/api/templates/${key}/preview`,
      override ?? {},
    );
    return data;
  },

  async reset(key: string): Promise<TemplateDTO> {
    const { data } = await api.post<TemplateDTO>(`/api/templates/${key}/reset`, {});
    return data;
  },
};

export default templatesService;
