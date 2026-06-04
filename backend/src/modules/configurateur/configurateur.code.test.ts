import { describe, expect, it } from 'bun:test';
import { generateDraftCode, buildResumeUrl, sanitizeOrigin } from './configurateur.code';

describe('generateDraftCode', () => {
  it('produit un code au format NEO-XXXX-XXXX', () => {
    const code = generateDraftCode(() => 0);
    expect(code).toMatch(/^NEO-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it('exclut les caractères ambigus (0,O,1,I,L) de la partie aléatoire', () => {
    // On balaie tout l'alphabet ; seul le suffixe aléatoire est contraint
    // (le préfixe « NEO » contient volontairement un O).
    let i = 0;
    const code = generateDraftCode(() => {
      const v = (i % 40) / 40;
      i += 1;
      return v;
    });
    const suffix = code.slice('NEO-'.length);
    expect(suffix).not.toMatch(/[O01IL]/);
  });

  it('génère des codes quasi-uniques sur un gros volume', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i += 1) codes.add(generateDraftCode());
    expect(codes.size).toBeGreaterThan(995);
  });
});

describe('sanitizeOrigin', () => {
  it('garde uniquement scheme + host pour une origine valide', () => {
    expect(sanitizeOrigin('http://localhost:4398/configurateur?x=1')).toBe('http://localhost:4398');
    expect(sanitizeOrigin('https://neo-domotique.fr')).toBe('https://neo-domotique.fr');
  });

  it('rejette les schemes non http(s) et les valeurs invalides', () => {
    expect(sanitizeOrigin('javascript:alert(1)')).toBeNull();
    expect(sanitizeOrigin('ftp://x.y')).toBeNull();
    expect(sanitizeOrigin('pas une url')).toBeNull();
    expect(sanitizeOrigin(undefined)).toBeNull();
  });
});

describe('buildResumeUrl', () => {
  it('construit une URL de reprise propre quel que soit le slash final', () => {
    expect(buildResumeUrl('https://neo-domotique.fr', 'NEO-AB12-CD34')).toBe(
      'https://neo-domotique.fr/configurateur?code=NEO-AB12-CD34',
    );
    expect(buildResumeUrl('https://neo-domotique.fr/', 'NEO-AB12-CD34')).toBe(
      'https://neo-domotique.fr/configurateur?code=NEO-AB12-CD34',
    );
  });
});
