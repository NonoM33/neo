/**
 * Migrateur tolérant : applique les migrations Drizzle instruction par
 * instruction en ignorant les objets déjà présents.
 *
 * Pourquoi : les bases de prod et de dev ont été créées avec `drizzle-kit push`
 * avant l'arrivée des fichiers de migration. Le migrateur standard rejouait
 * alors `0000_…` (CREATE TYPE user_role…) → « already exists » → le conteneur
 * mourait au démarrage et Coolify gardait l'ancienne image en ligne
 * (constaté le 2026-09-02 : API prod figée sur du code d'avant juin).
 *
 * Fonctions pures ici (testables sans base) ; l'exécution est dans migrate.ts.
 */

/** Séparateur qu'écrit drizzle-kit entre deux instructions d'un fichier SQL. */
const BREAKPOINT = '--> statement-breakpoint';

/** Codes PostgreSQL signifiant « l'objet existe déjà » : sûrs à ignorer. */
const ALREADY_PRESENT_CODES = new Set([
  '42P07', // duplicate_table (aussi index, séquence)
  '42710', // duplicate_object (type, contrainte, extension…)
  '42701', // duplicate_column
  '42P06', // duplicate_schema
  '42723', // duplicate_function
  '42P16', // invalid_table_definition (clé primaire déjà définie)
  '23505', // unique_violation (données de migration déjà insérées)
]);

export interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

export interface AppliedMigration {
  hash: string;
  created_at: number | string;
}

/** Découpe un fichier de migration en instructions individuelles. */
export function splitStatements(sqlFile: string): string[] {
  return sqlFile
    .split(BREAKPOINT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Vrai si l'erreur signale un objet déjà en place (migration déjà appliquée à la main ou par push). */
export function isAlreadyPresentError(error: unknown): boolean {
  const code = extractPgCode(error);
  return code !== null && ALREADY_PRESENT_CODES.has(code);
}

/** Retrouve le code SQLSTATE, y compris quand Drizzle enveloppe l'erreur postgres. */
export function extractPgCode(error: unknown): string | null {
  let current: any = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current.code === 'string' && /^[0-9A-Z]{5}$/.test(current.code)) return current.code;
    current = current.cause;
  }
  return null;
}

/**
 * Migrations restant à appliquer, dans l'ordre du journal : celles dont le
 * `when` dépasse la dernière migration enregistrée (même règle que Drizzle,
 * donc compatible avec un futur retour au migrateur standard).
 */
export function pendingMigrations(journal: JournalEntry[], applied: AppliedMigration[]): JournalEntry[] {
  const last = applied.reduce((max, m) => Math.max(max, Number(m.created_at) || 0), 0);
  return [...journal].sort((a, b) => a.idx - b.idx).filter((entry) => entry.when > last);
}
