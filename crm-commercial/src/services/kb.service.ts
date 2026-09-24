import api from './api';
import type { PaginatedResult } from './users.service';
import type {
  CreateFaqInput,
  CreateKbArticleInput,
  CreateKbCategoryInput,
  FaqItem,
  KbArticleDetail,
  KbArticleFilter,
  KbArticleListItem,
  KbCategory,
  UpdateFaqInput,
  UpdateKbArticleInput,
  UpdateKbCategoryInput,
} from '../types/kb.types';

const BASE = '/api/kb';

export const kbService = {
  // ── Catégories ───────────────────────────────────────────────
  async listCategories(): Promise<KbCategory[]> {
    const { data } = await api.get<KbCategory[]>(`${BASE}/categories`);
    return data;
  },
  async createCategory(input: CreateKbCategoryInput): Promise<KbCategory> {
    const { data } = await api.post<KbCategory>(`${BASE}/categories`, input);
    return data;
  },
  async updateCategory(id: string, input: UpdateKbCategoryInput): Promise<KbCategory> {
    const { data } = await api.put<KbCategory>(`${BASE}/categories/${id}`, input);
    return data;
  },
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${BASE}/categories/${id}`);
  },

  // ── Articles ─────────────────────────────────────────────────
  async listArticles(
    filter?: KbArticleFilter,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<KbArticleListItem>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (filter?.search?.trim()) params.append('search', filter.search.trim());
    if (filter?.status) params.append('status', filter.status);
    if (filter?.categoryId) params.append('categoryId', filter.categoryId);
    const { data } = await api.get<PaginatedResult<KbArticleListItem>>(
      `${BASE}/articles?${params.toString()}`
    );
    return data;
  },
  async getArticle(id: string): Promise<KbArticleDetail> {
    const { data } = await api.get<KbArticleDetail>(`${BASE}/articles/${id}`);
    return data;
  },
  async createArticle(input: CreateKbArticleInput): Promise<KbArticleDetail> {
    const { data } = await api.post<KbArticleDetail>(`${BASE}/articles`, input);
    return data;
  },
  async updateArticle(id: string, input: UpdateKbArticleInput): Promise<KbArticleDetail> {
    const { data } = await api.put<KbArticleDetail>(`${BASE}/articles/${id}`, input);
    return data;
  },
  async deleteArticle(id: string): Promise<void> {
    await api.delete(`${BASE}/articles/${id}`);
  },

  // ── FAQ ──────────────────────────────────────────────────────
  async listFaq(): Promise<FaqItem[]> {
    const { data } = await api.get<FaqItem[]>(`${BASE}/faq`);
    return data;
  },
  async createFaq(input: CreateFaqInput): Promise<FaqItem> {
    const { data } = await api.post<FaqItem>(`${BASE}/faq`, input);
    return data;
  },
  async updateFaq(id: string, input: UpdateFaqInput): Promise<FaqItem> {
    const { data } = await api.put<FaqItem>(`${BASE}/faq/${id}`, input);
    return data;
  },
  async deleteFaq(id: string): Promise<void> {
    await api.delete(`${BASE}/faq/${id}`);
  },
};

export default kbService;

/** Génère un slug URL-safe à partir d'un titre libre. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
