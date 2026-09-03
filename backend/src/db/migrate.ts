import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../config/database';
import { isAlreadyPresentError, pendingMigrations, splitStatements, type JournalEntry } from './migrate.lib';

// Lancé au démarrage de chaque conteneur (voir Dockerfile). Doit être
// idempotent et tolérant : les bases existantes ont été créées avec
// `drizzle-kit push`, donc une partie des migrations est déjà en place sans
// être enregistrée dans le journal. Le migrateur standard plantait dessus
// (« type user_role already exists ») et bloquait tout déploiement.
const MIGRATIONS_DIR = './src/db/migrations';

async function ensureJournalTable(): Promise<void> {
  // Même table que le migrateur Drizzle (drizzle-orm/postgres-js/migrator).
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
}

async function runMigrations(): Promise<void> {
  await ensureJournalTable();

  const journal = JSON.parse(readFileSync(`${MIGRATIONS_DIR}/meta/_journal.json`, 'utf8')) as { entries: JournalEntry[] };
  const appliedResult: any = await db.execute(sql`SELECT hash, created_at FROM "drizzle"."__drizzle_migrations"`);
  const applied = (appliedResult.rows ?? appliedResult) as { hash: string; created_at: string }[];
  const pending = pendingMigrations(journal.entries, applied);

  if (pending.length === 0) {
    console.log('   Aucune migration en attente');
    return;
  }

  for (const entry of pending) {
    const file = readFileSync(`${MIGRATIONS_DIR}/${entry.tag}.sql`, 'utf8');
    const statements = splitStatements(file);
    let executed = 0;
    let skipped = 0;

    for (const statement of statements) {
      try {
        await db.execute(sql.raw(statement));
        executed++;
      } catch (error) {
        if (isAlreadyPresentError(error)) {
          skipped++;
          continue;
        }
        console.error(`❌ Migration ${entry.tag} : échec sur\n${statement.slice(0, 300)}`);
        throw error;
      }
    }

    const hash = createHash('sha256').update(file).digest('hex');
    await db.execute(sql`INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES (${hash}, ${entry.when})`);
    console.log(`   ✓ ${entry.tag} — ${executed} instruction(s) appliquée(s), ${skipped} déjà en place`);
  }
}

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
await runMigrations();
console.log('✅ Migrations complete');

console.log('🔧 Backfill couverture des dépendances...');
await backfillDependencyCoverage();
console.log('✅ Backfill terminé');

process.exit(0);
