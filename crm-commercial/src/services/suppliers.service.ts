import api from './api';
import type {
  Supplier,
  SupplierDetail,
  SupplierInput,
  SupplierListItem,
} from '../types/supplier.types';

const BASE = '/api/fournisseurs';

export const suppliersService = {
  async list(search?: string): Promise<SupplierListItem[]> {
    const { data } = await api.get<SupplierListItem[]>(BASE, {
      params: search ? { search } : undefined,
    });
    return data;
  },
  async get(id: string): Promise<SupplierDetail> {
    const { data } = await api.get<SupplierDetail>(`${BASE}/${id}`);
    return data;
  },
  async create(input: SupplierInput): Promise<Supplier> {
    const { data } = await api.post<Supplier>(BASE, input);
    return data;
  },
  async update(id: string, input: Partial<SupplierInput>): Promise<Supplier> {
    const { data } = await api.put<Supplier>(`${BASE}/${id}`, input);
    return data;
  },
  async remove(id: string): Promise<void> {
    await api.delete(`${BASE}/${id}`);
  },
};

export default suppliersService;
