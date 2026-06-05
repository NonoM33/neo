import { describe, expect, it } from 'bun:test';
import { computeMissingRequiredQuantity } from './products.service';

describe('computeMissingRequiredQuantity', () => {
  it('ne réclame QU’UN seul bridge pour plusieurs ampoules (régression)', () => {
    // Symptôme remonté : 3 ampoules Hue → 3 bridges ajoutés alors qu'un seul
    // bridge couvre jusqu'à 50 ampoules.
    const deps = [{ productId: 'hue-e27', coveredQuantity: 50 }];
    const qty = new Map([['hue-e27', 3]]);
    expect(computeMissingRequiredQuantity(deps, qty, 0)).toBe(1);
  });

  it('somme la demande de plusieurs modèles partageant le même bridge', () => {
    // 30 + 30 ampoules de modèles différents, 1 bridge couvre 50 → 60/50 = 2.
    // L'ancien Math.max donnait 1 (sous-comptage) : ce test verrouille la
    // logique de sommation.
    const deps = [
      { productId: 'hue-e27', coveredQuantity: 50 },
      { productId: 'hue-gu10', coveredQuantity: 50 },
    ];
    const qty = new Map([
      ['hue-e27', 30],
      ['hue-gu10', 30],
    ]);
    expect(computeMissingRequiredQuantity(deps, qty, 0)).toBe(2);
  });

  it('ne réclame rien si le bridge est déjà dans la sélection', () => {
    const deps = [{ productId: 'hue-e27', coveredQuantity: 50 }];
    const qty = new Map([
      ['hue-e27', 4],
      ['hue-bridge', 1],
    ]);
    expect(computeMissingRequiredQuantity(deps, qty, 1)).toBe(0);
  });

  it('retombe sur une couverture 1:1 quand coveredQuantity est invalide', () => {
    const deps = [{ productId: 'ajax-door', coveredQuantity: 0 }];
    const qty = new Map([['ajax-door', 2]]);
    expect(computeMissingRequiredQuantity(deps, qty, 0)).toBe(2);
  });

  it('ignore les dépendants absents de la sélection', () => {
    const deps = [{ productId: 'hue-e27', coveredQuantity: 50 }];
    const qty = new Map<string, number>();
    expect(computeMissingRequiredQuantity(deps, qty, 0)).toBe(0);
  });
});
