import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// La page d'accueil n'utilise pas BaseLayout : elle doit donc embarquer
// elle-même les widgets servis par le backend. Régression : la bulle de chat
// avait disparu de la home car ce script manquait ici.
// NB : ce test vit hors de src/pages/ car Astro route tout fichier de src/pages.
const readPage = (name: string) =>
  readFileSync(join(import.meta.dir, `../src/pages/${name}`), 'utf8');

const source = readPage('index.astro');

describe('index.astro — widgets injectés', () => {
  it('charge le widget chatbot depuis apiBaseUrl', () => {
    expect(source).toContain('/chatbot-widget.js');
    expect(source).toContain('data-api={SITE_CONFIG.apiBaseUrl}');
  });

  it('charge aussi le widget de feedback', () => {
    expect(source).toContain('/feedback-widget.js');
  });
});

// Même piège que les widgets : les pages autonomes (sans BaseLayout) doivent
// embarquer elles-mêmes la bannière et la pop-up marketing, sinon elles ne
// s'affichent pas. Régression : bannière/pop-up absentes de la home et de la
// page devis car seules les pages BaseLayout les recevaient.
describe('pages autonomes — composants marketing embarqués', () => {
  for (const page of ['index.astro', 'devis.astro']) {
    const src = readPage(page);
    it(`${page} affiche la bannière marketing`, () => {
      expect(src).toContain("import MarketingBanner from '../components/layout/MarketingBanner.astro'");
      expect(src).toContain('<MarketingBanner />');
    });
    it(`${page} affiche la pop-up marketing`, () => {
      expect(src).toContain("import MarketingPopup from '../components/layout/MarketingPopup.astro'");
      expect(src).toContain('<MarketingPopup />');
    });
  }
});
