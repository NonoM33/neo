import api from './api';
import type {
  SystemToken,
  CreateSystemTokenInput,
  CreatedSystemToken,
} from '../types/system-token.types';

export const systemTokensService = {
  async list(): Promise<SystemToken[]> {
    const response = await api.get<SystemToken[]>('/api/system-tokens');
    return response.data;
  },

  async create(input: CreateSystemTokenInput): Promise<CreatedSystemToken> {
    const response = await api.post<CreatedSystemToken>('/api/system-tokens', input);
    return response.data;
  },

  async revoke(id: string): Promise<void> {
    await api.post(`/api/system-tokens/${id}/revoke`);
  },
};

export default systemTokensService;
