import api from './api';
import type {
  QuoteDetail,
  QuoteFilter,
  QuoteListItem,
  QuoteStatus,
  SendQuoteInput,
} from '../types';
import type { PaginatedResult } from './users.service';

/** Ligne saisie dans le formulaire de creation. */
export interface CreateQuoteLineInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  tvaRate: number;
}

export interface CreateQuoteInput {
  validUntil?: string;
  discount?: number;
  notes?: string;
  lines: CreateQuoteLineInput[];
}

export const devisService = {
  /** Un devis est toujours rattache a un projet : l'API le prend en chemin. */
  async createQuote(projectId: string, input: CreateQuoteInput): Promise<QuoteDetail> {
    const response = await api.post<QuoteDetail>(`/api/projets/${projectId}/devis`, input);
    return response.data;
  },

  async deleteQuote(id: string): Promise<void> {
    await api.delete(`/api/devis/${id}`);
  },

  /** Devis d'un projet. Il n'existe pas d'endpoint « devis d'un client ». */
  async getQuotesByProject(projectId: string): Promise<QuoteListItem[]> {
    const response = await api.get<QuoteListItem[]>(`/api/projets/${projectId}/devis`);
    return response.data;
  },

  async getQuotes(
    filter?: QuoteFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<QuoteListItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.search?.trim()) params.append('search', filter.search.trim());

    const response = await api.get<PaginatedResult<QuoteListItem>>(
      `/api/devis?${params.toString()}`
    );
    return response.data;
  },

  async getQuote(id: string): Promise<QuoteDetail> {
    const response = await api.get<QuoteDetail>(`/api/devis/${id}`);
    return response.data;
  },

  async updateStatus(id: string, status: QuoteStatus): Promise<QuoteDetail> {
    const response = await api.put<QuoteDetail>(`/api/devis/${id}`, { status });
    return response.data;
  },

  async applyPromoCode(id: string, promoCode: string): Promise<QuoteDetail> {
    const response = await api.put<QuoteDetail>(`/api/devis/${id}`, { promoCode });
    return response.data;
  },

  async removePromoCode(id: string): Promise<QuoteDetail> {
    const response = await api.put<QuoteDetail>(`/api/devis/${id}`, { promoCode: null });
    return response.data;
  },

  async sendQuote(id: string, input: SendQuoteInput = {}): Promise<void> {
    await api.post(`/api/devis/${id}/envoyer`, input);
  },

  async openPdf(id: string): Promise<void> {
    const response = await api.get(`/api/devis/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    window.open(url, '_blank', 'noopener');
    // Laisser le temps au navigateur d'ouvrir l'onglet avant de révoquer l'URL.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export default devisService;
