export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  deliveryLeadDays: number | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface SupplierProduct {
  id: string;
  reference: string;
  name: string;
  category: string;
  priceHT: string;
  purchasePriceHT: string | null;
}

export interface SupplierDetail {
  supplier: Supplier;
  products: SupplierProduct[];
}

export interface SupplierInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentTerms?: string | null;
  deliveryLeadDays?: number | null;
  notes?: string | null;
  isActive?: boolean;
}
