import { describe, it, expect } from 'bun:test';
import { essentialPack } from './packs';

const CATALOG = {
  Éclairage: [
    { id: 'amp-1', priceTTC: 49 },
    { id: 'amp-2', priceTTC: 65 },
  ],
  Audio: [{ id: 'spk-1', priceTTC: 219 }],
  Volets: [{ id: 'vol-1', priceTTC: 189 }],
  Sécurité: [{ id: 'cam-1', priceTTC: 149 }],
  Services: [{ id: 'inst-1', priceTTC: 0 }],
  Réseau: [],
};

describe('essentialPack', () => {
  it('prend le premier produit de chaque catégorie favorite, limité à maxItems', () => {
    const pack = essentialPack(
      ['Éclairage', 'Audio', 'Volets', 'Sécurité'],
      CATALOG,
      {},
      3,
    );
    expect(pack).toEqual([
      { id: 'amp-1', qty: 1 },
      { id: 'spk-1', qty: 1 },
      { id: 'vol-1', qty: 1 },
    ]);
  });

  it('applique la quantité par défaut par catégorie', () => {
    const pack = essentialPack(
      ['Éclairage', 'Audio'],
      CATALOG,
      { Éclairage: 4, Audio: 2 },
    );
    expect(pack).toEqual([
      { id: 'amp-1', qty: 4 },
      { id: 'spk-1', qty: 2 },
    ]);
  });

  it('retombe sur une quantité de 1 quand la catégorie est absente du barème', () => {
    const pack = essentialPack(['Volets'], CATALOG, { Éclairage: 4 });
    expect(pack).toEqual([{ id: 'vol-1', qty: 1 }]);
  });

  it('ignore les catégories sans produit', () => {
    const pack = essentialPack(['Réseau', 'Audio'], CATALOG);
    expect(pack).toEqual([{ id: 'spk-1', qty: 1 }]);
  });

  it('ignore les produits non facturables (services sur devis, prix 0)', () => {
    const pack = essentialPack(['Services', 'Sécurité'], CATALOG);
    expect(pack).toEqual([{ id: 'cam-1', qty: 1 }]);
  });

  it('ignore une catégorie dont la quantité par défaut est nulle ou négative', () => {
    const pack = essentialPack(['Éclairage', 'Audio'], CATALOG, { Éclairage: 0 });
    expect(pack).toEqual([{ id: 'spk-1', qty: 1 }]);
  });

  it('renvoie un pack vide quand aucune catégorie favorite n’est exploitable', () => {
    expect(essentialPack([], CATALOG)).toEqual([]);
    expect(essentialPack(['Réseau'], CATALOG)).toEqual([]);
  });
});
