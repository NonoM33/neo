export type PromoDiscountType = 'pourcentage' | 'montant_fixe';

export type PopupFrequency = 'toujours' | 'une_fois_session' | 'une_fois_jour';

export type CampaignAudience = 'clients' | 'leads' | 'custom';

export type CampaignStatus = 'brouillon' | 'programmee' | 'envoi' | 'envoyee' | 'echec';

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discountType: PromoDiscountType;
  discountValue: string;
  minOrderHT: string | null;
  maxUses: number | null;
  usedCount: number;
  perClientOnce: boolean;
  active: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeStats {
  usedCount: number;
  maxUses: number | null;
  totalDiscount: number;
  redemptions: number;
}

export interface PromoCodePayload {
  code: string;
  description?: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  minOrderHT?: number | null;
  maxUses?: number | null;
  perClientOnce: boolean;
  active: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
}

export interface Banner {
  id: string;
  message: string;
  linkUrl: string | null;
  linkLabel: string | null;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface BannerPayload {
  message: string;
  linkUrl?: string | null;
  linkLabel?: string | null;
  bgColor: string;
  textColor: string;
  dismissible: boolean;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  priority: number;
}

export interface Popup {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  promoCodeId: string | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  delaySeconds: number;
  frequency: PopupFrequency;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface PopupPayload {
  title: string;
  body: string;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  promoCodeId?: string | null;
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  delaySeconds: number;
  frequency: PopupFrequency;
  priority: number;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  subject: string;
  html: string;
  audience: CampaignAudience;
  customEmails: string[];
  promoCodeId: string | null;
  status: CampaignStatus;
  totalRecipients: number;
  sentCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignPayload {
  name: string;
  subject: string;
  html: string;
  audience: CampaignAudience;
  customEmails: string[];
  promoCodeId?: string | null;
  scheduledAt?: string | null;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  clientId: string | null;
  email: string;
  status: string;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
}
