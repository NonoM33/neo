import api from './api';
import type {
  OrderDetail,
  OrderFilter,
  OrderListItem,
  OrderStatus,
} from '../types';
import type { PaginatedResult } from './users.service';

export const ordersService = {
  async getOrders(
    filter?: OrderFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<OrderListItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.status) params.append('status', filter.status);
    if (filter?.projectId) params.append('projectId', filter.projectId);

    const response = await api.get<PaginatedResult<OrderListItem>>(
      `/api/commandes?${params.toString()}`
    );
    return response.data;
  },

  async getOrder(id: string): Promise<OrderDetail> {
    const response = await api.get<OrderDetail>(`/api/commandes/${id}`);
    return response.data;
  },

  async changeStatus(
    id: string,
    status: OrderStatus,
    notes?: string
  ): Promise<OrderDetail> {
    const response = await api.put<OrderDetail>(`/api/commandes/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  },
};

export default ordersService;
