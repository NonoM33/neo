import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';

// Piège payé le 2026-08-31 : la fiche client renvoyait vers `/activites/new`
// alors que le router déclare `activities/new` (le CRM mélange chemins
// français et anglais). Aucune erreur nulle part — juste un bouton qui mène
// à une page blanche. TypeScript ne peut rien voir : c'est une chaîne.
//
// Ce test relit les destinations réellement écrites dans les pages et exige
// qu'un chemin déclaré du router les accepte.

const ROUTER = readFileSync(new URL('../router.tsx', import.meta.url), 'utf8');

const PAGES = [
  'clients/ClientDetailPage.tsx',
  'devis/DevisFormPage.tsx',
  'projects/ProjectFormPage.tsx',
];

/** Chemins déclarés dans le router, sous forme de segments. */
function declaredRoutes(): string[][] {
  return [...ROUTER.matchAll(/path: '([^']+)'/g)]
    .map((m) => m[1]!)
    .filter((p) => p && p !== '*' && !p.startsWith('/'))
    .map((p) => p.split('/'));
}

/** Destinations passées à navigate(...) dans une page, nettoyées. */
function navigatedPaths(source: string): string[] {
  return [...source.matchAll(/navigate\(\s*[`'"]([^`'"]+)[`'"]/g)]
    .map((m) => m[1]!)
    .filter((p) => p.startsWith('/'))
    .map((p) => p.split('?')[0]!.replace(/^\//, '').replace(/\/$/, ''))
    .filter(Boolean);
}

/** Un segment `${...}` ou `:x` matche n'importe quelle valeur. */
function matches(target: string[], route: string[]): boolean {
  if (target.length !== route.length) return false;
  return target.every((segment, i) => {
    const routeSegment = route[i]!;
    if (routeSegment.startsWith(':')) return true;
    if (segment.includes('${')) return true;
    return segment === routeSegment;
  });
}

const routes = declaredRoutes();

test('le router déclare bien les sections concernées', () => {
  const flat = routes.map((r) => r.join('/'));
  expect(flat).toContain('clients/:id');
  expect(flat).toContain('devis/new');
  expect(flat).toContain('activities/new');
  expect(flat).toContain('projets/new');
});

for (const page of PAGES) {
  test(`toutes les destinations de ${page} existent dans le router`, () => {
    const source = readFileSync(new URL(`./${page}`, import.meta.url), 'utf8');
    const targets = navigatedPaths(source);
    expect(targets.length).toBeGreaterThan(0);

    const orphans = targets.filter(
      (target) => !routes.some((route) => matches(target.split('/'), route))
    );
    expect(orphans).toEqual([]);
  });
}
