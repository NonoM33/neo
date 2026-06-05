import { describe, it, expect } from 'bun:test';
import { roomLines, roomSubtotal } from './room-summary';

const PRODUCTS = {
  'spk-1': { id: 'spk-1', name: 'Sonos Arc', priceTTC: 1078.8, brand: 'Sonos', category: 'Audio' },
  'spk-2': { id: 'spk-2', name: 'Sonos One', priceTTC: 214.8, brand: 'Sonos', category: 'Audio' },
  'lamp-1': { id: 'lamp-1', name: 'Hue E27', priceTTC: 49.9, brand: 'Philips', category: 'Éclairage' },
};

describe('roomLines', () => {
  it('construit une ligne par produit sélectionné avec total ligne = prix × quantité', () => {
    const lines = roomLines({ 'spk-1': 2, 'lamp-1': 3 }, PRODUCTS);
    expect(lines).toEqual([
      { id: 'spk-1', name: 'Sonos Arc', brand: 'Sonos', category: 'Audio', qty: 2, unitTTC: 1078.8, lineTTC: 2157.6 },
      { id: 'lamp-1', name: 'Hue E27', brand: 'Philips', category: 'Éclairage', qty: 3, unitTTC: 49.9, lineTTC: 149.7 },
    ]);
  });

  it('ignore les quantités nulles ou négatives', () => {
    const lines = roomLines({ 'spk-1': 0, 'spk-2': -1, 'lamp-1': 1 }, PRODUCTS);
    expect(lines.map((l) => l.id)).toEqual(['lamp-1']);
  });

  it('ignore un produit absent du catalogue (id inconnu)', () => {
    const lines = roomLines({ 'spk-1': 1, 'ghost-x': 2 }, PRODUCTS);
    expect(lines.map((l) => l.id)).toEqual(['spk-1']);
  });

  it('trie par catégorie puis par nom pour un affichage lisible', () => {
    const lines = roomLines({ 'spk-2': 1, 'lamp-1': 1, 'spk-1': 1 }, PRODUCTS);
    // Audio (Sonos Arc avant Sonos One), puis Éclairage
    expect(lines.map((l) => l.id)).toEqual(['spk-1', 'spk-2', 'lamp-1']);
  });

  it('retombe sur une marque/catégorie vide si le produit n’en a pas', () => {
    const lines = roomLines({ x: 1 }, { x: { id: 'x', name: 'X', priceTTC: 10 } });
    expect(lines[0].brand).toBe('');
    expect(lines[0].category).toBe('');
  });

  it('renvoie une liste vide quand rien n’est sélectionné', () => {
    expect(roomLines({}, PRODUCTS)).toEqual([]);
  });
});

describe('roomSubtotal', () => {
  it('additionne les totaux de ligne', () => {
    const lines = roomLines({ 'spk-1': 2, 'lamp-1': 3 }, PRODUCTS);
    expect(roomSubtotal(lines)).toBeCloseTo(2307.3, 2);
  });

  it('vaut 0 pour une liste vide', () => {
    expect(roomSubtotal([])).toBe(0);
  });
});
