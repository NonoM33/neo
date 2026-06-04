// Full crawl of Domadoo Zigbee (206) + Matter (211) categories.
// Writes a resumable checkpoint so an interrupted/blocked run can continue.
// Usage: bun run scripts/scrape-domadoo/run-full.ts [--limit=N]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBrowser, crawlCategory, enrichProduct, config } from './scrape';
import type { ParsedProduct, Protocol } from './parse';

const OUT = join(import.meta.dir, 'data', 'domadoo-products.json');
const CATEGORIES: { path: string; protocol: Protocol }[] = [
  { path: '206-produits-zigbee', protocol: 'zigbee' },
  { path: '211-produits-matter', protocol: 'matter' },
];

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;

function loadCheckpoint(): Map<string, ParsedProduct> {
  if (!existsSync(OUT)) return new Map();
  const arr = JSON.parse(readFileSync(OUT, 'utf8')) as ParsedProduct[];
  return new Map(arr.map((p) => [p.supplierProductUrl, p]));
}

function save(map: Map<string, ParsedProduct>): void {
  writeFileSync(OUT, JSON.stringify([...map.values()], null, 2));
}

const done = loadCheckpoint();
console.log(`Checkpoint: ${done.size} products already scraped.`);

const { browser, page } = await createBrowser();
let processed = 0;
try {
  for (const { path, protocol } of CATEGORIES) {
    console.log(`\n=== Crawling ${path} (${protocol}) ===`);
    const cards = await crawlCategory(page, path);
    console.log(`Collected ${cards.length} cards for ${protocol}.`);

    for (const card of cards) {
      if (processed >= LIMIT) break;
      if (done.has(card.href)) continue;
      const product = await enrichProduct(page, card, protocol);
      if (product) {
        done.set(card.href, product);
        processed++;
        if (processed % 10 === 0) {
          save(done);
          console.log(`  …${processed} new enriched (total ${done.size}) — checkpoint saved`);
        }
      } else {
        console.warn(`  !! parse failed: ${card.href}`);
      }
      await config.sleep(config.jitter(900, 2200)); // polite rate limit
    }
    save(done);
    if (processed >= LIMIT) break;
  }
} finally {
  save(done);
  await browser.close();
}

const all = [...done.values()];
const zigbee = all.filter((p) => p.protocol === 'zigbee');
const matter = all.filter((p) => p.protocol === 'matter');
const coordinators = all.filter((p) => p.isCoordinator);
console.log(`\n✅ Done. Total ${all.length} products (zigbee ${zigbee.length}, matter ${matter.length}, coordinators ${coordinators.length}).`);
console.log(`Saved to ${OUT}`);
