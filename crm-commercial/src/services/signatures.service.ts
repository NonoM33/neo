import api from './api';
import type { SignatureListFilter, SignatureListResult } from '../types/signature.types';

const BASE = '/api/signatures';

export const signaturesService = {
  async list(filter?: SignatureListFilter): Promise<SignatureListResult> {
    const params: Record<string, string | number> = {};
    if (filter?.status) params.status = filter.status;
    if (filter?.mode) params.mode = filter.mode;
    if (filter?.page) params.page = filter.page;
    if (filter?.pageSize) params.pageSize = filter.pageSize;
    const { data } = await api.get<SignatureListResult>(BASE, {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  },
};

export default signaturesService;
