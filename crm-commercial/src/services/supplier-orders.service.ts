import api from './api';
import type {
  ReceptionLineInput,
  SupplierOrderDetail,
  SupplierOrderFilter,
  SupplierOrderListItem,
  SupplierOrderStatus,
} from '../types';
import type { PaginatedResult } from './users.service';

export const supplierOrdersService = {
  async getSupplierOrders(
    filter?: SupplierOrderFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<SupplierOrderListItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.supplierId) params.append('supplierId', filter.supplierId);

    const response = await api.get<PaginatedResult<SupplierOrderListItem>>(
      `/api/commandes-fournisseurs?${params.toString()}`
    );
    return response.data;
  },

  async getSupplierOrder(id: string): Promise<SupplierOrderDetail> {
    const response = await api.get<SupplierOrderDetail>(
      `/api/commandes-fournisseurs/${id}`
    );
    return response.data;
  },

  async changeStatus(
    id: string,
    status: SupplierOrderStatus,
    notes?: string
  ): Promise<SupplierOrderDetail> {
    const response = await api.put<SupplierOrderDetail>(
      `/api/commandes-fournisseurs/${id}/status`,
      { status, notes }
    );
    return response.data;
  },

  async receive(
    id: string,
    lines: ReceptionLineInput[],
    notes?: string
  ): Promise<SupplierOrderDetail> {
    const response = await api.post<SupplierOrderDetail>(
      `/api/commandes-fournisseurs/${id}/reception`,
      { lines, notes }
    );
    return response.data;
  },
};

export default supplierOrdersService;
