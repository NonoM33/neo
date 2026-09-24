import api from './api';
import type {
  CreateStockMovementInput,
  StockAlert,
  StockDashboard,
  StockMovement,
  StockMovementFilter,
} from '../types';
import type { PaginatedResult } from './users.service';

export const stockService = {
  async getDashboard(): Promise<StockDashboard> {
    const response = await api.get<StockDashboard>('/api/stock');
    return response.data;
  },

  async getAlerts(): Promise<StockAlert[]> {
    const response = await api.get<StockAlert[]>('/api/stock/alertes');
    return response.data;
  },

  async getMovements(
    filter?: StockMovementFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<StockMovement>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.type) params.append('type', filter.type);
    if (filter?.productId) params.append('productId', filter.productId);

    const response = await api.get<PaginatedResult<StockMovement>>(
      `/api/stock/mouvements?${params.toString()}`
    );
    return response.data;
  },

  async createMovement(input: CreateStockMovementInput): Promise<StockMovement> {
    const response = await api.post<StockMovement>('/api/stock/mouvement', input);
    return response.data;
  },
};

export default stockService;
