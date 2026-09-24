import api from './api';
import type { Client, CreateClientInput } from '../types/client.types';
import type { Project } from '../types/project.types';
import type { QuoteDetail } from '../types/devis.types';
import type { CloudInstance } from '../types/cloud.types';
import type { Product } from '../types/product.types';
import type { ParcoursSignMode } from '../types/parcours.types';

/** Réponse brute d'une pièce côté API (rooms module). */
export interface PieceResponse {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  linkedRoomIds?: string[];
  checklistItems?: ChecklistItemResponse[];
}

export interface ChecklistItemResponse {
  id: string;
  productId?: string | null;
  category: string;
  label: string;
  quantity?: number;
  checked?: boolean;
}

export interface SignatureResponse {
  id: string;
  signingUrl?: string;
  sentTo?: string;
  status?: string;
}

export interface InvoiceResponse {
  id: string;
  number: string;
  totalTTC?: string;
}

interface ListWrapper<T> {
  data: T[];
}

interface CreateProjectBody {
  clientId: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  surface?: number;
}

interface CreateInvoiceBody {
  projectId: string;
  notes: string;
  lines: { description: string; quantity: number; unitPriceHT: number; tvaRate: number }[];
}

interface ProvisionBody {
  clientId: string;
  memoryLimitMb: number;
  domain?: string;
}

/**
 * Service auto-suffisant du parcours guidé : enveloppe directement les endpoints
 * `/api` déjà testés (clients, projets, pièces, checklist, devis, signature,
 * factures, cloud-instances) pour piloter le cycle de vie complet d'un projet.
 */
export const parcoursService = {
  async searchClients(query: string): Promise<Client[]> {
    const res = await api.get<ListWrapper<Client>>('/api/projets/clients', {
      params: { search: query, limit: 6 },
    });
    return res.data.data;
  },

  async getClient(id: string): Promise<Client> {
    const res = await api.get<Client>(`/api/projets/clients/${id}`);
    return res.data;
  },

  async createClient(input: CreateClientInput): Promise<Client> {
    const res = await api.post<Client>('/api/projets/clients', input);
    return res.data;
  },

  async getProject(id: string): Promise<Project> {
    const res = await api.get<Project>(`/api/projets/${id}`);
    return res.data;
  },

  async createProject(body: CreateProjectBody): Promise<Project> {
    const res = await api.post<Project>('/api/projets', body);
    return res.data;
  },

  async updateProject(id: string, body: Partial<CreateProjectBody>): Promise<Project> {
    const res = await api.put<Project>(`/api/projets/${id}`, body);
    return res.data;
  },

  async listPieces(projectId: string): Promise<PieceResponse[]> {
    const res = await api.get<PieceResponse[]>(`/api/projets/${projectId}/pieces`);
    return res.data;
  },

  async createPiece(projectId: string, body: { name: string; type: string }): Promise<PieceResponse> {
    const res = await api.post<PieceResponse>(`/api/projets/${projectId}/pieces`, body);
    return res.data;
  },

  async updatePiece(
    id: string,
    body: { name?: string; icon?: string; linkedRoomIds?: string[] }
  ): Promise<PieceResponse> {
    const res = await api.put<PieceResponse>(`/api/pieces/${id}`, body);
    return res.data;
  },

  async deletePiece(id: string): Promise<void> {
    await api.delete(`/api/pieces/${id}`);
  },

  async addChecklistItem(
    pieceId: string,
    body: { productId: string; category: string; label: string; quantity: number; checked: boolean }
  ): Promise<ChecklistItemResponse> {
    const res = await api.post<ChecklistItemResponse>(`/api/pieces/${pieceId}/checklist`, body);
    return res.data;
  },

  async updateChecklistItem(id: string, body: { quantity: number }): Promise<void> {
    await api.put(`/api/checklist/${id}`, body);
  },

  async deleteChecklistItem(id: string): Promise<void> {
    await api.delete(`/api/checklist/${id}`);
  },

  async getCatalog(): Promise<Product[]> {
    const res = await api.get<ListWrapper<Product>>('/api/produits', {
      params: { isActive: true, limit: 500 },
    });
    return res.data.data;
  },

  async generateQuote(projectId: string, roomIds: string[]): Promise<string> {
    const res = await api.post<{ quoteId: string }>(
      `/api/projets/${projectId}/devis/from-checklist`,
      { roomIds, validityDays: 30 }
    );
    return res.data.quoteId;
  },

  async getQuote(id: string): Promise<QuoteDetail> {
    const res = await api.get<QuoteDetail>(`/api/devis/${id}`);
    return res.data;
  },

  async createSignature(quoteId: string, mode: ParcoursSignMode): Promise<SignatureResponse> {
    const res = await api.post<SignatureResponse>(`/api/devis/${quoteId}/signature`, { mode });
    return res.data;
  },

  async refreshSignature(quoteId: string): Promise<{ status: string }> {
    const res = await api.get<{ status: string }>(`/api/devis/${quoteId}/signature/refresh`);
    return res.data;
  },

  async cancelSignature(quoteId: string): Promise<void> {
    await api.delete(`/api/devis/${quoteId}/signature`);
  },

  async createInvoice(body: CreateInvoiceBody): Promise<InvoiceResponse> {
    const res = await api.post<InvoiceResponse>('/api/factures', body);
    return res.data;
  },

  async provisionInstance(body: ProvisionBody): Promise<CloudInstance> {
    const res = await api.post<CloudInstance>('/api/cloud-instances', body);
    return res.data;
  },

  async startInstance(id: string): Promise<void> {
    await api.post(`/api/cloud-instances/${id}/start`);
  },
};

export default parcoursService;
