import api from './api';
import type { PaginatedResponse } from './leads.service';
import type {
  Product,
  ProductWithDependencies,
  ProductDependency,
  CreateProductInput,
  UpdateProductInput,
  ProductFilter,
  CreateDependencyInput,
  UpdateDependencyInput,
  ImportResult,
} from '../types';

export const productsService = {
  async getProducts(filter?: ProductFilter, page = 1, limit = 20): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));

    if (filter) {
      if (filter.category) params.append('category', filter.category);
      if (filter.brand) params.append('brand', filter.brand);
      if (filter.search) params.append('search', filter.search);
      if (filter.isActive !== undefined) params.append('isActive', String(filter.isActive));
      if (filter.minPrice !== undefined) params.append('minPrice', String(filter.minPrice));
      if (filter.maxPrice !== undefined) params.append('maxPrice', String(filter.maxPrice));
    }

    const response = await api.get<PaginatedResponse<Product>>(`/api/produits?${params.toString()}`);
    return response.data;
  },

  async getProduct(id: string): Promise<ProductWithDependencies> {
    const response = await api.get<ProductWithDependencies>(`/api/produits/${id}`);
    return response.data;
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get<string[]>('/api/produits/categories');
    return response.data;
  },

  async getMarques(): Promise<string[]> {
    const response = await api.get<string[]>('/api/produits/marques');
    return response.data;
  },

  async createProduct(input: CreateProductInput): Promise<Product> {
    const response = await api.post<Product>('/api/produits', input);
    return response.data;
  },

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const response = await api.put<Product>(`/api/produits/${id}`, input);
    return response.data;
  },

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/api/produits/${id}`);
  },

  async addDependency(productId: string, input: CreateDependencyInput): Promise<ProductDependency> {
    const response = await api.post<ProductDependency>(`/api/produits/${productId}/dependances`, input);
    return response.data;
  },

  async updateDependency(dependencyId: string, input: UpdateDependencyInput): Promise<ProductDependency> {
    const response = await api.put<ProductDependency>(`/api/produits/dependances/${dependencyId}`, input);
    return response.data;
  },

  async removeDependency(dependencyId: string): Promise<void> {
    await api.delete(`/api/produits/dependances/${dependencyId}`);
  },

  async importCSV(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ImportResult>('/api/produits/import', formData);
    return response.data;
  },
};

export default productsService;
