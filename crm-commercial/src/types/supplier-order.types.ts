export type SupplierOrderStatus =
  | 'brouillon'
  | 'envoyee'
  | 'confirmee'
  | 'recue'
  | 'annulee';

export const supplierOrderStatusLabels: Record<SupplierOrderStatus, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  confirmee: 'Confirmée',
  recue: 'Reçue',
  annulee: 'Annulée',
};

// Transitions autorisées (répliquées du backend pour piloter l'UI).
export const supplierOrderStatusTransitions: Record<
  SupplierOrderStatus,
  SupplierOrderStatus[]
> = {
  brouillon: ['envoyee', 'annulee'],
  envoyee: ['confirmee', 'annulee'],
  confirmee: ['recue', 'annulee'],
  recue: [],
  annulee: [],
};

export interface SupplierRef {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
}

export interface SupplierOrderListItem {
  id: string;
  number: string;
  status: SupplierOrderStatus;
  totalHT: string;
  totalTTC: string;
  expectedDeliveryDate: string | null;
  createdAt: string;
  supplier: Pick<SupplierRef, 'id' | 'name'>;
}

export interface SupplierOrderLine {
  id: string;
  productId: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPriceHT: string;
  totalHT: string;
  notes: string | null;
  product: {
    id: string;
    reference: string;
    name: string;
    stock: number | null;
    stockMin: number | null;
  };
}

export interface SupplierOrderDetail {
  id: string;
  number: string;
  status: SupplierOrderStatus;
  totalHT: string;
  totalTVA: string;
  totalTTC: string;
  expectedDeliveryDate: string | null;
  supplierReference: string | null;
  notes: string | null;
  internalNotes: string | null;
  sentAt: string | null;
  confirmedAt: string | null;
  receivedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: SupplierRef;
  lines: SupplierOrderLine[];
}

export interface SupplierOrderFilter {
  status?: SupplierOrderStatus;
  supplierId?: string;
}

export interface ReceptionLineInput {
  lineId: string;
  quantityReceived: number;
}
