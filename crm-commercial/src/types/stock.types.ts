export type StockMovementType =
  | 'entree'
  | 'sortie'
  | 'reservation'
  | 'liberation'
  | 'correction'
  | 'retour';

export const stockMovementTypeLabels: Record<StockMovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  reservation: 'Réservation',
  liberation: 'Libération',
  correction: 'Correction',
  retour: 'Retour',
};

export interface StockProductRef {
  id: string;
  reference: string;
  name: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  orderId: string | null;
  supplierOrderId: string | null;
  reason: string | null;
  createdAt: string;
  product: StockProductRef | null;
}

export interface StockAlert {
  id: string;
  reference: string;
  name: string;
  category: string | null;
  stock: number | null;
  stockMin: number | null;
  supplierId: string | null;
  supplierName: string | null;
}

export interface StockDashboardMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  createdAt: string;
  productName: string | null;
  productReference: string | null;
}

export interface StockDashboardByType {
  type: StockMovementType;
  count: number;
  totalQuantity: number;
}

export interface StockDashboard {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentMovements: StockDashboardMovement[];
  movementsByType: StockDashboardByType[];
}

export interface StockMovementFilter {
  productId?: string;
  type?: StockMovementType;
}

export interface CreateStockMovementInput {
  productId: string;
  type: StockMovementType;
  quantity: number;
  reason?: string;
}
