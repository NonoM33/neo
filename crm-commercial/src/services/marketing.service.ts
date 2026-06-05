import api from './api';
import type {
  Banner,
  BannerPayload,
  CampaignPayload,
  CampaignRecipient,
  MarketingCampaign,
  Popup,
  PopupPayload,
  PromoCode,
  PromoCodePayload,
  PromoCodeStats,
} from '../types/marketing.types';

const BASE = '/api/marketing';

export const marketingService = {
  // ── Codes promo ──────────────────────────────────────────────
  async listPromoCodes(): Promise<PromoCode[]> {
    const { data } = await api.get<PromoCode[]>(`${BASE}/promo-codes`);
    return data;
  },
  async getPromoCodeStats(id: string): Promise<PromoCodeStats> {
    const { data } = await api.get<PromoCodeStats>(`${BASE}/promo-codes/${id}/stats`);
    return data;
  },
  async createPromoCode(payload: PromoCodePayload): Promise<PromoCode> {
    const { data } = await api.post<PromoCode>(`${BASE}/promo-codes`, payload);
    return data;
  },
  async updatePromoCode(id: string, payload: Partial<PromoCodePayload>): Promise<PromoCode> {
    const { data } = await api.put<PromoCode>(`${BASE}/promo-codes/${id}`, payload);
    return data;
  },
  async deletePromoCode(id: string): Promise<void> {
    await api.delete(`${BASE}/promo-codes/${id}`);
  },

  // ── Bannières ────────────────────────────────────────────────
  async listBanners(): Promise<Banner[]> {
    const { data } = await api.get<Banner[]>(`${BASE}/banners`);
    return data;
  },
  async createBanner(payload: BannerPayload): Promise<Banner> {
    const { data } = await api.post<Banner>(`${BASE}/banners`, payload);
    return data;
  },
  async updateBanner(id: string, payload: BannerPayload): Promise<Banner> {
    const { data } = await api.put<Banner>(`${BASE}/banners/${id}`, payload);
    return data;
  },
  async deleteBanner(id: string): Promise<void> {
    await api.delete(`${BASE}/banners/${id}`);
  },

  // ── Pop-ups ──────────────────────────────────────────────────
  async listPopups(): Promise<Popup[]> {
    const { data } = await api.get<Popup[]>(`${BASE}/popups`);
    return data;
  },
  async createPopup(payload: PopupPayload): Promise<Popup> {
    const { data } = await api.post<Popup>(`${BASE}/popups`, payload);
    return data;
  },
  async updatePopup(id: string, payload: PopupPayload): Promise<Popup> {
    const { data } = await api.put<Popup>(`${BASE}/popups/${id}`, payload);
    return data;
  },
  async deletePopup(id: string): Promise<void> {
    await api.delete(`${BASE}/popups/${id}`);
  },

  // ── Campagnes email ──────────────────────────────────────────
  async listCampaigns(): Promise<MarketingCampaign[]> {
    const { data } = await api.get<MarketingCampaign[]>(`${BASE}/campaigns`);
    return data;
  },
  async getCampaignRecipients(id: string): Promise<CampaignRecipient[]> {
    const { data } = await api.get<CampaignRecipient[]>(`${BASE}/campaigns/${id}/recipients`);
    return data;
  },
  async createCampaign(payload: CampaignPayload): Promise<MarketingCampaign> {
    const { data } = await api.post<MarketingCampaign>(`${BASE}/campaigns`, payload);
    return data;
  },
  async updateCampaign(id: string, payload: CampaignPayload): Promise<MarketingCampaign> {
    const { data } = await api.put<MarketingCampaign>(`${BASE}/campaigns/${id}`, payload);
    return data;
  },
  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`${BASE}/campaigns/${id}`);
  },
  async sendCampaign(id: string): Promise<MarketingCampaign> {
    const { data } = await api.post<MarketingCampaign>(`${BASE}/campaigns/${id}/send`, {});
    return data;
  },
};

export default marketingService;
