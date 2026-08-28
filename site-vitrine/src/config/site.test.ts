import { describe, expect, it } from 'bun:test';
import { SITE_CONFIG } from './site';

// Le numéro de contact est écrit une seule fois ici : toutes les pages lisent
// SITE_CONFIG. Ce test fige la valeur attendue et vérifie que le lien tel:
// correspond bien au numéro affiché (un lien qui appelle un autre numéro que
// celui écrit à l'écran ne se voit pas en relisant le code).
describe('SITE_CONFIG contact', () => {
  it('affiche le numéro de contact courant', () => {
    expect(SITE_CONFIG.phone).toBe('07 78 57 18 19');
  });

  it('dérive le lien tel: du numéro affiché', () => {
    const digits = SITE_CONFIG.phone.replace(/\s/g, '');
    expect(digits).toMatch(/^0[1-9]\d{8}$/);
    expect(SITE_CONFIG.phoneHref).toBe(`tel:+33${digits.slice(1)}`);
  });
});
