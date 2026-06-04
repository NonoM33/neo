import { describe, expect, it } from 'bun:test';
import { gestureFromDelta, paletteItems, roomAcceptsCategory, type PaletteProduct } from './drag-drop';

const prod = (id: string, category: string, priceTTC: number): PaletteProduct => ({
  id,
  name: id,
  priceTTC,
  category,
});

describe('roomAcceptsCategory', () => {
  it('accepte une catégorie présente dans la pièce', () => {
    expect(roomAcceptsCategory(['Audio', 'Éclairage'], 'Éclairage')).toBe(true);
  });
  it('refuse une catégorie absente', () => {
    expect(roomAcceptsCategory(['Sécurité'], 'Audio')).toBe(false);
  });
  it('refuse sur une liste vide', () => {
    expect(roomAcceptsCategory([], 'Audio')).toBe(false);
  });
});

describe('paletteItems', () => {
  it('limite le nombre de produits par catégorie et trie par prix croissant', () => {
    const byCat = {
      Audio: [prod('a3', 'Audio', 300), prod('a1', 'Audio', 100), prod('a2', 'Audio', 200)],
      Sécurité: [prod('s1', 'Sécurité', 50)],
    };
    const items = paletteItems(byCat, 2);
    expect(items.map((p) => p.id)).toEqual(['a1', 'a2', 's1']);
  });
  it('conserve l’ordre des catégories', () => {
    const byCat = {
      Éclairage: [prod('l1', 'Éclairage', 10)],
      Audio: [prod('a1', 'Audio', 10)],
    };
    expect(paletteItems(byCat, 5).map((p) => p.category)).toEqual(['Éclairage', 'Audio']);
  });
  it('renvoie une liste vide pour un catalogue vide', () => {
    expect(paletteItems({}, 3)).toEqual([]);
  });
  it('tolère perCategory <= 0', () => {
    expect(paletteItems({ Audio: [prod('a1', 'Audio', 10)] }, 0)).toEqual([]);
  });
});

describe('gestureFromDelta', () => {
  it('reste indécis sous le seuil', () => {
    expect(gestureFromDelta(3, 4, 8)).toBe('pending');
  });
  it('détecte un drag quand le vertical domine (vers la maison)', () => {
    expect(gestureFromDelta(2, 20, 8)).toBe('drag');
  });
  it('détecte un scroll quand l’horizontal domine', () => {
    expect(gestureFromDelta(20, 2, 8)).toBe('scroll');
  });
  it('tranche en drag à égalité (intention de poser)', () => {
    expect(gestureFromDelta(10, 10, 8)).toBe('drag');
  });
});
