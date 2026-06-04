// Insert scraped Domadoo products into the catalog.
// - Upserts the "Domadoo" supplier
// - Upserts products by reference (purchasePriceHT = Domadoo HT, priceHT = +30%)
// - Wires productDependencies: every non-coordinator Zigbee device -> canonical
//   Zigbee coordinator; Matter-over-Thread device -> canonical Thread hub.
// Usage: bun run scripts/scrape-domadoo/seed-db.ts [--dry]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { and, eq } from 'drizzle-orm';
import { db } from '../../src/config/database';
import { suppliers } from '../../src/db/schema/suppliers';
import { products, productDependencies } from '../../src/db/schema/products';
import type { ParsedProduct } from './parse';

const DRY = process.argv.includes('--dry');
const IN = join(import.meta.dir, 'data', 'domadoo-products.json');
const COORDINATOR_COVERAGE = 50; // one coordinator handles ~50 devices

if (!existsSync(IN)) {
  console.error(`Checkpoint not found: ${IN}. Run run-full.ts first.`);
  process.exit(1);
}
const scraped = JSON.parse(readFileSync(IN, 'utf8')) as ParsedProduct[];
// Dedupe by reference (last wins) so the unique constraint never trips mid-batch.
const byRef = new Map<string, ParsedProduct>();
for (const p of scraped) byRef.set(p.reference, p);
const items = [...byRef.values()];
console.log(`Loaded ${scraped.length} scraped products (${items.length} unique references).`);

async function upsertSupplier(): Promise<string> {
  const existing = await db.select().from(suppliers).where(eq(suppliers.name, 'Domadoo')).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await db
    .insert(suppliers)
    .values({
      name: 'Domadoo',
      website: 'https://www.domadoo.fr',
      country: 'France',
      notes: 'Grossiste domotique. Catalogue importé automatiquement (Zigbee + Matter).',
    })
    .returning({ id: suppliers.id });
  if (!row) throw new Error('Failed to insert Domadoo supplier');
  return row.id;
}

/** Cheapest coordinator for a protocol; for matter prefer a Thread border router / hub. */
function pickCanonical(list: ParsedProduct[]): ParsedProduct | undefined {
  return [...list].sort((a, b) => a.purchasePriceHT - b.purchasePriceHT)[0];
}

if (DRY) {
  const zCoords = items.filter((p) => p.protocol === 'zigbee' && p.isCoordinator);
  const tHubs = items.filter(
    (p) => p.protocol === 'matter' && (p.isCoordinator || /thread|hub|border/i.test(p.name)),
  );
  console.log('\n[DRY RUN] no DB writes.');
  console.log(`Zigbee coordinators detected: ${zCoords.length}`);
  console.log(`  canonical -> ${pickCanonical(zCoords)?.name ?? '—'}`);
  console.log(`Matter Thread hubs detected: ${tHubs.length}`);
  console.log(`  canonical -> ${pickCanonical(tHubs)?.name ?? '—'}`);
  const deps = items.filter(
    (p) => (p.protocol === 'zigbee' && !p.isCoordinator) || (p.protocol === 'matter' && p.matterTransport === 'thread' && !p.isCoordinator),
  );
  console.log(`Products that would get a 'required' dependency: ${deps.length}`);
  process.exit(0);
}

const supplierId = await upsertSupplier();
console.log(`Supplier Domadoo: ${supplierId}`);

// Insert / update products, remember the resulting id per reference.
const idByRef = new Map<string, string>();
let inserted = 0;
for (const p of items) {
  const [row] = await db
    .insert(products)
    .values({
      reference: p.reference,
      name: p.name.slice(0, 255),
      description: p.description,
      category: p.category.slice(0, 100),
      brand: p.brand?.slice(0, 100) ?? null,
      priceHT: p.priceHT.toFixed(2),
      tvaRate: '20.00',
      imageUrl: p.imageUrl,
      purchasePriceHT: p.purchasePriceHT.toFixed(2),
      supplierId,
      supplierProductUrl: p.supplierProductUrl,
    })
    .onConflictDoUpdate({
      target: products.reference,
      set: {
        name: p.name.slice(0, 255),
        description: p.description,
        category: p.category.slice(0, 100),
        brand: p.brand?.slice(0, 100) ?? null,
        priceHT: p.priceHT.toFixed(2),
        imageUrl: p.imageUrl,
        purchasePriceHT: p.purchasePriceHT.toFixed(2),
        supplierId,
        supplierProductUrl: p.supplierProductUrl,
        updatedAt: new Date(),
      },
    })
    .returning({ id: products.id });
  if (!row) throw new Error(`Failed to upsert product ${p.reference}`);
  idByRef.set(p.reference, row.id);
  inserted++;
  if (inserted % 50 === 0) console.log(`  …${inserted}/${items.length} products upserted`);
}
console.log(`✓ ${inserted} products upserted.`);

// Canonical dependency targets.
const zCanonical = pickCanonical(items.filter((p) => p.protocol === 'zigbee' && p.isCoordinator));
const tCanonical = pickCanonical(
  items.filter((p) => p.protocol === 'matter' && (p.isCoordinator || /thread|hub|border/i.test(p.name))),
);
console.log(`Canonical Zigbee coordinator: ${zCanonical?.name ?? '— none found'}`);
console.log(`Canonical Matter Thread hub : ${tCanonical?.name ?? '— none found'}`);

async function ensureDependency(productRef: string, requiredRef: string, label: string): Promise<boolean> {
  const productId = idByRef.get(productRef);
  const requiredId = idByRef.get(requiredRef);
  if (!productId || !requiredId || productId === requiredId) return false;
  const dup = await db
    .select({ id: productDependencies.id })
    .from(productDependencies)
    .where(and(eq(productDependencies.productId, productId), eq(productDependencies.requiredProductId, requiredId)))
    .limit(1);
  if (dup[0]) return false;
  await db.insert(productDependencies).values({
    productId,
    requiredProductId: requiredId,
    type: 'required',
    description: label,
    coveredQuantity: COORDINATOR_COVERAGE,
  });
  return true;
}

let depCount = 0;
for (const p of items) {
  if (p.isCoordinator) continue;
  if (p.protocol === 'zigbee' && zCanonical) {
    if (await ensureDependency(p.reference, zCanonical.reference, 'Nécessite un coordinateur/passerelle Zigbee')) depCount++;
  } else if (p.protocol === 'matter' && p.matterTransport === 'thread' && tCanonical) {
    if (await ensureDependency(p.reference, tCanonical.reference, 'Nécessite un routeur de bordure Thread (Matter)')) depCount++;
  }
}
console.log(`✓ ${depCount} dependencies created.`);
console.log('\n✅ Seed terminé.');
process.exit(0);
