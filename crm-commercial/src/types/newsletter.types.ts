export type ChangelogCategory = 'nouveaute' | 'amelioration' | 'correction';
export type ReleaseStatus = 'brouillon' | 'publiee';
export type NewsletterCampaignStatus = 'brouillon' | 'envoi' | 'envoyee' | 'echec';
export type RecipientStatus =
  | 'en_attente'
  | 'envoye'
  | 'ouvert'
  | 'echec'
  | 'desinscrit';

export const changelogCategoryLabels: Record<ChangelogCategory, string> = {
  nouveaute: 'Nouveauté',
  amelioration: 'Amélioration',
  correction: 'Correction',
};

export const releaseStatusLabels: Record<ReleaseStatus, string> = {
  brouillon: 'Brouillon',
  publiee: 'Publiée',
};

export const campaignStatusLabels: Record<NewsletterCampaignStatus, string> = {
  brouillon: 'Brouillon',
  envoi: 'Envoi en cours',
  envoyee: 'Envoyée',
  echec: 'Échec',
};

export const recipientStatusLabels: Record<RecipientStatus, string> = {
  en_attente: 'En attente',
  envoye: 'Envoyé',
  ouvert: 'Ouvert',
  echec: 'Échec',
  desinscrit: 'Désinscrit',
};

export interface ChangelogEntry {
  id: string;
  releaseId: string;
  title: string;
  description: string;
  category: ChangelogCategory;
  isHighlight: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  version: string;
  title: string;
  description: string | null;
  status: ReleaseStatus;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseWithEntries extends Release {
  entries: ChangelogEntry[];
}

export interface EmailCampaign {
  id: string;
  subject: string;
  html: string;
  status: NewsletterCampaignStatus;
  selectedEntryIds: string[];
  totalRecipients: number;
  sentCount: number;
  openedCount: number;
  createdBy: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaignRecipient {
  id: string;
  campaignId: string;
  clientId: string | null;
  email: string;
  token: string;
  status: RecipientStatus;
  sentAt: string | null;
  openedAt: string | null;
  openCount: number;
  error: string | null;
  createdAt: string;
}

export interface CampaignStats {
  campaign: EmailCampaign;
  openRate: number;
  recipients: EmailCampaignRecipient[];
}

export interface SendResult {
  sent: number;
  failed: number;
  totalRecipients: number;
}

export interface CreateReleaseInput {
  version: string;
  title: string;
  description?: string;
}

export interface CreateEntryInput {
  title: string;
  description: string;
  category?: ChangelogCategory;
  isHighlight?: boolean;
}

export interface UpdateCampaignContentInput {
  subject: string;
  html: string;
}
