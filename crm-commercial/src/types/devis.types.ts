export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
};

export interface QuoteClientRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface QuoteProjectRef {
  id: string;
  name: string;
}

export interface QuoteListItem {
  id: string;
  number: string;
  status: QuoteStatus;
  totalTTC: string;
  createdAt: string;
  sentAt: string | null;
  validUntil: string | null;
  project: QuoteProjectRef;
  client: QuoteClientRef;
}

export interface QuoteLine {
  id: string;
  description: string;
  quantity: number | null;
  unitPriceHT: string | null;
  tvaRate: string | null;
  totalHT: string | null;
  sortOrder: number | null;
  clientOwned: boolean | null;
  clientOwnedPhotoUrl: string | null;
  product: { id: string; reference: string; name: string } | null;
}

export interface QuoteDetail {
  id: string;
  projectId: string;
  number: string;
  status: QuoteStatus;
  validUntil: string | null;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  discount: string | null;
  notes: string | null;
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: QuoteLine[];
}

export interface QuoteFilter {
  search?: string;
  status?: QuoteStatus;
}

export interface SendQuoteInput {
  customMessage?: string;
  salesPersonName?: string;
}
