import api from './api';
import type {
  QuoteDetail,
  QuoteFilter,
  QuoteListItem,
  QuoteStatus,
  SendQuoteInput,
} from '../types';
import type { PaginatedResult } from './users.service';

export const devisService = {
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
