import { describe, expect, it } from 'bun:test';
import { filterProducts, type SearchableProduct } from './search';

const catalog: SearchableProduct[] = [
  { id: 'cam-pro', name: 'Caméra Pro 2K', brand: 'Neo', category: 'Sécurité' },
  { id: 'cam-eco', name: 'Caméra Eco', brand: 'Neo', category: 'Sécurité' },
  { id: 'hue-e27', name: 'Ampoule E27 blanche', brand: 'Philips Hue', category: 'Éclairage' },
  { id: 'trv', name: 'Tête thermostatique', brand: 'Tado', category: 'Chauffage' },
];

describe('filterProducts', () => {
  it('renvoie tout le catalogue quand la requête est vide', () => {
    expect(filterProducts(catalog, '')).toHaveLength(4);
    expect(filterProducts(catalog, '   ')).toHaveLength(4);
  });

  it('trouve par nom en ignorant les accents (« camera » → « Caméra »)', () => {
    const out = filterProducts(catalog, 'camera');
    expect(out.map((p) => p.id)).toEqual(['cam-pro', 'cam-eco']);
  });

  it('trouve par marque', () => {
    expect(filterProducts(catalog, 'philips').map((p) => p.id)).toEqual(['hue-e27']);
  });

  it('trouve par catégorie', () => {
    expect(filterProducts(catalog, 'chauffage').map((p) => p.id)).toEqual(['trv']);
  });

  it('combine les mots en ET (tous doivent matcher)', () => {
    // « camera pro » ne doit garder que la Pro, pas l'Eco.
    expect(filterProducts(catalog, 'camera pro').map((p) => p.id)).toEqual(['cam-pro']);
  });

  it('renvoie une liste vide quand rien ne correspond', () => {
    expect(filterProducts(catalog, 'inexistant')).toEqual([]);
  });

  it('gère une marque absente sans planter', () => {
    const sansMarque: SearchableProduct[] = [{ id: 'x', name: 'Boîtier', category: 'Réseau' }];
    expect(filterProducts(sansMarque, 'boitier').map((p) => p.id)).toEqual(['x']);
  });
});
