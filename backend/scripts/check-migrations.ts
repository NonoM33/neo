/**
 * Verifie qu'une base est prete a recevoir les migrations.
 *
 * Le piege qui a coute du temps : une base creee par `db:push` a bien le bon
 * schema, mais son journal de migrations est VIDE. `db:migrate` rejoue alors
 * tout depuis l'origine et echoue sur la premiere creation de type deja
 * existant — au moment d'un deploiement, donc au pire moment.
 *
 *   bun run scripts/check-migrations.ts                 # base du .env
 *   DATABASE_URL=... bun run scripts/check-migrations.ts
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL manquant');
  process.exit(2);
}

const dossier = join(import.meta.dir, '..', 'src', 'db', 'migrations');
const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.sql'));

const sql = postgres(url, { max: 1 });

try {
  const [{ exists }] = await sql<{ exists: boolean }[]>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
    ) as exists
  `;

  const appliquees = exists
    ? Number(
        (
          await sql<{ n: string }[]>`
            select count(*)::text as n from drizzle.__drizzle_migrations
          `
        )[0].n,
      )
    : 0;

  console.log(`migrations dans le depot : ${fichiers.length}`);
  console.log(`migrations journalisees  : ${appliquees}`);

  if (!exists || appliquees === 0) {
    console.error(
      "\nJOURNAL VIDE — cette base a ete creee par `db:push`.\n" +
        '`db:migrate` va rejouer depuis l origine et echouer.\n' +
        'Sur un poste de dev : continuer avec `db:push`.\n' +
        'Sur staging ou prod : rattraper le journal AVANT de deployer.',
    );
    process.exit(1);
  }

  if (appliquees < fichiers.length) {
    console.log(`\n${fichiers.length - appliquees} migration(s) a appliquer.`);
  } else {
    console.log('\nJournal a jour.');
  }
} finally {
  await sql.end();
}
