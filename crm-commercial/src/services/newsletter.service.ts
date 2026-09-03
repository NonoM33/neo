import api from './api';
import type {
  CampaignStats,
  CreateEntryInput,
  CreateReleaseInput,
  EmailCampaign,
  ChangelogEntry,
  Release,
  ReleaseWithEntries,
  SendResult,
  UpdateCampaignContentInput,
} from '../types/newsletter.types';

const BASE = '/api/newsletter';

export const newsletterService = {
  // ── Releases / changelog ───────────────────────────────────────
  async listReleases(): Promise<ReleaseWithEntries[]> {
    const { data } = await api.get<ReleaseWithEntries[]>(`${BASE}/releases`);
    return data;
  },
  async listPublishedReleases(): Promise<ReleaseWithEntries[]> {
    const { data } = await api.get<ReleaseWithEntries[]>(`${BASE}/releases/published`);
    return data;
  },
  async createRelease(input: CreateReleaseInput): Promise<Release> {
    const { data } = await api.post<Release>(`${BASE}/releases`, input);
    return data;
  },
  async createEntry(releaseId: string, input: CreateEntryInput): Promise<ChangelogEntry> {
    const { data } = await api.post<ChangelogEntry>(
      `${BASE}/releases/${releaseId}/entries`,
      input
    );
    return data;
  },
  async publishRelease(releaseId: string): Promise<void> {
    await api.post(`${BASE}/releases/${releaseId}/publish`, {});
  },
  async deleteRelease(releaseId: string): Promise<void> {
    await api.delete(`${BASE}/releases/${releaseId}`);
  },
  async deleteEntry(entryId: string): Promise<void> {
    await api.delete(`${BASE}/entries/${entryId}`);
  },

  // ── Campagnes ──────────────────────────────────────────────────
  async getEligibleCount(): Promise<number> {
    const { data } = await api.get<{ count: number }>(`${BASE}/eligible-count`);
    return data.count;
  },
  async listCampaigns(): Promise<EmailCampaign[]> {
    const { data } = await api.get<EmailCampaign[]>(`${BASE}/campaigns`);
    return data;
  },
  async createCampaignDraft(selectedEntryIds: string[]): Promise<EmailCampaign> {
    const { data } = await api.post<EmailCampaign>(`${BASE}/campaigns/preview`, {
      selectedEntryIds,
    });
    return data;
  },
  async getCampaign(id: string): Promise<CampaignStats> {
    const { data } = await api.get<CampaignStats>(`${BASE}/campaigns/${id}`);
    return data;
  },
  async updateCampaign(id: string, input: UpdateCampaignContentInput): Promise<CampaignStats> {
    const { data } = await api.put<CampaignStats>(`${BASE}/campaigns/${id}`, input);
    return data;
  },
  async sendCampaign(id: string): Promise<SendResult> {
    const { data } = await api.post<SendResult>(`${BASE}/campaigns/${id}/send`, {});
    return data;
  },
};

export default newsletterService;
