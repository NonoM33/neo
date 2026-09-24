export type SignatureStatus =
  | 'draft'
  | 'pending'
  | 'signed'
  | 'declined'
  | 'expired'
  | 'cancelled';

export type SignatureMode = 'remote' | 'direct';

export interface SignatureListItem {
  id: string;
  quoteId: string;
  quoteNumber: string | null;
  status: SignatureStatus;
  mode: SignatureMode;
  signerName: string;
  signerEmail: string;
  signingUrl: string | null;
  completedAt: string | null;
  createdAt: string;
  clientName: string | null;
  totalTTC: string | null;
}

export interface SignatureListResult {
  data: SignatureListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SignatureListFilter {
  status?: SignatureStatus;
  mode?: SignatureMode;
  page?: number;
  pageSize?: number;
}
