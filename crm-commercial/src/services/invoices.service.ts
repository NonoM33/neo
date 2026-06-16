import api from './api';
import type {
  InvoiceDetail,
  InvoiceFilter,
  InvoiceListItem,
  InvoiceStatus,
} from '../types';
import type { PaginatedResult } from './users.service';

export const invoicesService = {
  async getInvoices(
    filter?: InvoiceFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<InvoiceListItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.projectId) params.append('projectId', filter.projectId);
    if (filter?.overdue) params.append('overdue', 'true');

    const response = await api.get<PaginatedResult<InvoiceListItem>>(
      `/api/factures?${params.toString()}`
    );
    return response.data;
  },

  async getInvoice(id: string): Promise<InvoiceDetail> {
    const response = await api.get<InvoiceDetail>(`/api/factures/${id}`);
    return response.data;
  },

  async changeStatus(
    id: string,
    status: InvoiceStatus,
    notes?: string
  ): Promise<InvoiceDetail> {
    const response = await api.put<InvoiceDetail>(`/api/factures/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  async sendInvoice(id: string): Promise<void> {
    await api.post(`/api/factures/${id}/send`, {});
  },

  async openPdf(id: string): Promise<void> {
    const response = await api.get(`/api/factures/${id}/pdf`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};

export default invoicesService;
