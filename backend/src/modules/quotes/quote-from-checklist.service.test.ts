import { describe, expect, it } from 'bun:test';
import {
  resolveChecklistLine,
  type ChecklistLineItem,
} from './quote-from-checklist.service';
import type { Product } from '../../db/schema';

function makeProduct(overrides: Partial<Product>): Product {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    reference: 'REF',
    name: 'Produit',
    description: null,
    category: 'eclairage',
    brand: null,
    priceHT: '100.00',
    tvaRate: '20.00',
    imageUrl: null,
    isActive: true,
    stock: null,
    stockMin: null,
    purchasePriceHT: null,
    supplierId: null,
    supplierProductUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function indexes(catalogue: Product[]): {
  byId: Map<string, Product>;
  byCategory: Map<string, Product[]>;
} {
  const byId = new Map<string, Product>();
  const byCategory = new Map<string, Product[]>();
  for (const p of catalogue) {
    byId.set(p.id, p);
    const key = p.category.toLowerCase();
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key)!.push(p);
  }
  return { byId, byCategory };
}

describe('resolveChecklistLine', () => {
  it('uses an explicitly chosen product verbatim with the item quantity', () => {
    const chosen = makeProduct({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Plafonnier connecté',
      priceHT: '149.90',
      tvaRate: '10.00',
    });
    const decoy = makeProduct({
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Plafonnier connecté Wifi premium',
    });
    const catalogue = [chosen, decoy];
    const { byId, byCategory } = indexes(catalogue);

    const item: ChecklistLineItem = {
      id: 'c1',
      label: 'Plafonnier connecté Wifi premium', // would fuzzy-match the decoy
      category: 'eclairage',
      productId: chosen.id,
      quantity: 3,
    };

    const { line, match } = resolveChecklistLine(item, catalogue, byId, byCategory);

    expect(line.productId).toBe(chosen.id);
    expect(line.description).toBe('Plafonnier connecté');
    expect(line.quantity).toBe(3);
    expect(line.unitPriceHT).toBe(149.9);
    expect(line.tvaRate).toBe(10);
    expect(match.matchedProductId).toBe(chosen.id);
  });

  it('falls back to fuzzy matching when the productId is not in the catalogue', () => {
    const target = makeProduct({
      id: '33333333-3333-3333-3333-333333333333',
      name: 'Volet roulant connecté',
      category: 'ouvrants',
    });
    const catalogue = [target];
    const { byId, byCategory } = indexes(catalogue);

    const item: ChecklistLineItem = {
      id: 'c2',
      label: 'Volet roulant',
      category: 'ouvrants',
      productId: 'deadbeef-dead-dead-dead-deaddeaddead', // absent
      quantity: 2,
    };

    const { line, match } = resolveChecklistLine(item, catalogue, byId, byCategory);

    expect(line.productId).toBe(target.id);
    expect(line.quantity).toBe(2);
    expect(match.matchedProductId).toBe(target.id);
  });

  it('emits a manual line honouring the quantity when nothing matches', () => {
    const catalogue: Product[] = [];
    const { byId, byCategory } = indexes(catalogue);

    const item: ChecklistLineItem = {
      id: 'c3',
      label: 'Borne de recharge spéciale',
      category: 'autre',
      quantity: 4,
    };

    const { line, match } = resolveChecklistLine(item, catalogue, byId, byCategory);

    expect(line.productId).toBeUndefined();
    expect(line.description).toBe('[À compléter] Borne de recharge spéciale');
    expect(line.quantity).toBe(4);
    expect(line.unitPriceHT).toBe(0);
    expect(line.tvaRate).toBe(20);
    expect(match.matchedProductId).toBeNull();
  });

  it('defaults quantity to 1 when not provided or invalid', () => {
    const prod = makeProduct({
      id: '44444444-4444-4444-4444-444444444444',
      name: 'Détecteur de fumée connecté',
      category: 'securite',
    });
    const catalogue = [prod];
    const { byId, byCategory } = indexes(catalogue);

    const item: ChecklistLineItem = {
      id: 'c4',
      label: 'Détecteur de fumée',
      category: 'securite',
      productId: prod.id,
      quantity: 0, // invalid → defaults to 1
    };

    const { line } = resolveChecklistLine(item, catalogue, byId, byCategory);
    expect(line.quantity).toBe(1);
  });
});
