import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// La page d'accueil n'utilise pas BaseLayout : elle doit donc embarquer
// elle-même les widgets servis par le backend. Régression : la bulle de chat
// avait disparu de la home car ce script manquait ici.
// NB : ce test vit hors de src/pages/ car Astro route tout fichier de src/pages.
const source = readFileSync(
  join(import.meta.dir, '../src/pages/index.astro'),
  'utf8'
);

describe('index.astro — widgets injectés', () => {
  it('charge le widget chatbot depuis apiBaseUrl', () => {
    expect(source).toContain('/chatbot-widget.js');
    expect(source).toContain('data-api={SITE_CONFIG.apiBaseUrl}');
  });

  it('charge aussi le widget de feedback', () => {
    expect(source).toContain('/feedback-widget.js');
  });
});
