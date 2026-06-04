import { describe, expect, it } from 'bun:test';
import {
  budgetStatus,
  cheaperAlternatives,
  type SuggestProduct,
} from './configurateur.suggest';

const CATALOG: SuggestProduct[] = [
  { id: 'cam-pro', name: 'Caméra Pro', category: 'camera', priceTTC: 240, brand: 'Neo' },
  { id: 'cam-mid', name: 'Caméra Confort', category: 'camera', priceTTC: 150, brand: 'Neo' },
  { id: 'cam-eco', name: 'Caméra Essentiel', category: 'camera', priceTTC: 90, brand: 'Aqara' },
  { id: 'bridge', name: 'Bridge Zigbee', category: 'bridge', priceTTC: 60, brand: 'Neo' },
  { id: 'capteur', name: 'Capteur porte', category: 'capteur', priceTTC: 30, brand: 'Aqara' },
];

describe('cheaperAlternatives', () => {
  it('renvoie les produits moins chers de la même catégorie, du moins cher au plus cher', () => {
    const alts = cheaperAlternatives(CATALOG, 'cam-pro');
    expect(alts.map((a) => a.id)).toEqual(['cam-eco', 'cam-mid']);
    expect(alts[0]?.savingTTC).toBe(150); // 240 - 90
    expect(alts[1]?.savingTTC).toBe(90); // 240 - 150
  });

  it('exclut le produit cible et les autres catégories', () => {
    const alts = cheaperAlternatives(CATALOG, 'cam-mid');
    expect(alts.map((a) => a.id)).toEqual(['cam-eco']);
  });

  it('respecte la limite et le plafond de prix', () => {
    expect(cheaperAlternatives(CATALOG, 'cam-pro', { limit: 1 }).map((a) => a.id)).toEqual([
      'cam-eco',
    ]);
    expect(
      cheaperAlternatives(CATALOG, 'cam-pro', { maxPriceTTC: 100 }).map((a) => a.id),
    ).toEqual(['cam-eco']);
  });

  it('renvoie [] si le produit est introuvable ou sans alternative moins chère', () => {
    expect(cheaperAlternatives(CATALOG, 'inconnu')).toEqual([]);
    expect(cheaperAlternatives(CATALOG, 'cam-eco')).toEqual([]);
  });
});

describe('budgetStatus', () => {
  it('considère tout dans le budget sans budget fourni', () => {
    expect(budgetStatus(500)).toEqual({ within: true, overBy: 0, remaining: 0 });
    expect(budgetStatus(500, 0)).toEqual({ within: true, overBy: 0, remaining: 0 });
  });

  it('calcule le dépassement', () => {
    expect(budgetStatus(620.5, 500)).toEqual({ within: false, overBy: 120.5, remaining: 0 });
  });

  it('calcule la marge restante', () => {
    expect(budgetStatus(380, 500)).toEqual({ within: true, overBy: 0, remaining: 120 });
  });

  it('traite le total égal au budget comme tenant dans le budget', () => {
    expect(budgetStatus(500, 500)).toEqual({ within: true, overBy: 0, remaining: 0 });
  });
});
