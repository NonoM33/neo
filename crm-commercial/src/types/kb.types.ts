export type KbStatus = 'brouillon' | 'publie' | 'archive';

export const kbStatusLabels: Record<KbStatus, string> = {
  brouillon: 'Brouillon',
  publie: 'Publié',
  archive: 'Archivé',
};

export interface KbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface KbCategoryRef {
  id: string | null;
  name: string | null;
  slug: string | null;
}

export interface KbAuthorRef {
  id: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface KbArticleListItem {
  id: string;
  title: string;
  slug: string;
  categoryId: string | null;
  excerpt: string | null;
  tags: string[] | null;
  status: KbStatus;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  category: KbCategoryRef | null;
  author: KbAuthorRef | null;
}

export interface KbArticleDetail extends KbArticleListItem {
  content: string;
}

export interface KbArticleFilter {
  status?: KbStatus;
  categoryId?: string;
  search?: string;
}

export interface CreateKbCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  sortOrder?: number;
}

export type UpdateKbCategoryInput = Partial<CreateKbCategoryInput>;

export interface CreateKbArticleInput {
  title: string;
  slug: string;
  categoryId?: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  status?: KbStatus;
}

export interface UpdateKbArticleInput {
  title?: string;
  slug?: string;
  categoryId?: string | null;
  content?: string;
  excerpt?: string;
  tags?: string[];
  status?: KbStatus;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  categoryId: string | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFaqInput {
  question: string;
  answer: string;
  categoryId?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export type UpdateFaqInput = Partial<CreateFaqInput>;
