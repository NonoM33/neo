export type OrderStatus =
  | 'en_attente'
  | 'confirmee'
  | 'payee'
  | 'en_preparation'
  | 'expediee'
  | 'livree'
  | 'annulee';

export const orderStatusLabels: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  payee: 'Payée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};

// Transitions de statut autorisées (répliquées du backend pour piloter l'UI).
export const orderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  en_attente: ['confirmee', 'annulee'],
  confirmee: ['payee', 'annulee'],
  payee: ['en_preparation', 'annulee'],
  en_preparation: ['expediee', 'annulee'],
  expediee: ['livree'],
  livree: [],
  annulee: [],
};

export interface OrderProjectRef {
  id: string;
  name: string;
}

export interface OrderClientRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

export interface OrderListItem {
  id: string;
  number: string;
  status: OrderStatus;
  totalHT: string;
  totalTTC: string;
  createdAt: string;
  project: OrderProjectRef;
  client: Pick<OrderClientRef, 'firstName' | 'lastName'>;
}

export interface OrderLine {
  id: string;
  productId: string | null;
  reference: string | null;
  description: string;
  quantity: number;
  unitPriceHT: string;
  unitCostHT: string | null;
  tvaRate: string;
  totalHT: string;
  sortOrder: number | null;
  product: { id: string; reference: string; name: string } | null;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  notes: string | null;
  changedAt: string;
}

export interface OrderDetail {
  id: string;
  number: string;
  quoteId: string | null;
  projectId: string;
  status: OrderStatus;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  totalCostHT: string;
  totalMarginHT: string;
  discount: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingPostalCode: string | null;
  shippingNotes: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  notes: string | null;
  internalNotes: string | null;
  confirmedAt: string | null;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: OrderProjectRef;
  client: OrderClientRef;
  lines: OrderLine[];
  history: OrderStatusHistoryEntry[];
}

export interface OrderFilter {
  status?: OrderStatus;
  projectId?: string;
}
