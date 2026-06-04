import { describe, expect, it } from 'bun:test';
import {
  computeConfiguratorEstimate,
  type CatalogProduct,
  type MissingDependency,
} from './configurateur.pricing';

function catalog(...products: CatalogProduct[]): Map<string, CatalogProduct> {
  return new Map(products.map((p) => [p.id, p]));
}

const AMPOULE: CatalogProduct = {
  id: 'ampoule',
  name: 'Ampoule connectée',
  priceHT: 30,
  tvaRate: 20,
};
const BRIDGE: CatalogProduct = {
  id: 'bridge',
  name: 'Bridge',
  priceHT: 60,
  tvaRate: 20,
};
const DETECTEUR: CatalogProduct = {
  id: 'detecteur',
  name: 'Détecteur de mouvement',
  priceHT: 50,
  tvaRate: 10,
};

describe('computeConfiguratorEstimate', () => {
  it('chiffre une sélection simple sans dépendance', () => {
    const estimate = computeConfiguratorEstimate(
      [{ productId: 'ampoule', quantity: 2 }],
      catalog(AMPOULE),
      [],
    );

    expect(estimate.lines).toHaveLength(1);
    expect(estimate.lines[0]).toMatchObject({
      productId: 'ampoule',
      quantity: 2,
      unitPriceHT: 30,
      totalHT: 60,
      auto: false,
    });
    expect(estimate.totalHT).toBe(60);
    expect(estimate.totalTVA).toBeCloseTo(12, 5);
    expect(estimate.totalTTC).toBeCloseTo(72, 5);
  });

  it('agrège la même référence choisie dans plusieurs pièces', () => {
    const estimate = computeConfiguratorEstimate(
      [
        { productId: 'ampoule', quantity: 2 },
        { productId: 'ampoule', quantity: 3 },
      ],
      catalog(AMPOULE),
      [],
    );

    expect(estimate.lines).toHaveLength(1);
    expect(estimate.lines[0]?.quantity).toBe(5);
    expect(estimate.totalHT).toBe(150);
  });

  it('ajoute une ligne auto pour une dépendance requise manquante', () => {
    const missing: MissingDependency[] = [
      {
        requiredProductId: 'bridge',
        missingQuantity: 1,
        requiredProduct: { id: 'bridge', name: 'Bridge', priceHT: '60', tvaRate: '20' },
      },
    ];

    const estimate = computeConfiguratorEstimate(
      [{ productId: 'ampoule', quantity: 2 }],
      catalog(AMPOULE, BRIDGE),
      missing,
    );

    expect(estimate.lines).toHaveLength(2);
    const auto = estimate.lines.find((l) => l.auto);
    expect(auto).toMatchObject({
      productId: 'bridge',
      quantity: 1,
      unitPriceHT: 60,
      totalHT: 60,
      auto: true,
    });
    expect(estimate.totalHT).toBe(120);
  });

  it('gère des taux de TVA distincts par ligne', () => {
    const estimate = computeConfiguratorEstimate(
      [
        { productId: 'ampoule', quantity: 1 },
        { productId: 'detecteur', quantity: 1 },
      ],
      catalog(AMPOULE, DETECTEUR),
      [],
    );

    expect(estimate.totalHT).toBe(80);
    expect(estimate.totalTVA).toBeCloseTo(30 * 0.2 + 50 * 0.1, 5); // 6 + 5 = 11
    expect(estimate.totalTTC).toBeCloseTo(91, 5);
  });

  it('ignore une sélection de produit inconnu du catalogue', () => {
    const estimate = computeConfiguratorEstimate(
      [{ productId: 'fantome', quantity: 4 }],
      catalog(AMPOULE),
      [],
    );

    expect(estimate.lines).toHaveLength(0);
    expect(estimate.totalHT).toBe(0);
    expect(estimate.totalTTC).toBe(0);
  });

  it('renvoie un devis vide pour une sélection vide', () => {
    const estimate = computeConfiguratorEstimate([], catalog(AMPOULE), []);
    expect(estimate.lines).toHaveLength(0);
    expect(estimate.totalHT).toBe(0);
  });
});
