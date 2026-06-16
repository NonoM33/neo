import { and, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '../../config/database';
import { suppliers, products } from '../../db/schema';
import { NotFoundError } from '../../lib/errors';
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
} from './suppliers.schema';

export interface SupplierListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
}

export async function listSuppliers(search?: string): Promise<SupplierListItem[]> {
  const conditions: SQL[] = [];
  if (search) {
    conditions.push(
      or(ilike(suppliers.name, `%${search}%`), ilike(suppliers.email, `%${search}%`))!
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      email: suppliers.email,
      phone: suppliers.phone,
      website: suppliers.website,
      city: suppliers.city,
      isActive: suppliers.isActive,
      createdAt: suppliers.createdAt,
      productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE products.supplier_id = suppliers.id)::int`,
    })
    .from(suppliers)
    .where(where)
    .orderBy(suppliers.name);
}

export async function getSupplierById(id: string) {
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  if (!supplier) {
    throw new NotFoundError('Fournisseur introuvable');
  }

  const supplierProducts = await db
    .select({
      id: products.id,
      reference: products.reference,
      name: products.name,
      category: products.category,
      priceHT: products.priceHT,
      purchasePriceHT: products.purchasePriceHT,
    })
    .from(products)
    .where(eq(products.supplierId, id))
    .orderBy(products.name);

  return { supplier, products: supplierProducts };
}

export async function createSupplier(input: CreateSupplierInput) {
  const [supplier] = await db.insert(suppliers).values(input).returning();
  return supplier;
}

export async function updateSupplier(id: string, input: UpdateSupplierInput) {
  const [supplier] = await db
    .update(suppliers)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(suppliers.id, id))
    .returning();
  if (!supplier) {
    throw new NotFoundError('Fournisseur introuvable');
  }
  return supplier;
}

export async function deleteSupplier(id: string): Promise<void> {
  const result = await db.delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
  if (result.length === 0) {
    throw new NotFoundError('Fournisseur introuvable');
  }
}
