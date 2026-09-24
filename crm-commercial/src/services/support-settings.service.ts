import api from './api';
import type {
  CannedResponse,
  CreateCannedResponseInput,
  CreateSlaInput,
  CreateTicketCategoryInput,
  SlaDefinition,
  TicketCategory,
  UpdateCannedResponseInput,
  UpdateSlaInput,
  UpdateTicketCategoryInput,
} from '../types/support-settings.types';

const BASE = '/api/tickets';

export const supportSettingsService = {
  // ── SLA ──────────────────────────────────────────────────────
  async listSla(): Promise<SlaDefinition[]> {
    const { data } = await api.get<SlaDefinition[]>(`${BASE}/sla`);
    return data;
  },
  async createSla(input: CreateSlaInput): Promise<SlaDefinition> {
    const { data } = await api.post<SlaDefinition>(`${BASE}/sla`, input);
    return data;
  },
  async updateSla(id: string, input: UpdateSlaInput): Promise<SlaDefinition> {
    const { data } = await api.put<SlaDefinition>(`${BASE}/sla/${id}`, input);
    return data;
  },
  async deleteSla(id: string): Promise<void> {
    await api.delete(`${BASE}/sla/${id}`);
  },

  // ── Catégories tickets ───────────────────────────────────────
  async listCategories(): Promise<TicketCategory[]> {
    const { data } = await api.get<TicketCategory[]>(`${BASE}/categories`);
    return data;
  },
  async createCategory(input: CreateTicketCategoryInput): Promise<TicketCategory> {
    const { data } = await api.post<TicketCategory>(`${BASE}/categories`, input);
    return data;
  },
  async updateCategory(id: string, input: UpdateTicketCategoryInput): Promise<TicketCategory> {
    const { data } = await api.put<TicketCategory>(`${BASE}/categories/${id}`, input);
    return data;
  },
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${BASE}/categories/${id}`);
  },

  // ── Réponses pré-enregistrées ────────────────────────────────
  async listCannedResponses(): Promise<CannedResponse[]> {
    const { data } = await api.get<CannedResponse[]>(`${BASE}/canned-responses`);
    return data;
  },
  async createCannedResponse(input: CreateCannedResponseInput): Promise<CannedResponse> {
    const { data } = await api.post<CannedResponse>(`${BASE}/canned-responses`, input);
    return data;
  },
  async updateCannedResponse(
    id: string,
    input: UpdateCannedResponseInput
  ): Promise<CannedResponse> {
    const { data } = await api.put<CannedResponse>(`${BASE}/canned-responses/${id}`, input);
    return data;
  },
  async deleteCannedResponse(id: string): Promise<void> {
    await api.delete(`${BASE}/canned-responses/${id}`);
  },
};

export default supportSettingsService;
