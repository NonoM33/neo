export type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'annulee';

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  annulee: 'Annulée',
};

// Transitions autorisées (répliquées du backend pour piloter l'UI).
export const invoiceStatusTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
  brouillon: ['envoyee', 'annulee'],
  envoyee: ['payee', 'annulee'],
  payee: [],
  annulee: [],
};

export interface InvoiceProjectRef {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export interface InvoiceClientRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
}

export interface InvoiceListItem {
  id: string;
  number: string;
  status: InvoiceStatus;
  totalHT: string;
  totalTTC: string;
  dueDate: string | null;
  createdAt: string;
  project: Pick<InvoiceProjectRef, 'id' | 'name'>;
  client: Pick<InvoiceClientRef, 'firstName' | 'lastName'>;
  isOverdue: boolean | null;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  reference: string | null;
  description: string;
  quantity: number;
  unitPriceHT: string;
  tvaRate: string;
  totalHT: string;
  sortOrder: number;
}

export interface InvoiceDetail {
  id: string;
  number: string;
  orderId: string | null;
  projectId: string;
  status: InvoiceStatus;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  dueDate: string | null;
  paymentTerms: string | null;
  paymentMethod: string | null;
  legalMentions: string | null;
  pdfUrl: string | null;
  notes: string | null;
  sentAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: InvoiceProjectRef;
  client: InvoiceClientRef;
  lines: InvoiceLine[];
  isOverdue: boolean | null;
}

export interface InvoiceFilter {
  status?: InvoiceStatus;
  projectId?: string;
  overdue?: boolean;
}
