export type DependencyType = 'required' | 'recommended';

// Décimaux renvoyés sous forme de chaînes par l'API (Postgres `decimal`).
// Les champs de coût (purchasePriceHT, supplierId, supplierProductUrl) sont
// retirés des réponses par l'API staff et n'apparaissent donc jamais ici.
export interface Product {
  id: string;
  reference: string;
  name: string;
  description: string | null;
  category: string;
  brand: string | null;
  priceHT: string;
  tvaRate: string;
  imageUrl: string | null;
  isActive: boolean;
  stock: number | null;
  stockMin: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DependencyProductSummary {
  id: string;
  reference: string;
  name: string;
  category: string;
  brand: string | null;
  priceHT?: string;
  tvaRate?: string;
  imageUrl?: string | null;
}

export interface ProductDependency {
  id: string;
  type: DependencyType;
  description: string | null;
  coveredQuantity: number;
  requiredProduct: DependencyProductSummary;
}

export interface ProductDependent {
  id: string;
  type: DependencyType;
  product: DependencyProductSummary;
}

export interface ProductWithDependencies extends Product {
  dependencies: ProductDependency[];
  dependents: ProductDependent[];
}

export interface CreateProductInput {
  reference: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  priceHT: number;
  tvaRate?: number;
  imageUrl?: string;
  isActive?: boolean;
  stock?: number;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductFilter {
  category?: string;
  brand?: string;
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface CreateDependencyInput {
  requiredProductId: string;
  type?: DependencyType;
  description?: string;
  coveredQuantity?: number;
}

export interface UpdateDependencyInput {
  type?: DependencyType;
  description?: string;
  coveredQuantity?: number;
}

export interface ImportResult {
  message: string;
  imported: number;
  errors: string[];
}
