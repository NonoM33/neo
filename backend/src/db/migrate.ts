import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from '../config/database';

// Capacité réelle d'un produit requis : combien d'unités dépendantes
// couvre UNE unité du produit requis. Sans ça, 3 ampoules Hue
// réclamaient 3 bridges au lieu d'1. Le seed ne se rejoue pas sur une
// base existante (échec sur clé unique avalé par `|| true`), donc on
// corrige ici, de façon idempotente, à chaque déploiement.
const REQUIRED_COVERAGE: Record<string, number> = {
  'PHI-HUE-BRIDGE': 50,
  'AJAX-HUB2': 100,
  'TADO-STARTER': 50,
};

async function backfillDependencyCoverage(): Promise<void> {
  for (const [reference, coverage] of Object.entries(REQUIRED_COVERAGE)) {
    await db.execute(sql`
      UPDATE product_dependencies
      SET covered_quantity = ${coverage}
      WHERE type = 'required'
        AND covered_quantity = 1
        AND required_product_id = (
          SELECT id FROM products WHERE reference = ${reference}
        )
    `);
  }
}

console.log('🔄 Running migrations...');
await migrate(db, { migrationsFolder: './src/db/migrations' });
console.log('✅ Migrations complete');

console.log('🔧 Backfill couverture des dépendances...');
await backfillDependencyCoverage();
console.log('✅ Backfill terminé');

process.exit(0);
